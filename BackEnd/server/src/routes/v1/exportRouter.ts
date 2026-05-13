import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import pool from "~/config/db";

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware(["admin", "teacher"]));

interface ExamResultRow {
  session_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  exam_title: string;
  class_name: string;
  score: number | null;
  max_points: number | null;
  percentage: number | null;
  status: string;
  submitted_at: string | null;
  graded_at: string | null;
  grading_status: string | null;
  teacher_comment: string | null;
}

function toCSV(rows: ExamResultRow[]): string {
  const headers = [
    "Session ID", "Student ID", "Student Name", "Email",
    "Exam Title", "Class", "Score", "Max Points", "Percentage (%)",
    "Status", "Submitted At", "Graded At", "Grading Status", "Teacher Comment",
  ];
  const headerLine = headers.join(",");

  const dataLines = rows.map(row => {
    const escape = (v: unknown) => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    return [
      escape(row.session_id),
      escape(row.student_id),
      escape(row.student_name),
      escape(row.student_email),
      escape(row.exam_title),
      escape(row.class_name),
      escape(row.score ?? ""),
      escape(row.max_points ?? ""),
      escape(row.percentage != null ? row.percentage.toFixed(1) : ""),
      escape(row.status),
      escape(row.submitted_at ? new Date(row.submitted_at).toLocaleString() : ""),
      escape(row.graded_at ? new Date(row.graded_at).toLocaleString() : ""),
      escape(row.grading_status ?? ""),
      escape(row.teacher_comment ?? ""),
    ].join(",");
  });

  return [headerLine, ...dataLines].join("\n");
}

function toASCII(s: string): string {
  // Strip accents/diacritics for plain ASCII fallback
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x00-\x7F]/g, " ");
}

// GET /v1/exports/exam-results?examId=&classId=&format=csv
router.get("/exam-results", async (req, res, next) => {
  try {
    const { exam_id, class_id, format = "csv" } = req.query;
    const params: unknown[] = [];
    let idx = 1;
    const conditions: string[] = [];

    if (exam_id) {
      conditions.push(`es.exam_id = $${idx++}`);
      params.push(exam_id);
    }
    if (class_id) {
      conditions.push(`e.class_id = $${idx++}`);
      params.push(class_id);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT
         es.id AS session_id,
         es.student_id,
         a.full_name AS student_name,
         a.email AS student_email,
         e.title AS exam_title,
         c.name AS class_name,
         es.score,
         es.max_points,
         CASE WHEN es.max_points > 0 AND es.score IS NOT NULL
              THEN (es.score / es.max_points * 100)
              ELSE NULL
         END AS percentage,
         es.status,
         es.submitted_at,
         es.graded_details->>'graded_at' AS graded_at,
         es.grading_status,
         es.graded_details->>'teacher_comment' AS teacher_comment
       FROM exam_sessions es
       JOIN exams e ON e.id = es.exam_id
       JOIN classes c ON c.id = e.class_id
       JOIN accounts a ON a.id = es.student_id
       ${where}
       ORDER BY e.title, a.full_name`,
      params
    );

    const rows: ExamResultRow[] = result.rows;

    if (format === "csv") {
      const csv = toCSV(rows);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="exam-results-${Date.now()}.csv"`);
      res.send("﻿" + csv); // BOM for Excel UTF-8
      return;
    }

    // JSON format (for future xlsx support)
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    next(err);
  }
});

// GET /v1/exports/exam-results/:examId/summary — summary stats only
router.get("/exam-results/:examId/summary", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'submitted') AS total_submitted,
         COUNT(*) FILTER (WHERE status = 'active') AS total_active,
         COUNT(*) AS total_sessions,
         AVG(CASE WHEN max_points > 0 AND score IS NOT NULL
                  THEN score / max_points * 100 END) AS avg_percentage,
         MIN(CASE WHEN max_points > 0 AND score IS NOT NULL
                  THEN score / max_points * 100 END) AS min_percentage,
         MAX(CASE WHEN max_points > 0 AND score IS NOT NULL
                  THEN score / max_points * 100 END) AS max_percentage,
         AVG(score) AS avg_score,
         COUNT(*) FILTER (WHERE grading_status = 'pending_manual') AS pending_grading
       FROM exam_sessions
       WHERE exam_id = $1`,
      [req.params.examId]
    );

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        total_sessions: Number(row.total_sessions),
        total_submitted: Number(row.total_submitted),
        total_active: Number(row.total_active),
        avg_percentage: row.avg_percentage ? Number(row.avg_percentage) : null,
        min_percentage: row.min_percentage ? Number(row.min_percentage) : null,
        max_percentage: row.max_percentage ? Number(row.max_percentage) : null,
        avg_score: row.avg_score ? Number(row.avg_score) : null,
        pending_grading: Number(row.pending_grading),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;