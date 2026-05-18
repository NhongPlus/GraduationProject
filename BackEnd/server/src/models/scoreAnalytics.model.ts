import pool from "~/config/db";

export interface ScoreDistributionBucket {
  exam_id: string;
  exam_title: string;
  total_students: number;
  avg_score: number | null;
  max_score: number | null;
  min_score: number | null;
  buckets: Array<{
    range_label: string;
    min_pct: number;
    max_pct: number;
    count: number;
  }>;
}

export interface ScoreDistributionBySubject {
  subject_id: string;
  subject_name: string;
  total_students: number;
  avg_score: number | null;
  buckets: Array<{
    range_label: string;
    min_pct: number;
    max_pct: number;
    count: number;
  }>;
}

export interface ScoreDistributionByAdminClass {
  admin_class_id: string | null;
  class_label: string;
  total_students: number;
  avg_score: number | null;
  buckets: Array<{
    range_label: string;
    min_pct: number;
    max_pct: number;
    count: number;
  }>;
}

const DEFAULT_BUCKETS = [
  { range_label: "0-20%", min_pct: 0, max_pct: 20 },
  { range_label: "20-40%", min_pct: 20, max_pct: 40 },
  { range_label: "40-60%", min_pct: 40, max_pct: 60 },
  { range_label: "60-80%", min_pct: 60, max_pct: 80 },
  { range_label: "80-100%", min_pct: 80, max_pct: 100 },
];

function buildBuckets(rows: Array<{ score_pct: number | null }>) {
  const counts = new Array(DEFAULT_BUCKETS.length).fill(0);
  let total = 0;
  let sum = 0;
  let max: number | null = null;
  let min: number | null = null;

  for (const row of rows) {
    if (row.score_pct == null) continue;
    total++;
    sum += row.score_pct;
    if (max == null || row.score_pct > max) max = row.score_pct;
    if (min == null || row.score_pct < min) min = row.score_pct;
    let placed = false;
    for (let i = 0; i < DEFAULT_BUCKETS.length; i++) {
      const b = DEFAULT_BUCKETS[i];
      const isLast = i === DEFAULT_BUCKETS.length - 1;
      if (
        row.score_pct >= b.min_pct
        && (isLast ? row.score_pct <= b.max_pct : row.score_pct < b.max_pct)
      ) {
        counts[i]++;
        placed = true;
        break;
      }
    }
    if (!placed && row.score_pct >= 100) counts[DEFAULT_BUCKETS.length - 1]++;
  }

  return {
    buckets: DEFAULT_BUCKETS.map((b, i) => ({ ...b, count: counts[i] })),
    avg_score: total > 0 ? sum / total : null,
    max_score: max,
    min_score: min,
  };
}

export const getScoreDistributionByExam = async (
  examId: string
): Promise<ScoreDistributionBucket | null> => {
  const examRow = await pool.query(
    `SELECT e.id, e.title FROM exams e WHERE e.id = $1`,
    [examId]
  );
  if (!examRow.rows[0]) return null;

  const rows = await pool.query<{ score_pct: number | null }>(
    `SELECT
       CASE WHEN max_points > 0 AND score IS NOT NULL
         THEN (score / max_points) * 100
         ELSE NULL
       END AS score_pct
     FROM exam_sessions
     WHERE exam_id = $1 AND status = 'submitted'`,
    [examId]
  );

  const stats = buildBuckets(rows.rows);
  return {
    exam_id: examId,
    exam_title: examRow.rows[0].title,
    total_students: rows.rows.filter((r) => r.score_pct != null).length,
    ...stats,
  };
};

export const getScoreDistributionBySubject = async (): Promise<
  ScoreDistributionBySubject[]
> => {
  const rows = await pool.query<{
    subject_id: string;
    subject_name: string;
    score_pct: number | null;
  }>(
    `SELECT
        s.id AS subject_id,
        s.name AS subject_name,
        CASE WHEN es.max_points > 0 AND es.score IS NOT NULL
          THEN (es.score / es.max_points) * 100
          ELSE NULL
        END AS score_pct
     FROM exam_sessions es
     JOIN exams e ON e.id = es.exam_id
     LEFT JOIN classes c ON c.id = e.class_id
     LEFT JOIN subjects s ON s.id = COALESCE(e.subject_id, c.subject_id)
     WHERE es.status = 'submitted'
       AND es.score IS NOT NULL
       AND es.max_points > 0
     ORDER BY s.name`
  );

  const bySubject = new Map<string, { name: string; scores: number[] }>();
  for (const row of rows.rows) {
    if (!bySubject.has(row.subject_id)) {
      bySubject.set(row.subject_id, { name: row.subject_name, scores: [] });
    }
    if (row.score_pct != null) {
      bySubject.get(row.subject_id)!.scores.push(row.score_pct);
    }
  }

  return Array.from(bySubject.entries()).map(([subject_id, { name, scores }]) => {
    const stats = buildBuckets(scores.map((score_pct) => ({ score_pct })));
    return {
      subject_id,
      subject_name: name,
      total_students: scores.length,
      avg_score: stats.avg_score,
      buckets: stats.buckets,
    };
  });
};

export const getScoreDistributionByAdminClass = async (): Promise<
  ScoreDistributionByAdminClass[]
> => {
  const rows = await pool.query<{
    admin_class_id: string | null;
    class_label: string;
    score_pct: number | null;
  }>(
    `SELECT
        e.admin_class_id,
        COALESCE(ac.display_name, 'Chưa gán lớp') AS class_label,
        CASE WHEN es.max_points > 0 AND es.score IS NOT NULL
          THEN (es.score / es.max_points) * 100
          ELSE NULL
        END AS score_pct
     FROM exam_sessions es
     JOIN exams e ON e.id = es.exam_id
     LEFT JOIN admin_classes ac ON ac.id = e.admin_class_id
     WHERE es.status = 'submitted'
       AND es.score IS NOT NULL
       AND es.max_points > 0
     ORDER BY class_label`
  );

  const byClass = new Map<string, { id: string | null; label: string; scores: number[] }>();
  for (const row of rows.rows) {
    const key = row.admin_class_id ?? `label:${row.class_label}`;
    if (!byClass.has(key)) {
      byClass.set(key, {
        id: row.admin_class_id,
        label: row.class_label,
        scores: [],
      });
    }
    if (row.score_pct != null) {
      byClass.get(key)!.scores.push(row.score_pct);
    }
  }

  return Array.from(byClass.values()).map(({ id, label, scores }) => {
    const stats = buildBuckets(scores.map((score_pct) => ({ score_pct })));
    return {
      admin_class_id: id,
      class_label: label,
      total_students: scores.length,
      avg_score: stats.avg_score,
      buckets: stats.buckets,
    };
  });
};
