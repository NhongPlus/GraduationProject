import pool from "~/config/db";

export interface Subject {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export const getAllSubjects = async (): Promise<Subject[]> => {
  const result = await pool.query(
    "SELECT * FROM subjects ORDER BY name ASC"
  );
  return result.rows;
};

export const getSubjectById = async (id: string): Promise<Subject | null> => {
  const result = await pool.query(
    "SELECT * FROM subjects WHERE id = $1",
    [id]
  );
  return result.rows[0] ?? null;
};

export const createSubject = async (
  name: string,
  code: string
): Promise<Subject> => {
  const result = await pool.query(
    "INSERT INTO subjects (name, code) VALUES ($1, $2) RETURNING *",
    [name, code]
  );
  return result.rows[0];
};

export const updateSubject = async (
  id: string,
  fields: Partial<Pick<Subject, "name" | "code">>
): Promise<Subject | null> => {
  const keys = Object.keys(fields) as Array<keyof typeof fields>;
  if (keys.length === 0) return null;
  const setClauses = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  const values = keys.map((k) => fields[k]);
  const result = await pool.query(
    `UPDATE subjects SET ${setClauses} WHERE id = $1 RETURNING *`,
    [id, ...values]
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