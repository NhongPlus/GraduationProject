/**
 * Seed demo: Xóa data cũ + tạo 6 môn × 2 đề × 50 câu (40 TN + 10 TL).
 * Dùng cho bảo vệ đồ án.
 * Usage: npx ts-node -r tsconfig-paths/register scripts/seed-demo-exams.ts
 */
import pool from "~/config/db";

// ─── Subjects ────────────────────────────────────────────────────────────────
const SUBJECTS = [
  { code: "NET301", name: "Lập trình mạng", credits: 3, category: "specialized" },
  { code: "BIS401", name: "Ứng dụng CNTT trong doanh nghiệp", credits: 3, category: "specialized" },
  { code: "PRA601", name: "Thực tập CNTT6: Cài đặt, cấu hình máy chủ, mạng, triển khai ứng dụng", credits: 4, category: "practice" },
  { code: "ENG204", name: "Tiếng Anh P4", credits: 3, category: "general" },
  { code: "LAW101", name: "Pháp luật đại cương", credits: 2, category: "general" },
  { code: "MAT102", name: "Toán giải tích", credits: 3, category: "foundation" },
];

type MCQ = {
  content: string;
  options: string[];
  correct: number; // 0-based
  explanation?: string;
};

type Essay = {
  content: string;
  explanation?: string;
  points?: number;
};

const MCQ_KEYS = ["A", "B", "C", "D"] as const;

/** options: mảng 4 phần tử → { A, B, C, D } */
function mcqOptionsRecord(options: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < Math.min(4, options.length); i++) {
    out[MCQ_KEYS[i]] = options[i];
  }
  return out;
}

/** chỉ số 0–3 → "A"–"D" (chuẩn hệ thống) */
function mcqCorrectLetter(correctIndex: number): string {
  return MCQ_KEYS[correctIndex] ?? "A";
}

// ─── Import question banks ───────────────────────────────────────────────────
import { netQ1, netQ2 } from "./questions/net301";
import { bisQ1, bisQ2 } from "./questions/bis401";
import { praQ1, praQ2 } from "./questions/pra601";
import { engQ1, engQ2 } from "./questions/eng204";
import { lawQ1, lawQ2 } from "./questions/law101";
import { matQ1, matQ2 } from "./questions/mat102";

interface ExamDef {
  subjectCode: string;
  title: string;
  mcqs: MCQ[];
  essays: Essay[];
}

