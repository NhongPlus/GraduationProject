import pool from "~/config/db";

export interface Grade {
  id: string;
  assignment_id: string;
  student_id: string;
  score: number;
  feedback: string | null;
  graded_at: string;
}

export const getGradesByAssignment = async (assignmentId: string): Promise<any[]> => {
  const result = await pool.query(`
    SELECT g.*, a.full_name, a.email, a.username
    FROM grades g
    JOIN accounts a ON a.id = g.student_id
    WHERE g.assignment_id = $1
    ORDER BY a.full_name ASC
  `, [assignmentId]);
  return result.rows;
};

export const getGradesByStudent = async (studentId: string): Promise<any[]> => {
  const result = await pool.query(`
    SELECT g.*, asn.title AS assignment_title, asn.due_date
    FROM grades g
    JOIN assignments asn ON asn.id = g.assignment_id
    WHERE g.student_id = $1
    ORDER BY g.graded_at DESC
  `, [studentId]);
  return result.rows;
};

export const findGrade = async (
  assignmentId: string,
  studentId: string
): Promise<Grade | null> => {
  const result = await pool.query(
    "SELECT * FROM grades WHERE assignment_id = $1 AND student_id = $2",
    [assignmentId, studentId]
  );
  return result.rows[0] ?? null;
};

export const upsertGrade = async (
  assignmentId: string,
  studentId: string,
  score: number,
  feedback?: string
): Promise<Grade> => {
  const result = await pool.query(
    `INSERT INTO grades (assignment_id, student_id, score, feedback, graded_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (assignment_id, student_id)
     DO UPDATE SET score = $3, feedback = $4, graded_at = NOW()
     RETURNING *`,
    [assignmentId, studentId, score, feedback ?? null]
  );
  return result.rows[0];
};