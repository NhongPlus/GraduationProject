-- Integrity events + autosave snapshot cho module thi online.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS exam_integrity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  session_id UUID NULL REFERENCES exam_sessions(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  client_at TIMESTAMPTZ NOT NULL,
  server_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exam_integrity_events_type_check'
  ) THEN
    ALTER TABLE exam_integrity_events
      ADD CONSTRAINT exam_integrity_events_type_check
      CHECK (
        event_type IN (
          'exam_opened',
          'fullscreen_enter',
          'fullscreen_exit',
          'visibility_hidden',
          'window_blur',
          'window_focus',
          'copy_attempt',
          'paste_attempt',
          'context_menu',
          'before_unload'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_integrity_exam_session
  ON exam_integrity_events (exam_id, session_id, student_id);

CREATE INDEX IF NOT EXISTS idx_integrity_event_time
  ON exam_integrity_events (event_type, server_at DESC);


CREATE TABLE IF NOT EXISTS exam_session_autosaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL,
  answers JSONB NOT NULL,
  server_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_autosave_session_unique
  ON exam_session_autosaves (session_id);

CREATE INDEX IF NOT EXISTS idx_autosave_session_saved_at
  ON exam_session_autosaves (session_id, saved_at DESC);