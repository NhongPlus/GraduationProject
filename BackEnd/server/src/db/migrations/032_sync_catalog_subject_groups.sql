-- Đồng bộ nhóm môn DB với subject_groups.json (một mã nhóm thống nhất cho picker + admin catalog)
INSERT INTO subject_groups (program_id, code, name, sort_order)
SELECT p.id, v.code, v.name, v.ord
FROM programs p
CROSS JOIN (VALUES
    ('pe', 'Nhóm thể chất', 1),
    ('defense', 'Nhóm quốc phòng', 2),
    ('english', 'Nhóm tiếng Anh', 3),
    ('ai_iot', 'Nhóm học máy & IoT', 4),
    ('philosophy', 'Nhóm môn triết học', 5),
    ('software', 'Nhóm phần mềm', 6),
    ('bigdata', 'Nhóm BigData', 7),
    ('network', 'Nhóm Network', 8),
    ('internship', 'Nhóm thực tập', 9),
    ('security', 'Nhóm security', 10),
    ('soft_skills', 'Nhóm kỹ năng mềm', 11),
    ('math', 'Nhóm đại số', 12)
) AS v(code, name, ord)
WHERE p.code = 'CNTT'
ON CONFLICT (program_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;

-- Gán môn CNTT vào nhóm DB theo sub_category / catalog (ưu tiên mã catalog mới)
UPDATE subjects s
SET subject_group_id = sg.id
FROM subject_groups sg
JOIN programs p ON p.id = sg.program_id AND p.code = 'CNTT'
WHERE s.program_id = p.id
  AND s.sub_category IS NOT NULL
  AND sg.code = s.sub_category;
