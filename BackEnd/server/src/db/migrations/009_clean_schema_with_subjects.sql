-- =============================================================================
-- CLEAN DATABASE — CNTT Online Exam System
-- Chạy toàn bộ script này trên pgAdmin (Neon PostgreSQL)
-- Keep: accounts (login), subjects (52 môn CNTT16-02)
-- =============================================================================

-- 1. DROP tất cả bảng theo thứ tự FK → PK
DROP TABLE IF EXISTS exam_session_autosaves      CASCADE;
DROP TABLE IF EXISTS exam_integrity_events        CASCADE;
DROP TABLE IF EXISTS exam_deadline_notifications  CASCADE;
DROP TABLE IF EXISTS exams                        CASCADE;
DROP TABLE IF EXISTS questions                   CASCADE;
DROP TABLE IF EXISTS exam_sessions               CASCADE;
DROP TABLE IF EXISTS enrollments                 CASCADE;
DROP TABLE IF EXISTS classes                      CASCADE;
DROP TABLE IF EXISTS subjects                    CASCADE;
DROP TABLE IF EXISTS user_sessions               CASCADE;
DROP TABLE IF EXISTS accounts                    CASCADE;
DROP EXTENSION IF EXISTS "pgcrypto";

-- =============================================================================
-- 2. ACCOUNTS (GIỮ NGUYÊN — để login)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    full_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_email     ON accounts(email);
CREATE INDEX IF NOT EXISTS idx_accounts_username  ON accounts(username);
CREATE INDEX IF NOT EXISTS idx_accounts_role       ON accounts(role);

-- =============================================================================
-- 3. SUBJECTS — Bảng môn học (CNTT 16-02, 52 môn)
-- =============================================================================
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT,
    credits DECIMAL(4,1) NOT NULL DEFAULT 0,
    semester INTEGER NOT NULL DEFAULT 0,
    category TEXT DEFAULT 'general',
    prerequisites UUID[],
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subjects_name      ON subjects(name);
CREATE INDEX IF NOT EXISTS idx_subjects_semester  ON subjects(semester);
CREATE INDEX IF NOT EXISTS idx_subjects_category  ON subjects(category);

-- =============================================================================
-- 4. CLASSES — Lớp học (liên kết subject → teacher)
-- =============================================================================
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    teacher_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    semester TEXT NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classes_subject ON classes(subject_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);

-- =============================================================================
-- 5. ENROLLMENTS — Sinh viên đăng ký lớp
-- =============================================================================
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_class  ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);

-- =============================================================================
-- 6. EXAMS
-- =============================================================================
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    duration_min INTEGER NOT NULL,
    closes_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exams_class      ON exams(class_id);
CREATE INDEX IF NOT EXISTS idx_exams_created_by ON exams(created_by);
CREATE INDEX IF NOT EXISTS idx_exams_closes_at  ON exams(closes_at);

-- =============================================================================
-- 7. QUESTIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'essay')),
    options JSONB,
    correct_answer JSONB,
    points DECIMAL(4,1) NOT NULL DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_exam ON questions(exam_id);

