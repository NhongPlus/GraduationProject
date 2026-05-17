import pool from "~/config/db";
import { addOwnerOnCreate } from "./examCollaborators.model";

export interface Exam {
  id: string;
  title: string;
  description: string | null;
  class_id: string | null;
  admin_class_id: string | null;
  subject_id: string | null;
  created_by: string;
  duration_min: number;
  num_versions: number;
  closes_at: string | null;
  created_at: string;
}

export interface ExamDetail extends Exam {
  subject_name: string;
  subject_code: string | null;
  admin_class_name: string | null;
  class_semester: string | null;
  class_year: number | null;
  creator_name: string | null;
}

const examSelectBase = `
  SELECT e.*,
         COALESCE(s.name, s2.name) AS subject_name,
         COALESCE(s.code, s2.code) AS subject_code,
         ac.display_name AS admin_class_name,
         c.semester AS class_semester,
         c.year AS class_year,
         a.full_name AS creator_name
  FROM exams e
  LEFT JOIN admin_classes ac ON ac.id = e.admin_class_id
  LEFT JOIN subjects s ON s.id = e.subject_id
  LEFT JOIN classes c ON c.id = e.class_id
  LEFT JOIN subjects s2 ON s2.id = c.subject_id
  LEFT JOIN accounts a ON a.id = e.created_by
`;

export const getAllExams = async (): Promise<ExamDetail[]> => {
  const result = await pool.query(`${examSelectBase} ORDER BY e.created_at DESC`);
  return result.rows;
};

export const getExamsByAdminClass = async (adminClassId: string): Promise<Exam[]> => {
  const result = await pool.query(
    "SELECT * FROM exams WHERE admin_class_id = $1 ORDER BY created_at DESC",
    [adminClassId]
  );
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
  const result = await pool.query(`${examSelectBase} WHERE e.id = $1`, [id]);
  return result.rows[0] ?? null;
};

export const createExam = async (
  title: string,
  createdBy: string,
  durationMin: number,
  opts: {
    classId?: string | null;
    adminClassId?: string | null;
    subjectId?: string | null;
    description?: string;
    closesAt?: string | null;
    numVersions?: number;
  }
): Promise<Exam> => {
  const result = await pool.query(
    `INSERT INTO exams (title, description, class_id, admin_class_id, subject_id, created_by, duration_min, num_versions, closes_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      title,
      opts.description ?? null,
      opts.classId ?? null,
      opts.adminClassId ?? null,
      opts.subjectId ?? null,
      createdBy,
      durationMin,
      opts.numVersions ?? 2,
      opts.closesAt ?? null,
    ]
  );
  const exam = result.rows[0] as Exam;
  await addOwnerOnCreate(exam.id, createdBy);
  return exam;
};

export const updateExam = async (
  id: string,
  fields: Partial<
    Pick<
      Exam,
      "title" | "description" | "duration_min" | "closes_at" | "admin_class_id" | "subject_id" | "num_versions"
    >
  >
): Promise<Exam | null> => {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return null;

  const setClauses = entries.map(([key], i) => `${key} = $${i + 2}`).join(", ");
  const values = entries.map(([, value]) => value);
  const result = await pool.query(
    `UPDATE exams SET ${setClauses} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] ?? null;
};

export const deleteExam = async (id: string): Promise<boolean> => {
  const result = await pool.query("DELETE FROM exams WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
};
