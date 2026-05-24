# -*- coding: utf-8 -*-
"""Build SECTION_6 markdown from key table definitions."""

def build_section_6() -> str:
    tables = [
        table_accounts(),
        table_user_sessions(),
        table_programs(),
        table_subject_groups(),
        table_program_teachers(),
        table_program_subject_groups(),
        table_program_subjects(),
        table_subjects(),
        table_admin_classes(),
        table_classes(),
        table_enrollments(),
        table_exams(),
        table_questions(),
        table_question_bank(),
        table_exam_versions(),
        table_exam_sessions(),
        table_exam_runtime_state(),
        table_exam_session_autosaves(),
        table_exam_integrity_events(),
        table_exam_proctor_presence(),
        table_exam_proctor_logs(),
        table_exam_deadline_notifications(),
        table_exam_shares(),
        table_exam_collaborators(),
        table_grading_assignments(),
        table_student_prediction_cache(),
        table_password_reset_requests(),
        table_password_reset_tokens(),
        table_audit_logs(),
        table_user_notifications(),
        table_migrations(),
    ]
    header = """---

## 6. Thiết kế Cơ sở dữ liệu vật lý

**Hệ quản trị:** PostgreSQL (Neon serverless trên cloud; local cho dev).

**Migration:** `BackEnd/server/src/db/migrations/` — 42 file SQL; bảng theo dõi `_migrations`.

**Ghi chú:** Không dùng MySQL/Sequelize. Bảng `grades` và `assignments` **không tồn tại** trong migration — điểm nằm trên `exam_sessions`. Bảng `users` (migration `001`) có thể còn legacy; hệ thống hiện tại dùng `accounts`.

### 6.1. Ma trận khóa ngoại (Bảng 3.6 — báo cáo, đối chiếu thực tế)

| Bảng con | Cột FK | Bảng cha | Cardinality |
|----------|--------|----------|-------------|
| `accounts` | `admin_class_id` | `admin_classes` | N : 1 |
| `admin_classes` | `manager_teacher_id` | `accounts` | N : 1 |
| `admin_classes` | `program_id` | `programs` | N : 1 |
| `classes` | `subject_id` | `subjects` | N : 1 |
| `classes` | `teacher_id` | `accounts` | N : 1 |
| `enrollments` | `class_id` | `classes` | N : 1 |
| `enrollments` | `student_id` | `accounts` | N : 1 |
| `exams` | `class_id` | `classes` | N : 1 |
| `exams` | `admin_class_id` | `admin_classes` | N : 1 |
| `exams` | `subject_id` | `subjects` | N : 1 |
| `exams` | `created_by` | `accounts` | N : 1 |
| `questions` | `exam_id` | `exams` | N : 1 |
| `questions` | `question_bank_id` | `question_bank` | N : 1 |
| `exam_sessions` | `exam_id` | `exams` | N : 1 |
| `exam_sessions` | `student_id` | `accounts` | N : 1 |
| `exam_sessions` | `version_id` | `exam_versions` | N : 1 |
| `exam_session_autosaves` | `session_id` | `exam_sessions` | 1 : 1 (UNIQUE) |
| `exam_integrity_events` | `session_id` | `exam_sessions` | N : 1 |
| `exam_versions` | `exam_id` | `exams` | N : 1 |
| `exam_runtime_state` | `exam_id` | `exams` | 1 : 1 |
| `grading_assignments` | `exam_session_id` | `exam_sessions` | N : 1 |
| `user_sessions` | `user_id` | `accounts` | N : 1 |
| `user_notifications` | `user_id` | `accounts` | N : 1 |

### 6.2. Đặc tả từng bảng

"""
    return header + "\n\n".join(tables)


def tbl(name: str, rows: list[tuple]) -> str:
    lines = [
        f"#### Bảng `{name}`",
        "",
        "| Tên trường | Kiểu dữ liệu | Ràng buộc | Khóa | Giải thích |",
        "|------------|--------------|-----------|------|------------|",
    ]
    for r in rows:
        lines.append(f"| `{r[0]}` | {r[1]} | {r[2]} | {r[3]} | {r[4]} |")
    return "\n".join(lines)


