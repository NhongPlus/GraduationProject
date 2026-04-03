import pool from "~/config/db";

export interface Question {
  id: string;
  exam_id: string;
  content: string;
  options: Record<string, string>;
  correct_answer: string | string[];
  points: number;
  created_at: string;
}

export type PublicQuestion = Omit<Question, "correct_answer">;

export const getQuestionsByExam = async (examId: string): Promise<Question[]> => {
  const result = await pool.query(
    "SELECT * FROM questions WHERE exam_id = $1 ORDER BY created_at ASC",
    [examId]
  );
  return result.rows;
};

export const getPublicQuestionsByExam = async (examId: string): Promise<PublicQuestion[]> => {
  const result = await pool.query(
    "SELECT id, exam_id, content, options, points, created_at FROM questions WHERE exam_id = $1 ORDER BY created_at ASC",
    [examId]
  );
  return result.rows;
};

export const getQuestionById = async (id: string): Promise<Question | null> => {
  const result = await pool.query(
    "SELECT * FROM questions WHERE id = $1",
    [id]
  );
  return result.rows[0] ?? null;
};

export const createQuestion = async (
  examId: string,
  content: string,
  options: Record<string, string>,
  correctAnswer: string | string[],
  points: number
): Promise<Question> => {
  const result = await pool.query(
    `INSERT INTO questions (exam_id, content, options, correct_answer, points)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [examId, content, JSON.stringify(options), JSON.stringify(correctAnswer), points]
  );
  return result.rows[0];
};

export const deleteQuestion = async (id: string): Promise<boolean> => {
  const result = await pool.query("DELETE FROM questions WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
};