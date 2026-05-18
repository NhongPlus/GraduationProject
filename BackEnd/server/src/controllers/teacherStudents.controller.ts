import { Request, Response, NextFunction } from "express";
import pool from "~/config/db";
import bcrypt from "bcrypt";
import { getAdminClassByManager } from "~/models/adminClass.model";
import { parsePaginationQuery, buildPaginatedList } from "~/utils/pagination";
import { sendEmail, isEmailConfigured } from "~/services/email.service";

interface StudentRow {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

async function getTeacherAdminClassId(userId: string): Promise<string | null> {
  const ac = await getAdminClassByManager(userId);
  return ac?.id ?? null;
}

export const listStudentsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const adminClassId = await getTeacherAdminClassId(user.userId);
    if (!adminClassId) {
      return res.status(403).json({ success: false, message: "Chưa được gán lớp quản lý" });
    }

    const { limit, offset } = parsePaginationQuery(req.query as Record<string, unknown>);
    const search = (req.query.search as string)?.trim();

    let where = `WHERE a.admin_class_id = $1 AND a.role = 'student'`;
    const params: unknown[] = [adminClassId];
    let idx = 2;
    if (search) {
      where += ` AND (a.full_name ILIKE $${idx} OR a.email ILIKE $${idx} OR a.username ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    const countR = await pool.query(`SELECT COUNT(*)::int AS total FROM accounts a ${where}`, params);
    const total = countR.rows[0]?.total ?? 0;

    const dataR = await pool.query<StudentRow>(
      `SELECT a.id, a.email, a.username, a.full_name, a.is_active, a.created_at::text
       FROM accounts a ${where}
       ORDER BY a.full_name NULLS LAST, a.email
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    res.json({ success: true, data: buildPaginatedList(dataR.rows, total, limit, offset) });
  } catch (err) { next(err); }
};

export const addStudentController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const adminClassId = await getTeacherAdminClassId(user.userId);
    if (!adminClassId) {
      return res.status(403).json({ success: false, message: "Chưa được gán lớp quản lý" });
    }

    const { full_name, username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: "username, email, password là bắt buộc" });
    }

    const dup = await pool.query(
      `SELECT id FROM accounts WHERE email = $1 OR username = $2 LIMIT 1`,
      [email, username]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ success: false, message: "Email hoặc username đã tồn tại" });
    }

    const hashed = await bcrypt.hash(password, 12);
    const r = await pool.query<StudentRow>(
      `INSERT INTO accounts (email, username, hashed_password, role, full_name, admin_class_id)
       VALUES ($1, $2, $3, 'student', $4, $5)
       RETURNING id, email, username, full_name, is_active, created_at::text`,
      [email, username, hashed, full_name ?? null, adminClassId]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
};

export const updateStudentController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const adminClassId = await getTeacherAdminClassId(user.userId);
    if (!adminClassId) {
      return res.status(403).json({ success: false, message: "Chưa được gán lớp quản lý" });
    }

    const { id } = req.params;
    const existing = await pool.query(
      `SELECT id FROM accounts WHERE id = $1 AND admin_class_id = $2 AND role = 'student'`,
      [id, adminClassId]
    );
    if (!existing.rows[0]) {
      return res.status(404).json({ success: false, message: "Sinh viên không tồn tại trong lớp" });
    }

    const { full_name, is_active } = req.body;
    const sets: string[] = [];
    const vals: unknown[] = [id];
    let i = 2;
    if (full_name !== undefined) { sets.push(`full_name = $${i++}`); vals.push(full_name); }
    if (is_active !== undefined) { sets.push(`is_active = $${i++}`); vals.push(is_active); }
    if (sets.length === 0) {
      return res.status(400).json({ success: false, message: "Không có gì để cập nhật" });
    }

    const r = await pool.query<StudentRow>(
      `UPDATE accounts SET ${sets.join(", ")}, updated_at = NOW()
       WHERE id = $1 RETURNING id, email, username, full_name, is_active, created_at::text`,
      vals
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
};

export const deleteStudentController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const adminClassId = await getTeacherAdminClassId(user.userId);
    if (!adminClassId) {
      return res.status(403).json({ success: false, message: "Chưa được gán lớp quản lý" });
    }

    const { id } = req.params;
    const r = await pool.query(
      `DELETE FROM accounts WHERE id = $1 AND admin_class_id = $2 AND role = 'student'`,
      [id, adminClassId]
    );
    if ((r.rowCount ?? 0) === 0) {
      return res.status(404).json({ success: false, message: "Sinh viên không tồn tại trong lớp" });
    }
    res.json({ success: true, message: "Đã xóa sinh viên" });
  } catch (err) { next(err); }
};

