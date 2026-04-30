import pool from "~/config/db";

export type IntegrityEventType =
  | "exam_opened"
  | "fullscreen_enter"
  | "fullscreen_exit"
  | "fullscreen_error"
  | "visibility_hidden"
  | "window_blur"
  | "window_focus"
  | "copy_attempt"
  | "paste_attempt"
  | "context_menu"
  | "before_unload";

export interface IntegrityEventInput {
  type: IntegrityEventType;
  at: string;
  details?: Record<string, unknown>;
}

export const insertIntegrityEvents = async (
  examId: string,
  sessionId: string,
  studentId: string,
  events: IntegrityEventInput[]
): Promise<number> => {
  if (!events.length) return 0;

  const values: Array<string | null> = [];
  const placeholders = events
    .map((event, idx) => {
      const base = idx * 6;
      values.push(
        examId,
        sessionId,
        studentId,
        event.type,
        event.at,
        event.details ? JSON.stringify(event.details) : null
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}::jsonb)`;
    })
    .join(",");

  const result = await pool.query(
    `INSERT INTO exam_integrity_events
      (exam_id, session_id, student_id, event_type, client_at, details)
     VALUES ${placeholders}`,
    values
  );

  return result.rowCount ?? 0;
};