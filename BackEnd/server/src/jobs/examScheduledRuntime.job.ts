import pool from "~/config/db";
import { startExamRuntimeFromServer, finalizeExamRuntimeByExamId } from "~/socket/examSocket";

const TICK_MS = 30_000;

async function autoStartScheduledExams(): Promise<void> {
  const r = await pool.query<{ id: string }>(
    `
    SELECT e.id
    FROM exams e
    LEFT JOIN exam_runtime_state rs
      ON rs.exam_id = e.id AND rs.is_active = true AND rs.ends_at > NOW()
    WHERE e.opens_at IS NOT NULL
      AND e.opens_at <= NOW()
      AND (e.ends_at IS NULL OR e.ends_at > NOW())
      AND rs.exam_id IS NULL
    `
  );

  for (const row of r.rows) {
    try {
      await startExamRuntimeFromServer(row.id);
      console.log(`[exam-schedule] auto-started exam=${row.id}`);
    } catch (err) {
      console.error(`[exam-schedule] auto-start failed exam=${row.id}`, err);
    }
  }
}

async function autoEndScheduledExams(): Promise<void> {
  const r = await pool.query<{ exam_id: string }>(
    `
    SELECT rs.exam_id
    FROM exam_runtime_state rs
    INNER JOIN exams e ON e.id = rs.exam_id
    WHERE rs.is_active = true
      AND e.ends_at IS NOT NULL
      AND e.ends_at <= NOW()
    `
  );

  for (const row of r.rows) {
    try {
      await finalizeExamRuntimeByExamId(row.exam_id);
      console.log(`[exam-schedule] auto-ended exam=${row.exam_id}`);
    } catch (err) {
      console.error(`[exam-schedule] auto-end failed exam=${row.exam_id}`, err);
    }
  }
}

async function tick(): Promise<void> {
  try {
    await autoStartScheduledExams();
    await autoEndScheduledExams();
  } catch (err) {
    console.error("[exam-schedule] tick error", err);
  }
}

export function startExamScheduleScheduler(): void {
  void tick();
  setInterval(() => {
    void tick();
  }, TICK_MS);
  console.log(`[exam-schedule] scheduler every ${TICK_MS / 1000}s`);
}
