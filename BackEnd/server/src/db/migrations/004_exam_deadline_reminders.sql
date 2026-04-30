-- Hạn chót bắt đầu làm bài (closes_at) + log nhắc email (24h / 1h trước hạn).

ALTER TABLE exams ADD COLUMN IF NOT EXISTS closes_at TIMESTAMPTZ NULL;

CREATE TABLE IF NOT EXISTS exam_deadline_notifications (
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('24h', '1h')),
  notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (exam_id, kind)
);
