import pool from "~/config/db";

export type SessionStatus = "active" | "submitted" | "expired";

export interface ExamSession {
  id: string;
  exam_id: string;
  student_id: string;
  started_at: string;
  finished_at: string | null;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
}

export interface SessionResult extends ExamSession {
  score: number;
  total_points: number;
  answers: Record<string, string | string[]>;
}

export const getSessionById = async (id: string): Promise<ExamSession | null> => {
  const result = await pool.query(
    "SELECT * FROM exam_sessions WHERE id = $1",
    [id]
  );
  return result.rows[0] ?? null;
};

export const getActiveSession = async (
  examId: string,
  studentId: string
): Promise<ExamSession | null> => {
  const result = await pool.query(
    "SELECT * FROM exam_sessions WHERE exam_id = $1 AND student_id = $2 AND status = 'active'",
    [examId, studentId]
  );
  return result.rows[0] ?? null;
};

export const getSessionsByStudent = async (studentId: string): Promise<ExamSession[]> => {
  const result = await pool.query(
    "SELECT * FROM exam_sessions WHERE student_id = $1 ORDER BY created_at DESC",
    [studentId]
  );
  return result.rows;
};

export const getSessionsByExam = async (examId: string): Promise<ExamSession[]> => {
  const result = await pool.query(`
    SELECT es.*, a.full_name, a.email
    FROM exam_sessions es
    JOIN accounts a ON a.id = es.student_id
    WHERE es.exam_id = $1
    ORDER BY es.created_at DESC
  `, [examId]);
  return result.rows;
};

export const createSession = async (
  examId: string,
  studentId: string
): Promise<ExamSession> => {
  const result = await pool.query(
    `INSERT INTO exam_sessions (exam_id, student_id, started_at, status)
     VALUES ($1, $2, NOW(), 'active') RETURNING *`,
    [examId, studentId]
  );
  return result.rows[0];
};

export const submitSession = async (
  id: string
): Promise<ExamSession | null> => {
  const result = await pool.query(
    `UPDATE exam_sessions
     SET status = 'submitted', finished_at = NOW(), updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] ?? null;
};

export const expireSession = async (id: string): Promise<ExamSession | null> => {
  const result = await pool.query(
    `UPDATE exam_sessions
     SET status = 'expired', finished_at = NOW(), updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] ?? null;
};