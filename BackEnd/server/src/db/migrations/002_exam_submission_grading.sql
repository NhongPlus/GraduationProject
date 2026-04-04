-- Thi online: question_type (mcq | essay), lưu điểm & chấm tự luận trên exam_sessions.

ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'mcq';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'questions_question_type_check'
  ) THEN
    ALTER TABLE questions ADD CONSTRAINT questions_question_type_check
      CHECK (question_type IN ('mcq', 'essay'));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'questions'
      AND column_name = 'correct_answer' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE questions ALTER COLUMN correct_answer DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'questions'
      AND column_name = 'options' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE questions ALTER COLUMN options DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS score NUMERIC(12, 2);
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS max_points NUMERIC(12, 2);
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS student_answers JSONB;
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS graded_details JSONB;
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS grading_status TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exam_sessions_grading_status_check'
  ) THEN
    ALTER TABLE exam_sessions ADD CONSTRAINT exam_sessions_grading_status_check
      CHECK (
        grading_status IS NULL
        OR grading_status IN ('pending_manual', 'complete')
      );
  END IF;
END $$;
