-- Nhóm môn (theo chuyên ngành) + phân quyền giảng viên theo ngành
CREATE TABLE IF NOT EXISTS subject_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (program_id, code)
);

CREATE INDEX IF NOT EXISTS idx_subject_groups_program ON subject_groups(program_id);

CREATE TABLE IF NOT EXISTS program_teachers (
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (program_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_program_teachers_teacher ON program_teachers(teacher_id);

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS subject_group_id UUID REFERENCES subject_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_subjects_subject_group ON subjects(subject_group_id);

-- Seed nhóm môn mặc định cho CNTT (nếu chưa có)
INSERT INTO subject_groups (program_id, code, name, sort_order)
SELECT p.id, v.code, v.name, v.ord
FROM programs p
CROSS JOIN (VALUES
    ('math', 'Đại số / Toán', 1),
    ('english', 'Tiếng Anh', 2),
    ('programming', 'Lập trình', 3),
    ('software_eng', 'Phần mềm', 4),
    ('ai', 'AI / ML', 5),
    ('network', 'Mạng', 6),
    ('soft_skills', 'Kỹ năng mềm', 7),
    ('national_defense', 'Quốc phòng', 8),
    ('internship', 'Thực tập', 9)
) AS v(code, name, ord)
WHERE p.code = 'CNTT'
ON CONFLICT (program_id, code) DO NOTHING;

-- Gán môn CNTT vào nhóm theo sub_category cũ
UPDATE subjects s
SET subject_group_id = sg.id,
    sub_category = COALESCE(s.sub_category, sg.code)
FROM subject_groups sg
JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTT'
WHERE s.program_id = p.id
  AND s.subject_group_id IS NULL
  AND s.sub_category IS NOT NULL
  AND sg.code = s.sub_category;
