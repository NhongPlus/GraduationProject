import pool from "~/config/db";

export interface Assignment {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  created_at: string;
}

export const getAssignmentsByClass = async (classId: string): Promise<Assignment[]> => {
  const result = await pool.query(
    "SELECT * FROM assignments WHERE class_id = $1 ORDER BY due_date ASC",
    [classId]
  );
  return result.rows;
};

export const getAssignmentById = async (id: string): Promise<Assignment | null> => {
  const result = await pool.query(
    "SELECT * FROM assignments WHERE id = $1",
    [id]
  );
  return result.rows[0] ?? null;
};

export const createAssignment = async (
  classId: string,
  title: string,
  description?: string,
  dueDate?: string
): Promise<Assignment> => {
  const result = await pool.query(
    `INSERT INTO assignments (class_id, title, description, due_date)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [classId, title, description ?? null, dueDate ?? null]
  );
  return result.rows[0];
};

export const deleteAssignment = async (id: string): Promise<boolean> => {
  const result = await pool.query("DELETE FROM assignments WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
};