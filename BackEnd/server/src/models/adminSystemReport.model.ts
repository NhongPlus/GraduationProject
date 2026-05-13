import pool from "~/config/db";

export interface AdminSystemReport {
  overview: {
    total_accounts: number;
    total_students: number;
    total_teachers: number;
    total_exams: number;
    total_sessions: number;
    total_classes: number;
  };
  session_stats: {
    total_submitted: number;
    total_active: number;
    total_expired: number;
    completion_rate: number;      // submitted / total
    pass_rate: number;            // score >= 60% / submitted
    avg_score: number | null;
  };
  integrity_stats: {
    violations_last_24h: number;
    top_violation_type: string | null;
    flagged_sessions: number;
  };
  pending_grading: number;
  recent_exams: Array<{
    exam_id: string;
    title: string;
    active_sessions: number;
    submitted_today: number;
  }>;
}

export const getAdminSystemReport = async (): Promise<AdminSystemReport> => {
  // Overview
  const overviewRows = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM accounts) AS total_accounts,
      (SELECT COUNT(*)::int FROM accounts WHERE role = 'student') AS total_students,
      (SELECT COUNT(*)::int FROM accounts WHERE role = 'teacher') AS total_teachers,
      (SELECT COUNT(*)::int FROM exams) AS total_exams,
      (SELECT COUNT(*)::int FROM exam_sessions) AS total_sessions,
      (SELECT COUNT(*)::int FROM classes) AS total_classes
  `);

  // Session stats
  const sessionRows = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'submitted')::int AS total_submitted,
      COUNT(*) FILTER (WHERE status = 'active')::int AS total_active,
      COUNT(*) FILTER (WHERE status = 'expired')::int AS total_expired,
      ROUND(
        COUNT(*) FILTER (WHERE status = 'submitted')::numeric /
        NULLIF(COUNT(*)::numeric, 0) * 100, 1
      ) AS completion_rate,
      ROUND(
        COUNT(*) FILTER (
          WHERE status = 'submitted'
            AND max_points > 0
            AND score IS NOT NULL
            AND (score / max_points * 100) >= 60
        )::numeric /
        NULLIF(COUNT(*) FILTER (WHERE status = 'submitted')::numeric, 0) * 100, 1
      ) AS pass_rate,
      AVG(
        CASE WHEN status = 'submitted' AND max_points > 0 AND score IS NOT NULL
          THEN (score / max_points * 100)
          ELSE NULL
        END
      )::float AS avg_score
    FROM exam_sessions
  `);

  // Integrity stats (last 24h)
  const integrityRows = await pool.query(`
    SELECT
      COUNT(*)::int AS violations_last_24h,
      MODE() WITHIN GROUP (ORDER BY event_type) AS top_violation_type
    FROM exam_integrity_events
    WHERE created_at > NOW() - INTERVAL '24 hours'
  `);

  // Pending grading
  const gradingRows = await pool.query(`
    SELECT COUNT(*)::int AS pending_grading
    FROM exam_sessions
    WHERE grading_status = 'pending_manual'
  `);

  // Recent exams with active sessions
  const recentExamRows = await pool.query(`
    SELECT
      e.id AS exam_id,
      e.title,
      COUNT(es.id) FILTER (WHERE es.status = 'active') AS active_sessions,
      COUNT(es.id) FILTER (
        WHERE es.status = 'submitted'
          AND es.submitted_at > NOW() - INTERVAL '24 hours'
      ) AS submitted_today
    FROM exams e
    LEFT JOIN exam_sessions es ON es.exam_id = e.id
    GROUP BY e.id, e.title
    ORDER BY e.created_at DESC
    LIMIT 10
  `);

  const sr = sessionRows.rows[0];
  const ir = integrityRows.rows[0];

  return {
    overview: overviewRows.rows[0] ?? {
      total_accounts: 0, total_students: 0, total_teachers: 0,
      total_exams: 0, total_sessions: 0, total_classes: 0,
    },
    session_stats: {
      total_submitted: sr.total_submitted ?? 0,
      total_active: sr.total_active ?? 0,
      total_expired: sr.total_expired ?? 0,
      completion_rate: Number(sr.completion_rate ?? 0),
      pass_rate: Number(sr.pass_rate ?? 0),
      avg_score: sr.avg_score ?? null,
    },
    integrity_stats: {
      violations_last_24h: ir?.violations_last_24h ?? 0,
      top_violation_type: ir?.top_violation_type ?? null,
      flagged_sessions: 0,
    },
    pending_grading: gradingRows.rows[0]?.pending_grading ?? 0,
    recent_exams: recentExamRows.rows.map((r) => ({
      exam_id: r.exam_id,
      title: r.title,
      active_sessions: Number(r.active_sessions ?? 0),
      submitted_today: Number(r.submitted_today ?? 0),
    })),
  };
};
