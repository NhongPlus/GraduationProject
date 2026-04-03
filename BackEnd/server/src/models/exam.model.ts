import pool from "~/config/db";

export interface Exam {
  id: string;
  title: string;
  description: string | null;
  class_id: string;
  created_by: string;
  duration_min: number;
  created_at: string;
}

export interface ExamDetail extends Exam {
  subject_name: string;
  class_semester: string;
  class_year: number;
  creator_name: string | null;
}

export const getAllExams = async (): Promise<ExamDetail[]> => {
  const result = await pool.query(`
    SELECT e.*,
           s.name AS subject_name,
           c.semester AS class_semester, c.year AS class_year,
           a.full_name AS creator_name
    FROM exams e
    JOIN classes c ON c.id = e.class_id
    JOIN subjects s ON s.id = c.subject_id
    JOIN accounts a ON a.id = e.created_by
    ORDER BY e.created_at DESC
  `);
  return result.rows;
};

export const getExamsByClass = async (classId: string): Promise<Exam[]> => {
  const result = await pool.query(
    "SELECT * FROM exams WHERE class_id = $1 ORDER BY created_at DESC",
    [classId]
  );
  return result.rows;
};

export const getExamById = async (id: string): Promise<ExamDetail | null> => {
  const result = await pool.query(`
    SELECT e.*,
           s.name AS subject_name,
           c.semester AS class_semester, c.year AS class_year,
           a.full_name AS creator_name
    FROM exams e
    JOIN classes c ON c.id = e.class_id
    JOIN subjects s ON s.id = c.subject_id
    JOIN accounts a ON a.id = e.created_by
    WHERE e.id = $1
  `, [id]);
  return result.rows[0] ?? null;
};

export const createExam = async (
  title: string,
  classId: string,
  createdBy: string,
  durationMin: number,
  description?: string
): Promise<Exam> => {
  const result = await pool.query(
    `INSERT INTO exams (title, description, class_id, created_by, duration_min)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [title, description ?? null, classId, createdBy, durationMin]
  );
  return result.rows[0];
};

export const deleteExam = async (id: string): Promise<boolean> => {
  const result = await pool.query("DELETE FROM exams WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
};