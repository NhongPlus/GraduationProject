import { getExamById } from "~/models/exam.model";
import { upsertPredictionCache } from "~/models/studentPredictionCache.model";
import { getAllUsers } from "~/models/user.model";
import { getStudentSessions } from "~/services/exam.service";
import { predictScore, type PredictionRequest } from "~/services/prediction.service";
import { grade10ToLetter, scoreToGrade10 } from "~/utils/gradeScale";

export type RecomputeSummary = {
  total_students: number;
  computed: number;
  skipped_no_data: number;
  failed: number;
  errors: string[];
};

async function buildRequestForStudent(
  studentId: string,
  fullName: string | null
): Promise<PredictionRequest | null> {
  const sessions = await getStudentSessions(studentId);
  const completed = sessions.filter(
    (s) =>
      s.status !== "active" &&
      s.score != null &&
      s.max_points != null &&
      Number(s.max_points) > 0
  );
  if (completed.length === 0) return null;

  const newestFirst = completed.slice(0, 20);
  const chronological = newestFirst.slice().reverse();

  const rows: { subject: string; score: number; grade: string }[] = [];
  for (const s of chronological) {
    const exam = await getExamById(s.exam_id);
    const grade10 = scoreToGrade10(s.score, s.max_points);
    if (grade10 == null) continue;
    const grade = grade10ToLetter(grade10);
    const subject = exam?.subject_name || exam?.title || s.exam_id;
    rows.push({ subject, score: grade10, grade });
  }
  if (rows.length === 0) return null;

  const latest = rows[rows.length - 1];
  return {
    student_id: studentId,
    student_name: fullName ?? undefined,
    just_completed: {
      subject: latest.subject,
      score: latest.score,
      grade: latest.grade,
    },
    history: rows.slice(0, -1).map((r) => ({ subject: r.subject, score: r.score, grade: r.grade })),
  };
}

/** Admin: gọi MiniMax cho từng sinh viên có lịch sử, ghi cache (SV không gọi AI). */
export async function recomputePredictionsForAllStudents(): Promise<RecomputeSummary> {
  const users = await getAllUsers();
  const students = users.filter((u) => u.role === "student");
  const summary: RecomputeSummary = {
    total_students: students.length,
    computed: 0,
    skipped_no_data: 0,
    failed: 0,
    errors: [],
  };

  for (const u of students) {
    try {
      const req = await buildRequestForStudent(u.id, u.full_name);
      if (!req) {
        summary.skipped_no_data += 1;
        continue;
      }
      const result = await predictScore(req);
      await upsertPredictionCache(u.id, result);
      summary.computed += 1;
    } catch (e: unknown) {
      summary.failed += 1;
      const msg = e instanceof Error ? e.message : String(e);
      if (summary.errors.length < 25) {
        summary.errors.push(`${u.email}: ${msg}`);
      }
    }
  }

  return summary;
}
