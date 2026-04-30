import pool from "~/config/db";

export type SessionStatus = "active" | "submitted" | "expired";
export type GradingStatus = "pending_manual" | "complete";

export interface ExamSession {
  id: string;
  exam_id: string;
  student_id: string;
  started_at: string;
  finished_at: string | null;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
  score: number | null;
  max_points: number | null;
  student_answers: Record<string, string | string[]> | null;
  graded_details: unknown | null;
  grading_status: GradingStatus | null;
}

export interface SessionWithExamMeta extends ExamSession {
  exam_created_by: string;
  exam_title: string;
  exam_duration_min: number;
}

export const getSessionById = async (id: string): Promise<ExamSession | null> => {
  const result = await pool.query("SELECT * FROM exam_sessions WHERE id = $1", [id]);
  return (result.rows[0] as ExamSession) ?? null;
};

export const getSessionWithExam = async (
  sessionId: string
): Promise<SessionWithExamMeta | null> => {
  const result = await pool.query(
    `SELECT es.*,
            e.created_by AS exam_created_by,
            e.title AS exam_title,
            e.duration_min AS exam_duration_min
     FROM exam_sessions es
     JOIN exams e ON e.id = es.exam_id
     WHERE es.id = $1`,
    [sessionId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    ...(row as ExamSession),
    exam_created_by: row.exam_created_by,
    exam_title: row.exam_title,
    exam_duration_min: row.exam_duration_min,
  };
};

export const getActiveSession = async (
  examId: string,
  studentId: string
): Promise<ExamSession | null> => {
  const result = await pool.query(
    "SELECT * FROM exam_sessions WHERE exam_id = $1 AND student_id = $2 AND status = 'active'",
    [examId, studentId]
  );
  return (result.rows[0] as ExamSession) ?? null;
};

export const getActiveSessionsByExam = async (examId: string): Promise<ExamSession[]> => {
  const result = await pool.query(
    `SELECT *
     FROM exam_sessions
     WHERE exam_id = $1 AND status = 'active'
     ORDER BY created_at ASC`,
    [examId]
  );
  return result.rows as ExamSession[];
};

export const getSessionsByStudent = async (studentId: string): Promise<ExamSession[]> => {
  const result = await pool.query(
    "SELECT * FROM exam_sessions WHERE student_id = $1 ORDER BY created_at DESC",
    [studentId]
  );
  return result.rows as ExamSession[];
};

export const getSessionsByExam = async (examId: string): Promise<ExamSession[]> => {
  const result = await pool.query(
    `
    SELECT es.*, a.full_name, a.email
    FROM exam_sessions es
    JOIN accounts a ON a.id = es.student_id
    WHERE es.exam_id = $1
    ORDER BY es.created_at DESC
  `,
    [examId]
  );
  return result.rows as ExamSession[];
};

export const createSession = async (examId: string, studentId: string): Promise<ExamSession> => {
  const result = await pool.query(
    `INSERT INTO exam_sessions (exam_id, student_id, started_at, status)
     VALUES ($1, $2, NOW(), 'active') RETURNING *`,
    [examId, studentId]
  );
  return result.rows[0] as ExamSession;
};

export const finalizeSessionSubmit = async (
  id: string,
  payload: {
    score: number;
    max_points: number;
    student_answers: Record<string, string | string[]>;
    graded_details: unknown;
    grading_status: GradingStatus;
  }
): Promise<ExamSession | null> => {
  const result = await pool.query(
    `UPDATE exam_sessions
     SET status = 'submitted',
         finished_at = NOW(),
         updated_at = NOW(),
         score = $2,
         max_points = $3,
         student_answers = $4::jsonb,
         graded_details = $5::jsonb,
         grading_status = $6
     WHERE id = $1 AND status = 'active'
     RETURNING *`,
    [
      id,
      payload.score,
      payload.max_points,
      JSON.stringify(payload.student_answers),
      JSON.stringify(payload.graded_details),
      payload.grading_status,
    ]
  );
  return (result.rows[0] as ExamSession) ?? null;
};

export const updateSessionGrading = async (
  id: string,
  payload: { score: number; graded_details: unknown; grading_status: GradingStatus }
): Promise<ExamSession | null> => {
  const result = await pool.query(
    `UPDATE exam_sessions
     SET score = $2,
         graded_details = $3::jsonb,
         grading_status = $4,
         updated_at = NOW()
     WHERE id = $1 AND status = 'submitted'
     RETURNING *`,
    [id, payload.score, JSON.stringify(payload.graded_details), payload.grading_status]
  );
  return (result.rows[0] as ExamSession) ?? null;
};

export const getLatestSubmittedSession = async (
  examId: string,
  studentId: string
): Promise<ExamSession | null> => {
  const result = await pool.query(
    `SELECT * FROM exam_sessions
     WHERE exam_id = $1 AND student_id = $2 AND status = 'submitted'
     ORDER BY finished_at DESC NULLS LAST, updated_at DESC
     LIMIT 1`,
    [examId, studentId]
  );
  return (result.rows[0] as ExamSession) ?? null;
};

export const expireSession = async (id: string): Promise<ExamSession | null> => {
  const result = await pool.query(
    `UPDATE exam_sessions
     SET status = 'expired', finished_at = NOW(), updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id]
  );
  return (result.rows[0] as ExamSession) ?? null;
};