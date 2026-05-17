import pool from "~/config/db";

export interface AdminClass {
  id: string;
  program_code: string;
  intake_year: number;
  section: string;
  display_name: string;
  manager_teacher_id: string | null;
  created_at: string;
}

export interface AdminClassDetail extends AdminClass {
  manager_name: string | null;
  manager_email: string | null;
  student_count: number;
}

export const getAllAdminClasses = async (): Promise<AdminClassDetail[]> => {
  const result = await pool.query(`
    SELECT ac.*,
           m.full_name AS manager_name,
           m.email AS manager_email,
           (SELECT COUNT(*)::int FROM accounts s
            WHERE s.admin_class_id = ac.id AND s.role = 'student') AS student_count
    FROM admin_classes ac
    LEFT JOIN accounts m ON m.id = ac.manager_teacher_id
    ORDER BY ac.intake_year DESC, ac.section ASC
  `);
  return result.rows;
};

export const getAdminClassById = async (id: string): Promise<AdminClassDetail | null> => {
  const result = await pool.query(
    `
    SELECT ac.*,
           m.full_name AS manager_name,
           m.email AS manager_email,
           (SELECT COUNT(*)::int FROM accounts s
            WHERE s.admin_class_id = ac.id AND s.role = 'student') AS student_count
    FROM admin_classes ac
    LEFT JOIN accounts m ON m.id = ac.manager_teacher_id
    WHERE ac.id = $1
  `,
    [id]
  );
  return result.rows[0] ?? null;
};

export const getAdminClassByManager = async (
  teacherId: string
): Promise<AdminClassDetail | null> => {
  const result = await pool.query(
    `
    SELECT ac.*,
           m.full_name AS manager_name,
           m.email AS manager_email,
           (SELECT COUNT(*)::int FROM accounts s
            WHERE s.admin_class_id = ac.id AND s.role = 'student') AS student_count
    FROM admin_classes ac
    LEFT JOIN accounts m ON m.id = ac.manager_teacher_id
    WHERE ac.manager_teacher_id = $1
  `,
    [teacherId]
  );
  return result.rows[0] ?? null;
};

export const getStudentEmailsByAdminClass = async (adminClassId: string): Promise<string[]> => {
  const result = await pool.query<{ email: string }>(
    `
    SELECT email FROM accounts
    WHERE admin_class_id = $1 AND role = 'student' AND is_active = true AND email IS NOT NULL
  `,
    [adminClassId]
  );
  return result.rows.map((r) => r.email);
};

export const getStudentsByAdminClass = async (adminClassId: string) => {
  const result = await pool.query(
    `
    SELECT id, email, username, full_name, role, admin_class_id, created_at
    FROM accounts
    WHERE admin_class_id = $1 AND role = 'student' AND is_active = true
    ORDER BY full_name NULLS LAST, email
  `,
    [adminClassId]
  );
  return result.rows;
};
