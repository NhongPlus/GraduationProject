ALTER TABLE questions ADD COLUMN IF NOT EXISTS display_order INTEGER;

WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY exam_id ORDER BY created_at ASC, id ASC) AS rn
  FROM questions
  WHERE display_order IS NULL
)
UPDATE questions q
SET display_order = ordered.rn
FROM ordered
WHERE q.id = ordered.id;

ALTER TABLE questions ALTER COLUMN display_order SET DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_questions_exam_display_order
  ON questions (exam_id, display_order, created_at);
