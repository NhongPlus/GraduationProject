import pool from "~/config/db";

export interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number;
  category: string;
  is_active: boolean;
  created_at: string;
}

export const getAllSubjects = async (): Promise<Subject[]> => {
  const result = await pool.query(
    "SELECT * FROM subjects ORDER BY semester ASC, name ASC"
  );
  return result.rows;
};

export const querySubjectsPaginated = async (
  limit: number,
  offset: number,
  search?: string
): Promise<{ items: Subject[]; total: number }> => {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (search?.trim()) {
    conditions.push(
      `(name ILIKE $${idx} OR code ILIKE $${idx} OR category ILIKE $${idx})`
    );
    values.push(`%${search.trim()}%`);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM subjects ${where}`,
    values
  );
  const total = countResult.rows[0]?.total ?? 0;

  const result = await pool.query(
    `SELECT * FROM subjects ${where}
     ORDER BY semester ASC, name ASC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, limit, offset]
  );
  return { items: result.rows as Subject[], total };
};

export const getSubjectById = async (id: string): Promise<Subject | null> => {
  const result = await pool.query(
    "SELECT * FROM subjects WHERE id = $1",
    [id]
  );
  return result.rows[0] ?? null;
};

export interface CreateSubjectInput {
  name: string;
  code?: string;
  credits?: number;
  semester?: number;
  category?: string;
}

export const createSubject = async (
  input: CreateSubjectInput
): Promise<Subject> => {
  const result = await pool.query(
    `INSERT INTO subjects (name, code, credits, semester, category)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.name,
      input.code ?? "",
      input.credits ?? 0,
      input.semester ?? 0,
      input.category ?? "general",
    ]
  );
  return result.rows[0];
};

export interface UpdateSubjectInput {
  name?: string;
  code?: string;
  credits?: number;
  semester?: number;
  category?: string;
  is_active?: boolean;
}

export const updateSubject = async (
  id: string,
  input: UpdateSubjectInput
): Promise<Subject | null> => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (input.name !== undefined) { fields.push(`name = $${idx++}`); values.push(input.name); }
  if (input.code !== undefined) { fields.push(`code = $${idx++}`); values.push(input.code); }
  if (input.credits !== undefined) { fields.push(`credits = $${idx++}`); values.push(input.credits); }
  if (input.semester !== undefined) { fields.push(`semester = $${idx++}`); values.push(input.semester); }
  if (input.category !== undefined) { fields.push(`category = $${idx++}`); values.push(input.category); }
  if (input.is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(input.is_active); }

  if (fields.length === 0) return null;

  const result = await pool.query(
    `UPDATE subjects SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    [...values, id]
  );
  return result.rows[0] ?? null;
};

export const deleteSubject = async (id: string): Promise<boolean> => {
  const result = await pool.query(
    "DELETE FROM subjects WHERE id = $1",
    [id]
  );
  return (result.rowCount ?? 0) > 0;
};