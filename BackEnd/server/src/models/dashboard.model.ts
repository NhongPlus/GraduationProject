import pool from "~/config/db";

/** Cache: DB production có thể chưa migration `exams.closes_at`. */
let cachedExamsHasClosesAt: boolean | null = null;

export async function examsTableHasClosesAt(): Promise<boolean> {
  if (cachedExamsHasClosesAt !== null) return cachedExamsHasClosesAt;
  const r = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'exams' AND column_name = 'closes_at'
     LIMIT 1`
  );
  cachedExamsHasClosesAt = r.rows.length > 0;
  return cachedExamsHasClosesAt;
}

export interface StudentDashboardStatsRow {
  exams_taken_total: number;
  average_score_percent: number | null;
  average_duration_minutes: number | null;
}

export interface StudentUpcomingExamRow {
  exam_id: string;
  title: string;
  subject_name: string;
  duration_min: number;
  question_count: number;
  closes_at: string | null;
  created_at: string;
}

export interface StudentSessionSummaryRow {
  exam_id: string;
  exam_title: string;
  subject_name: string;
  exam_duration_min: number;
  submitted_at: string | null;
  started_at: string;
  score: number | null;
  max_points: number | null;
  status: string;
}

export const getStudentDashboardStats = async (
  studentId: string
): Promise<StudentDashboardStatsRow> => {
  const r = await pool.query<StudentDashboardStatsRow>(
    `
    SELECT
      COUNT(*) FILTER (WHERE status = 'submitted')::int AS exams_taken_total,
      AVG(
        CASE
          WHEN status = 'submitted' AND max_points IS NOT NULL AND max_points > 0 AND score IS NOT NULL
          THEN (score / max_points) * 100
        END
      )::float AS average_score_percent,
      AVG(
        CASE
          WHEN submitted_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (submitted_at - started_at)) / 60.0
        END
      )::float AS average_duration_minutes
    FROM exam_sessions
    WHERE student_id = $1
    `,
    [studentId]
  );
  return (
    r.rows[0] ?? {
      exams_taken_total: 0,
      average_score_percent: null,
      average_duration_minutes: null,
    }
  );
};

export const getStudentUpcomingExams = async (
  studentId: string,
  limit = 12
): Promise<StudentUpcomingExamRow[]> => {
  const hasDeadline = await examsTableHasClosesAt();
  const sqlWithDeadline = `
    SELECT
      e.id AS exam_id,
      e.title,
      s.name AS subject_name,
      e.duration_min,
      COALESCE(
        (SELECT COUNT(*)::int FROM questions q WHERE q.exam_id = e.id),
        0
      ) AS question_count,
      e.closes_at,
      e.created_at
    FROM exams e
    JOIN classes c ON c.id = e.class_id
    JOIN enrollments en ON en.class_id = c.id AND en.student_id = $1
    JOIN subjects s ON s.id = c.subject_id
    ORDER BY e.closes_at ASC NULLS LAST, e.created_at DESC
    LIMIT $2
  `;
  const sqlWithoutDeadline = `
    SELECT
      e.id AS exam_id,
      e.title,
      s.name AS subject_name,
      e.duration_min,
      COALESCE(
        (SELECT COUNT(*)::int FROM questions q WHERE q.exam_id = e.id),
        0
      ) AS question_count,
      NULL::timestamptz AS closes_at,
      e.created_at
    FROM exams e
    JOIN classes c ON c.id = e.class_id
    JOIN enrollments en ON en.class_id = c.id AND en.student_id = $1
    JOIN subjects s ON s.id = c.subject_id
    ORDER BY e.created_at DESC
    LIMIT $2
  `;
  const r = await pool.query<StudentUpcomingExamRow>(
    hasDeadline ? sqlWithDeadline : sqlWithoutDeadline,
    [studentId, limit]
  );
  return r.rows;
};

/** Phiên đã nộp / hết hạn, mới nhất trước — dùng cho biểu đồ & bảng kết quả */
export const getStudentRecentSessions = async (
  studentId: string,
  limit = 24
): Promise<StudentSessionSummaryRow[]> => {
  const r = await pool.query<StudentSessionSummaryRow>(
    `
    SELECT
      e.id AS exam_id,
      e.title AS exam_title,
      s.name AS subject_name,
      e.duration_min AS exam_duration_min,
      es.submitted_at,
      es.started_at,
      es.score,
      es.max_points,
      es.status
    FROM exam_sessions es
    JOIN exams e ON e.id = es.exam_id
    JOIN classes c ON c.id = e.class_id
    JOIN subjects s ON s.id = c.subject_id
    WHERE es.student_id = $1
      AND es.status IN ('submitted', 'expired')
    ORDER BY COALESCE(es.submitted_at, es.created_at) DESC
    LIMIT $2
    `,
    [studentId, limit]
  );
  return r.rows;
};

export const getClassAvgPercentByExamIds = async (
  examIds: string[]
): Promise<Map<string, number>> => {
  if (examIds.length === 0) return new Map();
  const r = await pool.query<{ exam_id: string; class_avg_percent: number }>(
    `
    SELECT
      exam_id::text,
      AVG(
        CASE
          WHEN max_points IS NOT NULL AND max_points > 0 AND score IS NOT NULL
          THEN (score / max_points) * 100
        END
      )::float AS class_avg_percent
    FROM exam_sessions
    WHERE exam_id = ANY($1::uuid[])
      AND status = 'submitted'
    GROUP BY exam_id
    `,
    [examIds]
  );
  const m = new Map<string, number>();
  for (const row of r.rows) {
    if (row.class_avg_percent != null && Number.isFinite(row.class_avg_percent)) {
      m.set(row.exam_id, row.class_avg_percent);
    }
  }
  return m;
};

export const getActiveExamIdsForStudent = async (studentId: string): Promise<Set<string>> => {
  const r = await pool.query<{ exam_id: string }>(
    `SELECT exam_id::text FROM exam_sessions WHERE student_id = $1 AND status = 'active'`,
    [studentId]
  );
  return new Set(r.rows.map((x) => x.exam_id));
};

export interface StaffOverviewRow {
  total_accounts: number;
  total_students: number;
  total_teachers: number;
  total_exams: number;
  total_sessions: number;
  total_classes: number;
}

export const getAdminOverview = async (): Promise<StaffOverviewRow> => {
  const r = await pool.query<StaffOverviewRow>(
    `
    SELECT
      (SELECT COUNT(*)::int FROM accounts) AS total_accounts,
      (SELECT COUNT(*)::int FROM accounts WHERE role = 'student') AS total_students,
      (SELECT COUNT(*)::int FROM accounts WHERE role = 'teacher') AS total_teachers,
      (SELECT COUNT(*)::int FROM exams) AS total_exams,
      (SELECT COUNT(*)::int FROM exam_sessions) AS total_sessions,
      (SELECT COUNT(*)::int FROM classes) AS total_classes
    `
  );
  return (
    r.rows[0] ?? {
      total_accounts: 0,
      total_students: 0,
      total_teachers: 0,
      total_exams: 0,
      total_sessions: 0,
      total_classes: 0,
    }
  );
};

export const getTeacherOverview = async (teacherId: string): Promise<StaffOverviewRow> => {
  const r = await pool.query<StaffOverviewRow>(
    `
    SELECT
      (SELECT COUNT(*)::int FROM classes WHERE teacher_id = $1) AS total_classes,
      (SELECT COUNT(*)::int FROM exams e
        JOIN classes c ON c.id = e.class_id
        WHERE c.teacher_id = $1) AS total_exams,
      (SELECT COUNT(DISTINCT en.student_id)::int FROM enrollments en
        JOIN classes c ON c.id = en.class_id
        WHERE c.teacher_id = $1) AS total_students,
      (SELECT COUNT(*)::int FROM exam_sessions es
        JOIN exams e ON e.id = es.exam_id
        JOIN classes c ON c.id = e.class_id
        WHERE c.teacher_id = $1) AS total_sessions,
      0::int AS total_accounts,
      0::int AS total_teachers
    `,
    [teacherId]
  );
  const row = r.rows[0];
  if (!row) {
    return {
      total_accounts: 0,
      total_students: 0,
      total_teachers: 0,
      total_exams: 0,
      total_sessions: 0,
      total_classes: 0,
    };
  }
  return row;
};

export interface RecentStudentRow {
  id: string;
  full_name: string | null;
  username: string;
  email: string;
  created_at: string;
}

export const getRecentStudents = async (limit = 15): Promise<RecentStudentRow[]> => {
  const r = await pool.query<RecentStudentRow>(
    `
    SELECT id, full_name, username, email, created_at::text
    FROM accounts
    WHERE role = 'student'
    ORDER BY created_at DESC
    LIMIT $1
    `,
    [limit]
  );
  return r.rows;
};

export interface TeacherRecentSessionRow {
  session_id: string;
  exam_title: string;
  student_name: string | null;
  student_email: string | null;
  status: string;
  updated_at: string;
}

export const getTeacherRecentSessions = async (
  teacherId: string,
  limit = 12
): Promise<TeacherRecentSessionRow[]> => {
  const r = await pool.query<TeacherRecentSessionRow>(
    `
    SELECT
      es.id::text AS session_id,
      e.title AS exam_title,
      a.full_name AS student_name,
      a.email AS student_email,
      es.status,
      es.created_at::text AS updated_at
    FROM exam_sessions es
    JOIN exams e ON e.id = es.exam_id
    JOIN classes c ON c.id = e.class_id
    JOIN accounts a ON a.id = es.student_id
    WHERE c.teacher_id = $1
    ORDER BY COALESCE(es.submitted_at, es.created_at) DESC
    LIMIT $2
    `,
    [teacherId, limit]
  );
  return r.rows;
};

export const getAdminRecentSessions = async (limit = 12): Promise<TeacherRecentSessionRow[]> => {
  const r = await pool.query<TeacherRecentSessionRow>(
    `
    SELECT
      es.id::text AS session_id,
      e.title AS exam_title,
      a.full_name AS student_name,
      a.email AS student_email,
      es.status,
      es.created_at::text AS updated_at
    FROM exam_sessions es
    JOIN exams e ON e.id = es.exam_id
    JOIN accounts a ON a.id = es.student_id
    ORDER BY COALESCE(es.submitted_at, es.created_at) DESC
    LIMIT $1
    `,
    [limit]
  );
  return r.rows;
};