def table_accounts():
    return tbl("accounts", [
        ("id", "UUID", "NOT NULL, DEFAULT gen_random_uuid()", "PK", "Định danh tài khoản"),
        ("email", "TEXT", "NOT NULL, UNIQUE", "", "Email đăng nhập"),
        ("username", "TEXT", "NOT NULL, UNIQUE", "", "Tên đăng nhập"),
        ("hashed_password", "TEXT", "NOT NULL", "", "Mật khẩu bcrypt (cost 12)"),
        ("password_plain", "TEXT", "nullable", "", "MK hiển thị cho GV quản lý (không dùng auth)"),
        ("role", "TEXT", "NOT NULL, CHECK admin/teacher/student", "", "Vai trò RBAC"),
        ("full_name", "TEXT", "nullable", "", "Họ tên"),
        ("is_active", "BOOLEAN", "NOT NULL, DEFAULT true", "", "Tài khoản hoạt động"),
        ("admin_class_id", "UUID", "FK → admin_classes(id) ON DELETE SET NULL", "FK", "Lớp HC (sinh viên)"),
        ("first_login", "BOOLEAN", "NOT NULL, DEFAULT false", "", "Bắt buộc đổi MK lần đầu"),
        ("token_version", "INTEGER", "NOT NULL, DEFAULT 0", "", "Vô hiệu hóa JWT cũ khi đổi MK"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL, DEFAULT NOW()", "", "Thời điểm tạo"),
        ("updated_at", "TIMESTAMPTZ", "NOT NULL, DEFAULT NOW()", "", "Thời điểm cập nhật"),
    ])


def table_user_sessions():
    return tbl("user_sessions", [
        ("id", "UUID", "PK", "PK", "ID phiên đăng nhập"),
        ("user_id", "UUID", "NOT NULL, FK accounts CASCADE", "FK", "Người dùng"),
        ("device_id", "VARCHAR(255)", "NOT NULL", "", "ID thiết bị"),
        ("device_info", "TEXT", "nullable", "", "UA / thiết bị"),
        ("token_hash", "VARCHAR(64)", "NOT NULL", "", "Hash JWT"),
        ("is_active", "BOOLEAN", "NOT NULL, DEFAULT true", "", "Phiên còn hiệu lực"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "", "Tạo phiên"),
        ("expires_at", "TIMESTAMPTZ", "NOT NULL", "", "Hết hạn"),
        ("last_active_at", "TIMESTAMPTZ", "NOT NULL", "", "Hoạt động gần nhất"),
    ]) + "\n\n**UNIQUE:** `(user_id)` WHERE `is_active = true` — một thiết bị một session."


def table_programs():
    return tbl("programs", [
        ("id", "UUID", "PK", "PK", "ID chuyên ngành"),
        ("code", "TEXT", "NOT NULL, UNIQUE", "", "Mã ngành (CNTT)"),
        ("name", "TEXT", "NOT NULL", "", "Tên ngành"),
        ("description", "TEXT", "nullable", "", "Mô tả"),
        ("is_active", "BOOLEAN", "NOT NULL, DEFAULT true", "", "Còn dùng"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "", "Ngày tạo"),
    ])


def table_subject_groups():
    return tbl("subject_groups", [
        ("id", "UUID", "PK", "PK", "ID nhóm môn"),
        ("program_id", "UUID", "FK programs CASCADE, nullable", "FK", "Ngành (nullable sau kho môn)"),
        ("code", "TEXT", "NOT NULL", "", "Mã nhóm (math, english…)"),
        ("name", "TEXT", "NOT NULL", "", "Tên nhóm"),
        ("description", "TEXT", "nullable", "", "Mô tả"),
        ("sort_order", "INT", "NOT NULL, DEFAULT 0", "", "Thứ tự hiển thị"),
        ("is_active", "BOOLEAN", "NOT NULL, DEFAULT true", "", "Còn dùng"),
        ("group_scope", "TEXT", "CHECK base/shared/catalog", "", "Phạm vi nhóm"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "", "Ngày tạo"),
    ])


def table_program_teachers():
    return tbl("program_teachers", [
        ("program_id", "UUID", "PK composite, FK programs", "PK, FK", "Chuyên ngành"),
        ("teacher_id", "UUID", "PK composite, FK accounts", "PK, FK", "GV được phân quyền"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "", "Ngày gán"),
    ])


def table_program_subject_groups():
    return tbl("program_subject_groups", [
        ("program_id", "UUID", "PK composite", "PK, FK", "Chuyên ngành"),
        ("subject_group_id", "UUID", "PK composite", "PK, FK", "Nhóm môn"),
        ("sort_order", "INT", "NOT NULL, DEFAULT 0", "", "Thứ tự"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "", "Ngày liên kết"),
    ])


def table_program_subjects():
    return tbl("program_subjects", [
        ("program_id", "UUID", "PK composite", "PK, FK", "Chuyên ngành"),
        ("subject_id", "UUID", "PK composite", "PK, FK", "Môn học"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "", "Ngày gán"),
    ])


def table_subjects():
    return tbl("subjects", [
        ("id", "UUID", "PK", "PK", "ID môn"),
        ("name", "TEXT", "NOT NULL", "", "Tên môn"),
        ("code", "TEXT", "nullable", "", "Mã môn"),
        ("credits", "DECIMAL(4,1)", "NOT NULL, DEFAULT 0", "", "Tín chỉ"),
        ("semester", "INTEGER", "NOT NULL, DEFAULT 0", "", "Học kỳ CTĐT"),
        ("category", "TEXT", "DEFAULT general", "", "Khối lớn (6 nhóm CNTT)"),
        ("sub_category", "TEXT", "nullable", "", "Khối nhỏ"),
        ("prerequisites", "UUID[]", "nullable", "", "Môn tiên quyết"),
        ("program_id", "UUID", "FK programs, nullable", "FK", "Ngành (legacy; dùng program_subjects)"),
        ("subject_group_id", "UUID", "FK subject_groups SET NULL", "FK", "Nhóm môn"),
        ("is_active", "BOOLEAN", "NOT NULL, DEFAULT true", "", "Còn dùng"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "", "Ngày tạo"),
    ])


def table_admin_classes():
    return tbl("admin_classes", [
        ("id", "UUID", "PK", "PK", "ID lớp hành chính"),
        ("program_code", "TEXT", "NOT NULL, DEFAULT CNTT", "", "Mã CT (text)"),
        ("intake_year", "INTEGER", "NOT NULL", "", "Khóa (16)"),
        ("section", "TEXT", "NOT NULL", "", "Tổ (02)"),
        ("display_name", "TEXT", "NOT NULL", "", "CNTT 16-02"),
        ("manager_teacher_id", "UUID", "FK accounts SET NULL", "FK", "GV chủ nhiệm (UNIQUE nghiệp vụ)"),
        ("program_id", "UUID", "FK programs RESTRICT", "FK", "Liên kết programs"),
        ("expected_size", "INTEGER", "NOT NULL, DEFAULT 0, CHECK >= 0", "", "Sĩ số dự kiến"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "", "Ngày tạo"),
    ]) + "\n\n**UNIQUE:** `(program_code, intake_year, section)`."


def table_classes():
    return tbl("classes", [
        ("id", "UUID", "PK", "PK", "Lớp học phần"),
        ("subject_id", "UUID", "FK subjects RESTRICT", "FK", "Môn"),
        ("teacher_id", "UUID", "FK accounts RESTRICT", "FK", "GV phụ trách"),
        ("semester", "TEXT", "NOT NULL", "", "Học kỳ"),
        ("year", "INTEGER", "NOT NULL", "", "Năm học"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "", "Ngày tạo"),
    ])


def table_enrollments():
    return tbl("enrollments", [
        ("id", "UUID", "PK", "PK", "ID ghi danh"),
        ("class_id", "UUID", "FK classes CASCADE", "FK", "Lớp HP"),
        ("student_id", "UUID", "FK accounts CASCADE", "FK", "Sinh viên"),
        ("enrolled_at", "TIMESTAMPTZ", "NOT NULL", "", "Ngày ghi danh"),
    ]) + "\n\n**UNIQUE:** `(class_id, student_id)`."


def table_exams():
    return tbl("exams", [
        ("id", "UUID", "PK", "PK", "ID đề thi"),
        ("title", "TEXT", "NOT NULL", "", "Tiêu đề"),
        ("description", "TEXT", "nullable", "", "Mô tả"),
        ("class_id", "UUID", "FK classes CASCADE, nullable", "FK", "Lớp HP (legacy)"),
        ("admin_class_id", "UUID", "FK admin_classes RESTRICT", "FK", "Lớp HC"),
        ("subject_id", "UUID", "FK subjects RESTRICT", "FK", "Môn học"),
        ("created_by", "UUID", "FK accounts RESTRICT", "FK", "Người tạo"),
        ("duration_min", "INTEGER", "NOT NULL", "", "Thời lượng phút"),
        ("num_versions", "INTEGER", "NOT NULL, DEFAULT 2, CHECK 1..4", "", "Số mã đề D01–D04"),
        ("closes_at", "TIMESTAMPTZ", "nullable", "", "Hạn chót"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "", "Ngày tạo"),
    ])


def table_questions():
    return tbl("questions", [
        ("id", "UUID", "PK", "PK", "ID câu"),
        ("exam_id", "UUID", "FK exams CASCADE", "FK", "Đề thi"),
        ("content", "TEXT", "NOT NULL", "", "Nội dung"),
        ("question_type", "TEXT", "CHECK mcq/essay", "", "Loại câu"),
        ("options", "JSONB", "nullable", "", "Lựa chọn MCQ"),
        ("correct_answer", "JSONB", "nullable", "", "Đáp án đúng"),
        ("points", "DECIMAL(4,1)", "NOT NULL, DEFAULT 1", "", "Điểm"),
        ("display_order", "INTEGER", "DEFAULT 0", "", "Thứ tự"),
        ("version_index", "INTEGER", "NOT NULL, DEFAULT 0, CHECK 0..3", "", "Mã đề 0=D01"),
        ("media_url", "TEXT", "nullable", "", "URL Cloudinary"),
        ("question_bank_id", "UUID", "FK question_bank SET NULL", "FK", "Nguồn bank"),
        ("explanation", "TEXT", "nullable", "", "Giải thích"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "", "Ngày tạo"),
    ])


def table_question_bank():
    return tbl("question_bank", [
        ("id", "UUID", "PK", "PK", "ID câu kho"),
        ("created_by", "UUID", "FK accounts", "FK", "GV tạo"),
        ("subject_id", "UUID", "FK subjects", "FK", "Môn"),
        ("content", "TEXT", "NOT NULL", "", "Nội dung"),
        ("question_type", "TEXT", "CHECK mcq/essay", "", "Loại"),
        ("options", "JSONB", "nullable", "", "MCQ options"),
        ("correct_answer", "JSONB", "nullable", "", "Đáp án"),
        ("points", "DECIMAL(4,1)", "DEFAULT 1", "", "Điểm"),
        ("difficulty", "TEXT", "CHECK DE/TRUNGBINH/KHO", "", "Độ khó"),
        ("chapter", "INTEGER", "nullable", "", "Chương shuffle"),
        ("answer_hint", "TEXT", "nullable", "", "Gợi ý"),
        ("explanation", "TEXT", "nullable", "", "Giải thích"),
        ("tags", "TEXT[]", "nullable", "", "Thẻ"),
        ("source_exam_id", "UUID", "FK exams SET NULL", "FK", "Đề nguồn"),
        ("usage_count", "INTEGER", "NOT NULL, DEFAULT 0", "", "Số lần dùng"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "", "Tạo"),
        ("updated_at", "TIMESTAMPTZ", "NOT NULL", "", "Cập nhật"),
    ])


def table_exam_versions():
    return tbl("exam_versions", [
        ("id", "UUID", "PK", "PK", "ID phiên bản"),
        ("exam_id", "UUID", "FK exams CASCADE", "FK", "Đề"),
        ("version_code", "VARCHAR(10)", "NOT NULL", "", "D01, D02…"),
        ("version_index", "INTEGER", "NOT NULL", "", "0-based"),
        ("question_order", "JSONB", "NOT NULL", "", "Thứ tự câu xáo"),
        ("option_maps", "JSONB", "NOT NULL", "", "Map đáp án xáo"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "", "Ngày tạo"),
    ])


def table_exam_sessions():
    return tbl("exam_sessions", [
        ("id", "UUID", "PK", "PK", "ID phiên thi"),
        ("exam_id", "UUID", "FK exams CASCADE", "FK", "Đề"),
        ("student_id", "UUID", "FK accounts CASCADE", "FK", "SV"),
        ("status", "TEXT", "CHECK active/submitted/expired", "", "Trạng thái"),
        ("started_at", "TIMESTAMPTZ", "NOT NULL", "", "Bắt đầu"),
        ("submitted_at", "TIMESTAMPTZ", "nullable", "", "Nộp"),
        ("score", "DECIMAL(6,2)", "nullable", "", "Điểm"),
        ("max_points", "DECIMAL(6,2)", "nullable", "", "Điểm tối đa"),
        ("student_answers", "JSONB", "nullable", "", "Bài làm"),
        ("graded_details", "JSONB", "nullable", "", "Chi tiết chấm"),
        ("grading_status", "TEXT", "CHECK pending_manual/complete", "", "Trạng thái chấm"),
        ("version_id", "UUID", "FK exam_versions", "FK", "Phiên bản đề"),
        ("version_code", "VARCHAR(10)", "nullable", "", "Mã đề"),
        ("question_order", "JSONB", "nullable", "", "Thứ tự câu SV"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "", "Tạo phiên"),
    ])


def table_exam_runtime_state():
    return tbl("exam_runtime_state", [
        ("exam_id", "UUID", "PK, FK exams CASCADE", "PK, FK", "Đề đang chạy"),
        ("started_at", "TIMESTAMPTZ", "NOT NULL", "", "Bắt đầu đồng hồ"),
        ("ends_at", "TIMESTAMPTZ", "NOT NULL", "", "Kết thúc"),
        ("duration_min", "INTEGER", "NOT NULL", "", "Thời lượng"),
        ("is_active", "BOOLEAN", "NOT NULL, DEFAULT true", "", "Đồng hồ chạy"),
    ])


def table_exam_session_autosaves():
    return tbl("exam_session_autosaves", [
        ("id", "UUID", "PK", "PK", "ID autosave"),
        ("session_id", "UUID", "FK exam_sessions CASCADE, UNIQUE", "FK", "Phiên (1 bản/phiên)"),
        ("exam_id", "UUID", "FK exams CASCADE", "FK", "Đề"),
        ("student_id", "UUID", "FK accounts CASCADE", "FK", "SV"),
        ("answers", "JSONB", "NOT NULL", "", "Câu trả lời tạm"),
        ("saved_at", "TIMESTAMPTZ", "NOT NULL", "", "Thời điểm client"),
        ("server_at", "TIMESTAMPTZ", "NOT NULL", "", "Thời điểm server"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "", "Tạo"),
        ("updated_at", "TIMESTAMPTZ", "NOT NULL", "", "Cập nhật"),
    ])


def table_exam_integrity_events():
    return tbl("exam_integrity_events", [
        ("id", "UUID", "PK", "PK", "ID sự kiện"),
        ("exam_id", "UUID", "FK exams CASCADE", "FK", "Đề"),
        ("session_id", "UUID", "FK exam_sessions CASCADE", "FK", "Phiên"),
        ("student_id", "UUID", "FK accounts CASCADE", "FK", "SV"),
        ("event_type", "TEXT", "NOT NULL, CHECK 11 loại", "", "Loại vi phạm"),
        ("event_at", "TIMESTAMPTZ", "NOT NULL", "", "Thời điểm client"),
        ("details", "JSONB", "nullable", "", "Metadata"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "", "Ghi DB"),
    ])


def table_exam_proctor_presence():
    return tbl("exam_proctor_presence", [
        ("id", "UUID", "PK", "PK", "ID presence"),
        ("exam_id", "UUID", "FK exams CASCADE", "FK", "Đề"),
        ("student_id", "UUID", "FK accounts CASCADE", "FK", "SV"),
        ("socket_id", "TEXT", "NOT NULL", "", "Socket connection id"),
        ("ip_address", "TEXT", "nullable", "", "IP"),
        ("user_agent", "TEXT", "nullable", "", "UA"),
        ("joined_at", "TIMESTAMPTZ", "NOT NULL", "", "Vào phòng"),
        ("last_ping_at", "TIMESTAMPTZ", "NOT NULL", "", "Ping 5s"),
        ("disconnected_at", "TIMESTAMPTZ", "nullable", "", "Ngắt kết nối"),
    ]) + "\n\n**UNIQUE:** `(exam_id, student_id)`."


def table_exam_proctor_logs():
    return tbl("exam_proctor_logs", [
        ("id", "UUID", "PK", "PK", "ID log"),
        ("exam_id", "UUID", "FK exams", "FK", "Đề"),
        ("session_id", "UUID", "FK exam_sessions SET NULL", "FK", "Phiên"),
        ("student_id", "UUID", "FK accounts", "FK", "SV"),
        ("event_type", "TEXT", "NOT NULL", "", "screenshot, tab_switch, devtools…"),
        ("screenshot_url", "TEXT", "nullable", "", "URL ảnh"),
        ("ip_address", "TEXT", "nullable", "", "IP"),
        ("user_agent", "TEXT", "nullable", "", "UA"),
        ("metadata", "JSONB", "nullable", "", "Mở rộng"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "", "Ghi log"),
    ])


def table_exam_deadline_notifications():
    return tbl("exam_deadline_notifications", [
        ("id", "UUID", "PK", "PK", "ID"),
        ("exam_id", "UUID", "FK exams CASCADE", "FK", "Đề"),
        ("student_id", "UUID", "FK accounts CASCADE", "FK", "SV"),
        ("sent_at", "TIMESTAMPTZ", "NOT NULL", "", "Đã gửi"),
        ("notification_type", "TEXT", "DEFAULT reminder", "", "Loại nhắc"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "", "Tạo"),
    ])


def table_exam_shares():
    return tbl("exam_shares", [
        ("id", "UUID", "PK", "PK", "Chia sẻ đề"),
        ("exam_id", "UUID", "FK exams", "FK", "Đề"),
        ("shared_with", "UUID", "FK accounts", "FK", "GV nhận"),
        ("role", "TEXT", "CHECK viewer/grader/co-owner", "", "Quyền"),
        ("assigned_by", "UUID", "FK accounts", "FK", "Người gán"),
        ("assigned_at", "TIMESTAMPTZ", "NOT NULL", "", "Thời gian"),
    ])


def table_exam_collaborators():
    return tbl("exam_collaborators", [
        ("id", "UUID", "PK", "PK", "Cộng tác viên"),
        ("exam_id", "UUID", "FK exams", "FK", "Đề"),
        ("teacher_id", "UUID", "FK accounts", "FK", "GV"),
        ("role", "TEXT", "CHECK owner/grader", "", "owner/grader"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "", "Ngày thêm"),
    ])


def table_grading_assignments():
    return tbl("grading_assignments", [
        ("id", "UUID", "PK", "PK", "Phân công chấm"),
        ("exam_session_id", "UUID", "FK exam_sessions", "FK", "Phiên"),
        ("exam_id", "UUID", "FK exams", "FK", "Đề"),
        ("teacher_id", "UUID", "FK accounts", "FK", "GV chấm"),
        ("assigned_by", "UUID", "FK accounts", "FK", "Người giao"),
        ("assigned_at", "TIMESTAMPTZ", "NOT NULL", "", "Giao"),
        ("graded_at", "TIMESTAMPTZ", "nullable", "", "Hoàn thành"),
        ("status", "TEXT", "CHECK pending/in_progress/completed", "", "Trạng thái"),
        ("notes", "TEXT", "nullable", "", "Ghi chú"),
    ])


def table_student_prediction_cache():
    return tbl("student_prediction_cache", [
        ("user_id", "UUID", "PK, FK accounts CASCADE", "PK, FK", "Sinh viên"),
        ("payload", "JSONB", "NOT NULL", "", "Kết quả MiniMax AI"),
        ("computed_at", "TIMESTAMPTZ", "NOT NULL", "", "Lúc tính"),
    ])


def table_password_reset_requests():
    return tbl("password_reset_requests", [
        ("id", "UUID", "PK", "PK", "Yêu cầu reset"),
        ("user_id", "UUID", "FK accounts", "FK", "Tài khoản"),
        ("requested_by", "UUID", "FK accounts", "FK", "Người yêu cầu"),
        ("status", "TEXT", "CHECK pending/approved/rejected/expired", "", "Trạng thái"),
        ("admin_note", "TEXT", "nullable", "", "Ghi chú admin"),
        ("approved_by", "UUID", "nullable", "FK", "Admin duyệt"),
        ("new_password_plain", "TEXT", "nullable", "", "MK tạm"),
        ("expires_at", "TIMESTAMPTZ", "NOT NULL", "", "Hết hạn"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "", "Tạo"),
        ("updated_at", "TIMESTAMPTZ", "NOT NULL", "", "Cập nhật"),
    ])


def table_password_reset_tokens():
    return tbl("password_reset_tokens", [
        ("id", "UUID", "PK", "PK", "Token email"),
        ("user_id", "UUID", "FK accounts", "FK", "Tài khoản"),
        ("token", "VARCHAR(64)", "UNIQUE", "", "Token"),
        ("expires_at", "TIMESTAMPTZ", "NOT NULL", "", "Hết hạn 1h"),
        ("used", "BOOLEAN", "DEFAULT false", "", "Đã dùng"),
        ("used_at", "TIMESTAMPTZ", "nullable", "", "Lúc dùng"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "", "Tạo"),
    ])


def table_audit_logs():
    return tbl("audit_logs", [
        ("id", "UUID", "PK", "PK", "ID log"),
        ("actor_id", "UUID", "nullable", "", "Người thực hiện"),
        ("actor_role", "TEXT", "nullable", "", "admin/teacher/student/system"),
        ("action", "TEXT", "NOT NULL", "", "22 loại: login, create_exam, submit_exam…"),
        ("resource_type", "TEXT", "nullable", "", "Loại tài nguyên"),
        ("resource_id", "UUID", "nullable", "", "ID tài nguyên"),
        ("details", "JSONB", "DEFAULT {}", "", "Ngữ cảnh"),
        ("ip_address", "TEXT", "nullable", "", "IP"),
        ("user_agent", "TEXT", "nullable", "", "UA"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "", "Thời điểm"),
    ])


def table_user_notifications():
    return tbl("user_notifications", [
        ("id", "UUID", "PK", "PK", "Thông báo"),
        ("user_id", "UUID", "FK accounts CASCADE", "FK", "Người nhận"),
        ("type", "TEXT", "CHECK info/success/warning/error", "", "Loại UI"),
        ("title", "TEXT", "NOT NULL", "", "Tiêu đề"),
        ("message", "TEXT", "NOT NULL", "", "Nội dung"),
        ("is_read", "BOOLEAN", "DEFAULT FALSE", "", "Đã đọc"),
        ("link", "TEXT", "nullable", "", "Điều hướng"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "", "Tạo"),
    ])


def table_migrations():
    return tbl("_migrations", [
        ("name", "TEXT", "PK", "PK", "Tên file migration"),
        ("applied_at", "TIMESTAMPTZ", "NOT NULL", "", "Thời điểm chạy"),
    ])


if __name__ == "__main__":
    print(build_section_6()[:500])
