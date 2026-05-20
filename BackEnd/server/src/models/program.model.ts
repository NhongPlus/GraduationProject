import pool from "~/config/db";

export interface Program {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  subject_count?: number;
}

export async function getAllPrograms(): Promise<Program[]> {
  const r = await pool.query<Program & { subject_count: string }>(
    `SELECT p.*, COUNT(s.id)::int AS subject_count
     FROM programs p
     LEFT JOIN subjects s ON s.program_id = p.id
     GROUP BY p.id
     ORDER BY p.name ASC`
  );
  return r.rows.map((row) => ({
    ...row,
    subject_count: Number(row.subject_count) || 0,
  }));
}

export async function getProgramById(id: string): Promise<Program | null> {
  const r = await pool.query<Program>("SELECT * FROM programs WHERE id = $1", [id]);
  return r.rows[0] ?? null;
}

export async function getProgramByCode(code: string): Promise<Program | null> {
  const r = await pool.query<Program>(
    "SELECT * FROM programs WHERE code = $1",
    [code.trim().toUpperCase()]
  );
  return r.rows[0] ?? null;
}

export interface CreateProgramInput {
  code: string;
  name: string;
  description?: string | null;
}

export async function createProgram(input: CreateProgramInput): Promise<Program> {
  const r = await pool.query(
    `INSERT INTO programs (code, name, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.code.trim().toUpperCase(), input.name.trim(), input.description ?? null]
  );
  return r.rows[0];
}

export interface UpdateProgramInput {
  code?: string;
  name?: string;
  description?: string | null;
  is_active?: boolean;
}

export async function updateProgram(
  id: string,
  input: UpdateProgramInput
): Promise<Program | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  if (input.code !== undefined) {
    fields.push(`code = $${idx++}`);
    values.push(input.code.trim().toUpperCase());
  }
  if (input.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(input.name.trim());
  }
  if (input.description !== undefined) {
    fields.push(`description = $${idx++}`);
    values.push(input.description);
  }
  if (input.is_active !== undefined) {
    fields.push(`is_active = $${idx++}`);
    values.push(input.is_active);
  }
  if (fields.length === 0) return getProgramById(id);
  const r = await pool.query(
    `UPDATE programs SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    [...values, id]
  );
  return r.rows[0] ?? null;
}

export async function deleteProgram(id: string): Promise<boolean> {
  const r = await pool.query("DELETE FROM programs WHERE id = $1", [id]);
  return (r.rowCount ?? 0) > 0;
}
