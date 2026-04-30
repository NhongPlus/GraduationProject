-- Dong bo check constraint cua exam_sessions.status voi backend hien tai.
-- Backend dang dung: active | submitted | expired.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'exam_sessions_status_check'
  ) THEN
    ALTER TABLE exam_sessions DROP CONSTRAINT exam_sessions_status_check;
  END IF;

  UPDATE exam_sessions
  SET status = CASE
    WHEN LOWER(status) IN ('active', 'started', 'running', 'in_progress', 'pending') THEN 'active'
    WHEN LOWER(status) IN ('submitted', 'complete', 'completed', 'done') THEN 'submitted'
    WHEN LOWER(status) IN ('expired', 'timeout', 'timed_out', 'cancelled', 'canceled') THEN 'expired'
    ELSE 'expired'
  END;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'exam_sessions_status_check'
  ) THEN
    ALTER TABLE exam_sessions
      ADD CONSTRAINT exam_sessions_status_check
      CHECK (status IN ('active', 'submitted', 'expired'));
  END IF;
END $$;
