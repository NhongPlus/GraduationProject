import pool from "~/config/db";

export interface SubjectGroup {
  id: string;
  program_id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  subject_count?: number;
}

export async function getSubjectGroupsByProgram(programId: string): Promise<SubjectGroup[]> {
  const r = await pool.query<SubjectGroup & { subject_count: string }>(
    `SELECT sg.*, COUNT(s.id)::int AS subject_count
     FROM subject_groups sg
     LEFT JOIN subjects s ON s.subject_group_id = sg.id
     WHERE sg.program_id = $1
     GROUP BY sg.id
     ORDER BY sg.sort_order ASC, sg.name ASC`,
    [programId]
  );
  return r.rows.map((row) => ({
    ...row,
    subject_count: Number(row.subject_count) || 0,
  }));
}

export async function getSubjectGroupById(id: string): Promise<SubjectGroup | null> {
  const r = await pool.query<SubjectGroup>("SELECT * FROM subject_groups WHERE id = $1", [id]);
  return r.rows[0] ?? null;
}

export interface CreateSubjectGroupInput {
  program_id: string;
  code: string;
  name: string;
  description?: string | null;
  sort_order?: number;
}

export async function createSubjectGroup(input: CreateSubjectGroupInput): Promise<SubjectGroup> {
  const r = await pool.query(
    `INSERT INTO subject_groups (program_id, code, name, description, sort_order)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.program_id,
      input.code.trim().toLowerCase(),
      input.name.trim(),
      input.description ?? null,
      input.sort_order ?? 0,
    ]
  );
  return r.rows[0];
}

export interface UpdateSubjectGroupInput {
  code?: string;
  name?: string;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export async function updateSubjectGroup(
  id: string,
  input: UpdateSubjectGroupInput
): Promise<SubjectGroup | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  if (input.code !== undefined) {
    fields.push(`code = $${idx++}`);
    values.push(input.code.trim().toLowerCase());
  }
  if (input.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(input.name.trim());
  }
  if (input.description !== undefined) {
    fields.push(`description = $${idx++}`);
    values.push(input.description);
  }
  if (input.sort_order !== undefined) {
    fields.push(`sort_order = $${idx++}`);
    values.push(input.sort_order);
  }
  if (input.is_active !== undefined) {
    fields.push(`is_active = $${idx++}`);
    values.push(input.is_active);
  }
  if (fields.length === 0) return getSubjectGroupById(id);
  const r = await pool.query(
    `UPDATE subject_groups SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    [...values, id]
  );
  return r.rows[0] ?? null;
}

export async function deleteSubjectGroup(id: string): Promise<boolean> {
  const count = await pool.query<{ c: number }>(
    "SELECT COUNT(*)::int AS c FROM subjects WHERE subject_group_id = $1",
    [id]
  );
  if ((count.rows[0]?.c ?? 0) > 0) {
    throw new Error("GROUP_HAS_SUBJECTS");
  }
  const r = await pool.query("DELETE FROM subject_groups WHERE id = $1 RETURNING id", [id]);
  return (r.rowCount ?? 0) > 0;
}