interface GradeRow {
  student_id: string;
  full_name: string | null;
  username: string;
  email: string;
  exam_id: string | null;
  exam_title: string | null;
  session_id: string | null;
  version_code: string | null;
  score: number | null;
  max_points: number | null;
  submitted_at: string | null;
  status: string | null;
  grading_status: string | null;
}

interface GradedDetailParsed {
  question_id: string;
  question_type: string;
  is_correct: boolean;
  points_earned: number | null;
  max_points: number;
  pending_grading?: boolean;
}

function parseGradedDetails(raw: unknown): GradedDetailParsed[] {
  if (raw == null) return [];
  let arr: unknown = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return Array.isArray(arr) ? (arr as GradedDetailParsed[]) : [];
}

function csvEscape(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

async function getClassName(adminClassId: string): Promise<string> {
  const classR = await pool.query(
    `SELECT display_name FROM admin_classes WHERE id = $1`,
    [adminClassId]
  );
  return classR.rows[0]?.display_name ?? "";
}

/** Danh sách bài thi của lớp (để chọn khi xem bảng điểm). */
export const getGradeReportExamsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    const adminClassId = await getTeacherAdminClassId(user.userId);
    if (!adminClassId) {
      return res.status(403).json({ success: false, message: "Chưa được gán lớp quản lý" });
    }

    const r = await pool.query<{
      id: string;
      title: string;
      submitted_count: number;
    }>(
      `
      SELECT
        e.id,
        e.title,
        COUNT(es.id) FILTER (WHERE es.status = 'submitted')::int AS submitted_count
      FROM exams e
      LEFT JOIN exam_sessions es ON es.exam_id = e.id
      WHERE e.admin_class_id = $1
      GROUP BY e.id, e.title
      ORDER BY e.title
      `,
      [adminClassId]
    );

    res.json({
      success: true,
      data: {
        class_name: await getClassName(adminClassId),
        exams: r.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

/** Bảng điểm: có exam_id → 1 dòng/SV; không có → chỉ phiên đã nộp. */
export const getGradeReportController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const adminClassId = await getTeacherAdminClassId(user.userId);
    if (!adminClassId) {
      return res.status(403).json({ success: false, message: "Chưa được gán lớp quản lý" });
    }

    const examId = (req.query.exam_id as string | undefined)?.trim();

    let rows: GradeRow[];
    if (examId) {
      const examCheck = await pool.query(
        `SELECT id, title FROM exams WHERE id = $1 AND admin_class_id = $2`,
        [examId, adminClassId]
      );
      if (!examCheck.rows[0]) {
        return res.status(404).json({ success: false, message: "Không tìm thấy bài thi" });
      }

      const r = await pool.query<GradeRow>(
        `
        SELECT
          a.id AS student_id,
          a.full_name,
          a.username,
          a.email,
          e.id AS exam_id,
          e.title AS exam_title,
          es.id::text AS session_id,
          es.version_code,
          es.score,
          es.max_points,
          es.submitted_at::text,
          es.status,
          es.grading_status
        FROM accounts a
        LEFT JOIN exam_sessions es
          ON es.student_id = a.id AND es.exam_id = $2 AND es.status = 'submitted'
        LEFT JOIN exams e ON e.id = $2
        WHERE a.admin_class_id = $1 AND a.role = 'student'
        ORDER BY a.full_name NULLS LAST, a.username
        `,
        [adminClassId, examId]
      );
      rows = r.rows;
    } else {
      const r = await pool.query<GradeRow>(
        `
        SELECT
          a.id AS student_id,
          a.full_name,
          a.username,
          a.email,
          e.id AS exam_id,
          e.title AS exam_title,
          es.id::text AS session_id,
          es.version_code,
          es.score,
          es.max_points,
          es.submitted_at::text,
          es.status,
          es.grading_status
        FROM exam_sessions es
        JOIN accounts a ON a.id = es.student_id
        JOIN exams e ON e.id = es.exam_id
        WHERE a.admin_class_id = $1
          AND a.role = 'student'
          AND es.status = 'submitted'
          AND e.admin_class_id = $1
        ORDER BY e.title, a.full_name NULLS LAST, a.username
        `,
        [adminClassId]
      );
      rows = r.rows;
    }

    res.json({
      success: true,
      data: {
        class_name: await getClassName(adminClassId),
        exam_id: examId ?? null,
        rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

/** Xuất CSV chi tiết: STT, Họ tên, Mã SV, từng câu (Đ/S + Điểm). */
export const exportGradeReportController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    const adminClassId = await getTeacherAdminClassId(user.userId);
    if (!adminClassId) {
      return res.status(403).json({ success: false, message: "Chưa được gán lớp quản lý" });
    }

    const examId = (req.query.exam_id as string | undefined)?.trim();
    if (!examId) {
      return res.status(400).json({ success: false, message: "exam_id là bắt buộc" });
    }

    const examR = await pool.query<{ title: string }>(
      `SELECT title FROM exams WHERE id = $1 AND admin_class_id = $2`,
      [examId, adminClassId]
    );
    if (!examR.rows[0]) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bài thi" });
    }
    const examTitle = examR.rows[0].title;
    const className = await getClassName(adminClassId);

    const studentsR = await pool.query<{
      id: string;
      username: string;
      full_name: string | null;
    }>(
      `SELECT id, username, full_name FROM accounts
       WHERE admin_class_id = $1 AND role = 'student'
       ORDER BY full_name NULLS LAST, username`,
      [adminClassId]
    );

    const sessionsR = await pool.query<{
      student_id: string;
      session_id: string;
      version_code: string | null;
      score: number | null;
      max_points: number | null;
      graded_details: unknown;
    }>(
      `SELECT student_id, id::text AS session_id, version_code, score, max_points, graded_details
       FROM exam_sessions
       WHERE exam_id = $1 AND status = 'submitted'`,
      [examId]
    );

    const sessionByStudent = new Map(sessionsR.rows.map((s) => [s.student_id, s]));

    const questionsR = await pool.query<{
      id: string;
      display_order: number;
      version_index: number;
    }>(
      `SELECT id, display_order, version_index FROM questions
       WHERE exam_id = $1 ORDER BY version_index, display_order`,
      [examId]
    );

    const questionsByVersion = new Map<number, { id: string; order: number }[]>();
    for (const q of questionsR.rows) {
      const v = q.version_index ?? 0;
      if (!questionsByVersion.has(v)) questionsByVersion.set(v, []);
      questionsByVersion.get(v)!.push({ id: q.id, order: q.display_order });
    }

    let maxQ = 0;
    for (const list of questionsByVersion.values()) {
      maxQ = Math.max(maxQ, list.length);
    }
    if (maxQ === 0) maxQ = 50;

    const header1 = ["STT", "Họ tên", "Mã SV", "Mã đề", "Tổng điểm", "Thang", "%"];
    for (let i = 1; i <= maxQ; i++) {
      header1.push(String(i), "");
    }

    const header2 = ["", "", "", "", "", "", ""];
    for (let i = 1; i <= maxQ; i++) {
      header2.push("Đ/S", "Điểm");
    }

    const dataRows: string[][] = [];
    let stt = 0;
    for (const stu of studentsR.rows) {
      stt += 1;
      const sess = sessionByStudent.get(stu.id);
      const row: string[] = [
        String(stt),
        stu.full_name ?? "",
        stu.username,
        sess?.version_code ?? "",
        sess?.score != null ? String(sess.score) : "",
        sess?.max_points != null ? String(sess.max_points) : "",
        sess?.score != null && sess?.max_points && sess.max_points > 0
          ? ((sess.score / sess.max_points) * 100).toFixed(1)
          : "",
      ];

      const details = parseGradedDetails(sess?.graded_details);
      const detailMap = new Map(details.map((d) => [d.question_id, d]));

      let qList = questionsByVersion.get(0) ?? [];
      if (sess?.version_code) {
        const vMatch = /^D(\d+)$/i.exec(sess.version_code);
        if (vMatch) {
          const vIdx = Number(vMatch[1]) - 1;
          qList = questionsByVersion.get(vIdx) ?? qList;
        }
      }

      for (let i = 0; i < maxQ; i++) {
        const q = qList[i];
        if (!q || !sess) {
          row.push("", "");
          continue;
        }
        const d = detailMap.get(q.id);
        if (!d) {
          row.push("", "");
          continue;
        }
        if (d.question_type === "essay" || d.pending_grading) {
          row.push("TL", d.points_earned != null ? String(d.points_earned) : "");
        } else {
          row.push(d.is_correct ? "Đ" : "S", d.points_earned != null ? String(d.points_earned) : "0");
        }
      }
      dataRows.push(row);
    }

    const titleRow = [
      `BẢNG ĐIỂM CHI TIẾT — ${examTitle} — ${className}`,
      ...Array(header1.length - 1).fill(""),
    ];
    const lines = [
      titleRow.map(csvEscape).join(","),
      header1.map(csvEscape).join(","),
      header2.map(csvEscape).join(","),
      ...dataRows.map((r) => r.map(csvEscape).join(",")),
    ];
    const csv = "\uFEFF" + lines.join("\n");

    const safeName = examTitle.replace(/[^\w\u00C0-\u024F\s-]/g, "").slice(0, 40);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="bang_diem_chi_tiet_${safeName}.csv"`
    );
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

export const sendGradeReportEmailController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!isEmailConfigured()) {
      return res.status(503).json({ success: false, message: "SMTP chưa cấu hình" });
    }

    const user = (req as any).user;
    const adminClassId = await getTeacherAdminClassId(user.userId);
    if (!adminClassId) {
      return res.status(403).json({ success: false, message: "Chưa được gán lớp quản lý" });
    }

    const { student_ids } = req.body as { student_ids?: string[] };

    let studentFilter = `a.admin_class_id = $1 AND a.role = 'student'`;
    const params: unknown[] = [adminClassId];
    if (student_ids?.length) {
      studentFilter += ` AND a.id = ANY($2::uuid[])`;
      params.push(student_ids);
    }

    const stuR = await pool.query<{
      id: string;
      email: string;
      full_name: string | null;
    }>(
      `SELECT a.id, a.email, a.full_name FROM accounts a WHERE ${studentFilter}`,
      params
    );

    const classR = await pool.query(
      `SELECT display_name FROM admin_classes WHERE id = $1`,
      [adminClassId]
    );
    const className = classR.rows[0]?.display_name ?? "";

    let sentCount = 0;
    for (const stu of stuR.rows) {
      const gradesR = await pool.query<{
        exam_title: string;
        score: number | null;
        max_points: number | null;
        submitted_at: string | null;
      }>(
        `SELECT e.title AS exam_title, es.score, es.max_points, es.submitted_at::text
         FROM exam_sessions es
         JOIN exams e ON e.id = es.exam_id
         WHERE es.student_id = $1 AND es.status = 'submitted'
         ORDER BY es.submitted_at DESC`,
        [stu.id]
      );

      if (gradesR.rows.length === 0) continue;

      const tableRows = gradesR.rows
        .map((g) => {
          const pct = g.max_points && g.max_points > 0
            ? `${((g.score ?? 0) / g.max_points * 100).toFixed(1)}%`
            : "—";
          return `<tr><td>${g.exam_title}</td><td>${g.score ?? "—"} / ${g.max_points ?? "—"}</td><td>${pct}</td><td>${g.submitted_at ? new Date(g.submitted_at).toLocaleDateString("vi-VN") : "—"}</td></tr>`;
        })
        .join("");

      const html = `
<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"/>
<style>
body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px}
.c{background:#fff;border-radius:8px;padding:30px;max-width:700px;margin:auto}
table{width:100%;border-collapse:collapse;margin-top:16px}
th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:14px}
th{background:#2563eb;color:#fff}
.footer{margin-top:24px;font-size:12px;color:#888}
</style></head><body><div class="c">
<h2>Bảng điểm — ${className}</h2>
<p>Xin chào <b>${stu.full_name ?? stu.email}</b>,</p>
<p>Dưới đây là bảng điểm các bài thi đã nộp của bạn:</p>
<table><thead><tr><th>Bài thi</th><th>Điểm</th><th>%</th><th>Ngày nộp</th></tr></thead>
<tbody>${tableRows}</tbody></table>
<p class="footer">Email được gửi tự động từ hệ thống thi trực tuyến.</p>
</div></body></html>`;

      await sendEmail(stu.email, `[Bảng điểm] ${className}`, html);
      sentCount++;
    }

    res.json({ success: true, data: { sent: sentCount, total: stuR.rows.length } });
  } catch (err) { next(err); }
};