-- =============================================================================
-- 8. EXAM SESSIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS exam_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'submitted', 'expired')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    score DECIMAL(6,2),
    max_points DECIMAL(6,2),
    student_answers JSONB,
    graded_details JSONB,
    grading_status TEXT DEFAULT 'pending_manual' CHECK (grading_status IN ('pending_manual', 'complete')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_exam    ON exam_sessions(exam_id);
CREATE INDEX IF NOT EXISTS idx_sessions_student ON exam_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status  ON exam_sessions(status);

-- =============================================================================
-- 9. EXAM AUTOSAVES
-- =============================================================================
CREATE TABLE IF NOT EXISTS exam_session_autosaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    answers JSONB NOT NULL,
    saved_at TIMESTAMPTZ NOT NULL,
    server_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autosaves_session ON exam_session_autosaves(session_id);
CREATE INDEX IF NOT EXISTS idx_autosaves_exam    ON exam_session_autosaves(exam_id);

-- =============================================================================
-- 10. EXAM INTEGRITY EVENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS exam_integrity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_at TIMESTAMPTZ NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrity_exam    ON exam_integrity_events(exam_id);
CREATE INDEX IF NOT EXISTS idx_integrity_session ON exam_integrity_events(session_id);

-- =============================================================================
-- 11. EXAM DEADLINE NOTIFICATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS exam_deadline_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    sent_at TIMESTAMPTZ NOT NULL,
    notification_type TEXT NOT NULL DEFAULT 'reminder',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_exam    ON exam_deadline_notifications(exam_id);
CREATE INDEX IF NOT EXISTS idx_notif_student ON exam_deadline_notifications(student_id);

-- =============================================================================
-- 12. USER SESSIONS (multi-device)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    device_info TEXT,
    token_hash VARCHAR(64) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash  ON user_sessions(token_hash);

-- =============================================================================
-- 13. INSERT 52 MÔN HỌC CNTT 16-02
-- =============================================================================
INSERT INTO subjects (name, code, credits, semester, category) VALUES
-- Kỳ -1 (Đại cương)
('Lý luận và phương pháp Giáo dục thể chất 1', 'PE001', 1.0, -1, 'general'),
('Võ (Cơ bản)', 'PE002', 1.0, -1, 'general'),
('Yoga (Cơ bản)', 'PE003', 1.0, -1, 'general'),
('Zumba(Cơ bản)', 'PE004', 1.0, -1, 'general'),
('Zumba(Nâng cao)', 'PE005', 1.0, -1, 'general'),
('Đại số tuyến tính, tối ưu', 'MATH001', 2.0, -1, 'math'),
('Nhập môn công nghệ thông tin', 'CS001', 3.0, -1, 'general'),
('Thực tập CNTT1: Hệ thống máy tính', 'CS101', 4.0, -1, 'general'),
('Triết học Mác - Lênin', 'PHI001', 3.0, -1, 'general'),
('Kinh tế chính trị Mác - Lênin', 'PHI002', 2.0, -1, 'general'),
('Xác suất thống kê và phân tích dữ liệu', 'STAT001', 4.0, -1, 'general'),
('Hệ thống thông tin địa lý', 'GIS001', 2.0, -1, 'general'),
('Thực tập CNTT2: Thiết kế web', 'CS102', 4.0, -1, 'general'),
('Cấu trúc dữ liệu và giải thuật', 'CS201', 3.0, -1, 'general'),
('Lập trình hướng đối tượng', 'CS202', 3.0, -1, 'general'),
('Thực tập CNTT3: Thiết kế, lập trình Front-End', 'CS103', 4.0, -1, 'general'),
('Giáo dục quốc phòng P1', 'ND001', 3.0, -1, 'general'),
('Giáo dục quốc phòng P2', 'ND002', 2.0, -1, 'general'),
('Giáo dục quốc phòng P3', 'ND003', 2.0, -1, 'general'),
('Giáo dục quốc phòng P4', 'ND004', 4.0, -1, 'general'),
('Lý thuyết, thiết kế cơ sở dữ liệu', 'DB001', 3.0, -1, 'general'),
('Chủ nghĩa xã hội khoa học', 'PHI003', 2.0, -1, 'general'),
('Phân tích, thiết kế hệ thống thông tin', 'SA001', 3.0, -1, 'general'),
('Tư tưởng Hồ Chí Minh', 'PHI004', 2.0, -1, 'general'),
('Thực tập CNTT5: Triển khai ứng dụng AI, IoT', 'CS105', 4.0, -1, 'general'),
('Lịch sử Đảng Cộng sản Việt Nam', 'HIS001', 2.0, -1, 'general'),
('Thực tập CNTT6: Cài đặt, cấu hình máy chủ, mạng', 'CS106', 4.0, -1, 'general'),
('An toàn, bảo mật thông tin', 'SEC001', 2.0, -1, 'general'),
('Ứng dụng Công nghệ thông tin trong doanh nghiệp', 'IT001', 3.0, -1, 'general'),
-- Kỳ 0
('Thực tập tốt nghiệp', 'INT001', 4.0, 0, 'general'),
-- Kỳ 1
('Pháp luật đại cương', 'LAW001', 3.0, 1, 'general'),
('Kỹ năng mềm cơ bản', 'SKL001', 2.0, 1, 'general'),
('Lập trình cơ bản', 'CS111', 3.0, 1, 'programming'),
('Tiếng Anh P1', 'ENG101', 4.0, 1, 'english'),
('Toán giải tích', 'MATH101', 3.0, 1, 'math'),
-- Kỳ 2
('Tiếng Anh P2', 'ENG102', 4.0, 2, 'english'),
('Toán rời rạc', 'MATH201', 3.0, 2, 'math'),
-- Kỳ 3
('Mạng máy tính', 'NET301', 2.0, 3, 'network'),
-- Kỳ 4
('Kỹ năng mềm nâng cao', 'SKL002', 3.0, 4, 'general'),
('Tiếng Anh P3', 'ENG103', 4.0, 4, 'english'),
('Lập trình IoT', 'CS331', 2.0, 4, 'programming'),
('Trí tuệ nhân tạo', 'AI401', 2.0, 4, 'ai_ml'),
-- Kỳ 5
('Tiếng Anh P4', 'ENG104', 3.0, 5, 'english'),
('Học máy', 'ML501', 2.0, 5, 'ai_ml'),
('Công nghệ dữ liệu', 'DT501', 2.0, 5, 'ai_ml'),
-- Kỳ 6
('Công nghệ phần mềm', 'SE601', 3.0, 6, 'software_eng'),
('Lập trình mobile', 'CS621', 3.0, 6, 'software_eng'),
('Dữ liệu lớn', 'BD601', 2.0, 6, 'ai_ml'),
-- Kỳ 7
('Tiếng Anh P5', 'ENG105', 2.0, 7, 'english'),
-- Kỳ 8
('Chuyển đổi số', 'DS801', 2.0, 8, 'general'),
('Lập trình mạng', 'NET801', 3.0, 8, 'network'),
('Kiểm thử phần mềm', 'SE802', 2.0, 8, 'software_eng')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- 14. INSERT SEED ACCOUNTS
-- Password tất cả: Test@123
-- =============================================================================
INSERT INTO accounts (email, username, hashed_password, role, full_name) VALUES
('admin01@system.local', 'admin01', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJah0mFSeN3cGpJLHLDvE1Ly', 'admin', 'Quản trị viên 01'),
('teacher01@system.local', 'teacher01', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJah0mFSeN3cGpJLHLDvE1Ly', 'teacher', 'Giảng viên 01'),
('student01@system.local', 'student01', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJah0mFSeN3cGpJLHLDvE1Ly', 'student', 'Sinh viên 01')
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- 15. MIGRATION TRACKING
-- =============================================================================
CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO _migrations (name) VALUES ('009_clean_schema_with_subjects')
ON CONFLICT (name) DO NOTHING;