const EXAMS: ExamDef[] = [
  { subjectCode: "NET301", title: "Lập trình mạng - Đề thi số 1", mcqs: netQ1.mcqs, essays: netQ1.essays },
  { subjectCode: "NET301", title: "Lập trình mạng - Đề thi số 2", mcqs: netQ2.mcqs, essays: netQ2.essays },
  { subjectCode: "BIS401", title: "Ứng dụng CNTT trong doanh nghiệp - Đề thi số 1", mcqs: bisQ1.mcqs, essays: bisQ1.essays },
  { subjectCode: "BIS401", title: "Ứng dụng CNTT trong doanh nghiệp - Đề thi số 2", mcqs: bisQ2.mcqs, essays: bisQ2.essays },
  { subjectCode: "PRA601", title: "Thực tập CNTT6 - Đề thi số 1", mcqs: praQ1.mcqs, essays: praQ1.essays },
  { subjectCode: "PRA601", title: "Thực tập CNTT6 - Đề thi số 2", mcqs: praQ2.mcqs, essays: praQ2.essays },
  { subjectCode: "ENG204", title: "Tiếng Anh P4 - Đề thi số 1", mcqs: engQ1.mcqs, essays: engQ1.essays },
  { subjectCode: "ENG204", title: "Tiếng Anh P4 - Đề thi số 2", mcqs: engQ2.mcqs, essays: engQ2.essays },
  { subjectCode: "LAW101", title: "Pháp luật đại cương - Đề thi số 1", mcqs: lawQ1.mcqs, essays: lawQ1.essays },
  { subjectCode: "LAW101", title: "Pháp luật đại cương - Đề thi số 2", mcqs: lawQ2.mcqs, essays: lawQ2.essays },
  { subjectCode: "MAT102", title: "Toán giải tích - Đề thi số 1", mcqs: matQ1.mcqs, essays: matQ1.essays },
  { subjectCode: "MAT102", title: "Toán giải tích - Đề thi số 2", mcqs: matQ2.mcqs, essays: matQ2.essays },
];

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("=== Bắt đầu seed demo cho bảo vệ đồ án ===\n");

  // 1. Cleanup old data
  console.log("1. Xóa data cũ...");
  await pool.query(`DELETE FROM exam_session_autosaves`);
  await pool.query(`DELETE FROM exam_integrity_events`);
  await pool.query(`DELETE FROM exam_sessions`);
  await pool.query(`DELETE FROM questions`);
  await pool.query(`DELETE FROM question_bank`);
  await pool.query(`DELETE FROM exam_collaborators`);
  await pool.query(`DELETE FROM exams`);
  // Xóa sinh viên test cũ (giữ seed CNTT 16-02 + GV + admin)
  await pool.query(
    `DELETE FROM accounts WHERE role = 'student'
     AND email NOT LIKE '%@student.dainam.edu.vn'
     AND email NOT IN ('sv01@system.local','sv02@system.local','sv03@system.local','sv04@system.local','sv05@system.local')`
  );
  console.log("   ✓ Đã xóa exam_sessions, questions, exams, question_bank cũ");

  // 2. Upsert subjects
  console.log("2. Tạo/cập nhật 6 môn học...");
  const subjectIds = new Map<string, string>();
  for (const s of SUBJECTS) {
    const r = await pool.query(
      `INSERT INTO subjects (name, code, credits, category)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (name) DO UPDATE SET code = $2, credits = $3, category = $4
       RETURNING id`,
      [s.name, s.code, s.credits, s.category]
    );
    subjectIds.set(s.code, r.rows[0].id);
  }
  console.log(`   ✓ 6 môn: ${[...subjectIds.keys()].join(", ")}`);

  // 3. Get teacher + admin_class
  const teacherR = await pool.query(
    `SELECT id FROM accounts WHERE email = 'gv01@system.local' LIMIT 1`
  );
  if (!teacherR.rows[0]) {
    console.error("Không tìm thấy GV gv01@system.local!");
    process.exit(1);
  }
  const teacherId = teacherR.rows[0].id;

  const acR = await pool.query(
    `SELECT id FROM admin_classes WHERE display_name = 'CNTT 16-02' LIMIT 1`
  );
  if (!acR.rows[0]) {
    console.error("Không tìm thấy lớp CNTT 16-02!");
    process.exit(1);
  }
  const adminClassId = acR.rows[0].id;

  // 4. Create exams + questions
  console.log("3. Tạo 12 đề thi...");
  for (const exam of EXAMS) {
    const subjectId = subjectIds.get(exam.subjectCode);
    if (!subjectId) { console.error(`Subject ${exam.subjectCode} not found`); continue; }

    const totalPoints = exam.mcqs.length * 0.2 + exam.essays.reduce((s, e) => s + (e.points ?? 1), 0);
    const examR = await pool.query(
      `INSERT INTO exams (title, description, duration_min, created_by, admin_class_id, subject_id, num_versions)
       VALUES ($1, $2, 90, $3, $4, $5, 1) RETURNING id`,
      [
        exam.title,
        `Đề thi ${exam.title} — 40 câu trắc nghiệm + 10 câu tự luận`,
        teacherId,
        adminClassId,
        subjectId,
      ]
    );
    const examId = examR.rows[0].id;

    let order = 1;
    for (const q of exam.mcqs) {
      const optionsObj = mcqOptionsRecord(q.options);
      const correctLetter = mcqCorrectLetter(q.correct);
      await pool.query(
        `INSERT INTO questions (exam_id, content, question_type, options, correct_answer, points, display_order, explanation, version_index)
         VALUES ($1, $2, 'mcq', $3, $4, 0.2, $5, $6, 0)`,
        [
          examId,
          q.content,
          JSON.stringify(optionsObj),
          JSON.stringify(correctLetter),
          order++,
          q.explanation ?? null,
        ]
      );
    }
    for (const q of exam.essays) {
      await pool.query(
        `INSERT INTO questions (exam_id, content, question_type, options, correct_answer, points, display_order, explanation, version_index)
         VALUES ($1, $2, 'essay', NULL, NULL, $3, $4, $5, 0)`,
        [examId, q.content, q.points ?? 1, order++, q.explanation ?? null]
      );
    }
    console.log(`   ✓ ${exam.title}: ${exam.mcqs.length} TN + ${exam.essays.length} TL`);
  }

  console.log("\n=== Seed hoàn tất! ===");
  console.log(`Tổng: ${EXAMS.length} đề × 50 câu = ${EXAMS.length * 50} câu hỏi`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
