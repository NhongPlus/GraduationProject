import pool from "~/config/db";

export type QuestionType = "mcq" | "essay";

export interface Question {
  id: string;
  exam_id: string;
  content: string;
  question_type: QuestionType;
  options: Record<string, string> | null;
  correct_answer: string | string[] | null;
  media_url: string | null;
  points: number;
  display_order: number;
  version_index: number;
  question_bank_id?: string | null;
  created_at: string;
  explanation: string | null;
}

export type PublicQuestion = Omit<Question, "correct_answer">;

function parseJson<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      // JSONB columns are auto-parsed by the PG driver. A simple string
      // value like "B" is already the final JS value — JSON.parse("B")
      // fails because bare letters are not valid JSON. Return the string
      // itself instead of the fallback so correct_answer = "B" works.
      return v as unknown as T;
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
    media_url: row.media_url ?? null,
    points: Number(row.points),
    display_order: Number(row.display_order ?? 0),
    version_index: Number(row.version_index ?? 0),
    question_bank_id: row.question_bank_id ?? null,
    created_at: row.created_at,
    explanation: row.explanation ?? null,
  };
}

export const getQuestionsByExam = async (examId: string): Promise<Question[]> => {
  const result = await pool.query(
    `SELECT * FROM questions WHERE exam_id = $1 ORDER BY display_order ASC, created_at ASC`,
    [examId]
  );
  return result.rows.map(mapQuestionRow);
};

export const getPublicQuestionsByExam = async (examId: string): Promise<PublicQuestion[]> => {
  const result = await pool.query(
    `SELECT id, exam_id, content, question_type, options, points, display_order, created_at, media_url
     FROM questions WHERE exam_id = $1 ORDER BY display_order ASC, created_at ASC`,
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
  correctAnswer?: string | string[] | null,
  mediaUrl?: string | null,
  displayOrder?: number,
  versionIndex?: number,
  questionBankId?: string | null
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
    `INSERT INTO questions (exam_id, content, question_type, options, correct_answer, media_url, points, display_order, version_index, question_bank_id)
     VALUES (
       $1,
       $2,
       $3,
       $4,
       $5,
       $6,
       $7,
       COALESCE($8, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM questions WHERE exam_id = $1 AND version_index = COALESCE($9, 0))),
       COALESCE($9, 0),
       $10
     )
     RETURNING *`,
    [
      examId,
      content,
      questionType,
      opts,
      correct,
      mediaUrl ?? null,
      points,
      displayOrder ?? null,
      versionIndex ?? 0,
      questionBankId ?? null,
    ]
  );
  if (questionBankId) {
    await pool.query(
      `UPDATE question_bank SET usage_count = usage_count + 1 WHERE id = $1`,
      [questionBankId]
    );
  }
  return mapQuestionRow(result.rows[0]);
};

export const deleteQuestion = async (id: string): Promise<boolean> => {
  const result = await pool.query("DELETE FROM questions WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
};

export const updateQuestionForExam = async (
  questionId: string,
  examId: string,
  data: {
    content: string;
    question_type: QuestionType;
    points: number;
    options: Record<string, string> | null;
    correct_answer: string | string[] | null;
    media_url: string | null;
    display_order: number;
  }
): Promise<Question | null> => {
  const opts =
    data.question_type === "essay"
      ? null
      : data.options != null
        ? JSON.stringify(data.options)
        : JSON.stringify({});
  const correct =
    data.question_type === "essay"
      ? null
      : data.correct_answer != null
        ? JSON.stringify(data.correct_answer)
        : null;

  const result = await pool.query(
    `UPDATE questions SET
      content = $1,
      question_type = $2,
      options = $3,
      correct_answer = $4,
      media_url = $5,
      points = $6,
      display_order = $7
    WHERE id = $8 AND exam_id = $9
    RETURNING *`,
    [
      data.content,
      data.question_type,
      opts,
      correct,
      data.media_url,
      data.points,
      data.display_order,
      questionId,
      examId,
    ]
  );
  const row = result.rows[0];
  return row ? mapQuestionRow(row) : null;
};