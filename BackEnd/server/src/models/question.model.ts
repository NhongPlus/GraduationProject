import pool from "~/config/db";

export type QuestionType = "mcq" | "essay";

export interface Question {
  id: string;
  exam_id: string;
  content: string;
  question_type: QuestionType;
  options: Record<string, string> | null;
  correct_answer: string | string[] | null;
  points: number;
  created_at: string;
}

export type PublicQuestion = Omit<Question, "correct_answer">;

function parseJson<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return v as T;
}

function mapQuestionRow(row: any): Question {
  const qt = (row.question_type as QuestionType) || "mcq";
  return {
    id: row.id,
    exam_id: row.exam_id,
    content: row.content,
    question_type: qt === "essay" ? "essay" : "mcq",
    options: row.options == null ? null : parseJson<Record<string, string>>(row.options, {}),
    correct_answer:
      row.correct_answer == null
        ? null
        : parseJson<string | string[]>(row.correct_answer, null as any),
    points: Number(row.points),
    created_at: row.created_at,
  };
}

export const getQuestionsByExam = async (examId: string): Promise<Question[]> => {
  const result = await pool.query(
    `SELECT * FROM questions WHERE exam_id = $1 ORDER BY created_at ASC`,
    [examId]
  );
  return result.rows.map(mapQuestionRow);
};

export const getPublicQuestionsByExam = async (examId: string): Promise<PublicQuestion[]> => {
  const result = await pool.query(
    `SELECT id, exam_id, content, question_type, options, points, created_at
     FROM questions WHERE exam_id = $1 ORDER BY created_at ASC`,
    [examId]
  );
  return result.rows.map((row) => {
    const q = mapQuestionRow(row);
    const { correct_answer: _, ...pub } = q;
    return pub;
  });
};

export const getQuestionById = async (id: string): Promise<Question | null> => {
  const result = await pool.query("SELECT * FROM questions WHERE id = $1", [id]);
  const row = result.rows[0];
  return row ? mapQuestionRow(row) : null;
};

export const createQuestion = async (
  examId: string,
  content: string,
  questionType: QuestionType,
  points: number,
  options?: Record<string, string> | null,
  correctAnswer?: string | string[] | null
): Promise<Question> => {
  const opts =
    questionType === "essay" ? null : options != null ? JSON.stringify(options) : JSON.stringify({});
  const correct =
    questionType === "essay"
      ? null
      : correctAnswer != null
        ? JSON.stringify(correctAnswer)
        : null;

  const result = await pool.query(
    `INSERT INTO questions (exam_id, content, question_type, options, correct_answer, points)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [examId, content, questionType, opts, correct, points]
  );
  return mapQuestionRow(result.rows[0]);
};

export const deleteQuestion = async (id: string): Promise<boolean> => {
  const result = await pool.query("DELETE FROM questions WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
};