import pool from "~/config/db";

export type AutosaveAnswers = Record<string, string>;

export interface ExamAutosaveSnapshot {
  id: string;
  exam_id: string;
  session_id: string;
  student_id: string;
  saved_at: string;
  answers: AutosaveAnswers;
  server_at: string;
  created_at: string;
  updated_at: string;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function mapAutosaveRow(row: any): ExamAutosaveSnapshot {
  return {
    id: row.id,
    exam_id: row.exam_id,
    session_id: row.session_id,
    student_id: row.student_id,
    saved_at: row.saved_at,
    answers: parseJson<AutosaveAnswers>(row.answers, {}),
    server_at: row.server_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const upsertAutosaveSnapshot = async (payload: {
  examId: string;
  sessionId: string;
  studentId: string;
  savedAt: string;
  answers: AutosaveAnswers;
}): Promise<ExamAutosaveSnapshot> => {
  const result = await pool.query(
    `INSERT INTO exam_session_autosaves
      (exam_id, session_id, student_id, saved_at, answers)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (session_id)
     DO UPDATE SET
       exam_id = EXCLUDED.exam_id,
       student_id = EXCLUDED.student_id,
       saved_at = EXCLUDED.saved_at,
       answers = EXCLUDED.answers,
       server_at = NOW(),
       updated_at = NOW()
     RETURNING *`,
    [
      payload.examId,
      payload.sessionId,
      payload.studentId,
      payload.savedAt,
      JSON.stringify(payload.answers),
    ]
  );

  return mapAutosaveRow(result.rows[0]);
};

export const getLatestAutosaveSnapshotBySession = async (
  sessionId: string
): Promise<ExamAutosaveSnapshot | null> => {
  const result = await pool.query(
    `SELECT *
     FROM exam_session_autosaves
     WHERE session_id = $1
     ORDER BY saved_at DESC, updated_at DESC
     LIMIT 1`,
    [sessionId]
  );

  const row = result.rows[0];
  return row ? mapAutosaveRow(row) : null;
};