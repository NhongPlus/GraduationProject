# -*- coding: utf-8 -*-
"""Nội dung các chương 5–8 cho DAC_TA_HE_THONG_CHI_TIET.md"""

SECTION_5 = r"""---

## 5. Phân tích chức năng chi tiết theo Actor

### 5.1. Danh sách tác nhân (Bảng 3.1)

| Tác nhân | Key trong code | Mô tả | Phạm vi |
|----------|---------------|--------|---------|
| **Quản trị viên (admin)** | `"admin"` | Super admin | Toàn hệ thống: tài khoản, lớp HC, danh mục môn, audit, báo cáo, giám sát proctoring |
| **Giáo viên (teacher)** | `"teacher"` | Manager lớp / GV soạn đề | Một `admin_class`: quản lý SV, tạo đề, chấm, xuất bảng điểm lớp mình |
| **Sinh viên (student)** | `"student"` | Thí sinh | Thuộc một `admin_class`; làm bài, xem kết quả trong phạm vi lớp |

**Frontend mapping:** DB `student` và `teacher` → FE authority `user`; DB `admin` → `admin` + `user`.

### 5.2. Ma trận yêu cầu chức năng theo vai trò (Bảng 3.2)

| Chức năng | Admin | Teacher | Student |
|-----------|:-----:|:-------:|:-------:|
| Tạo/sửa đề (một số route FE) | Có (theo FE route) | Theo API | Không |
| Làm bài / autosave | Theo cấu hình demo | Theo cấu hình | Có |
| Giám sát proctoring | Có | Theo API | Không |
| Chấm điểm tự luận | Theo API | Có | Không |
| CRUD user | Có | Không | Không |
| Audit log / System report | Có | Không | Không |
| Reset password (duyệt) | Có | Không | Không (chỉ yêu cầu) |
| Import Word / Question bank | Có | Có | Không |
| Export kết quả | Có | Có | Không |
| Dự đoán điểm AI | Có | Có | Có |

### 5.3. Quản trị viên (Admin) — Đặc tả use case chi tiết

#### AD-01: CRUD người dùng

| Hạng mục | Nội dung |
|----------|----------|
| **Mã UC** | AD-01 |
| **Tên** | Quản lý tài khoản người dùng |
| **Mô tả** | Admin tạo, xem, sửa, xóa tài khoản admin/teacher/student |
| **Điều kiện tiên quyết** | Đăng nhập với role `admin`, JWT hợp lệ |
| **Luồng chính** | 1. Vào `/admin/students` → 2. `GET /v1/users` → 3. Thêm/Sửa/Xóa qua UI → 4. `POST/PATCH/DELETE /v1/users` |
| **Kết quả đầu ra** | Bản ghi `accounts` cập nhật; audit log ghi `create_account`/`update_account`/`delete_account` |
| **API** | `GET/POST/PATCH/DELETE /v1/users`, `POST /v1/users/:id/reset-password` |
| **Route FE** | `/admin/students` — authority `['admin']` |

#### AD-02: Nhật ký audit

| Hạng mục | Nội dung |
|----------|----------|
| **Mã UC** | AD-02 |
| **Điều kiện tiên quyết** | Role admin |
| **Luồng chính** | `GET /v1/audit-logs` với filter actor_id, action, resource_type, from_date, to_date |
| **Kết quả đầu ra** | Danh sách phân trang từ bảng `audit_logs` (22 loại action) |
| **Route FE** | `/admin/audit-logs` |

#### AD-03: Duyệt reset mật khẩu

| Hạng mục | Nội dung |
|----------|----------|
| **Mã UC** | AD-03 |
| **Điều kiện tiên quyết** | Có yêu cầu `password_reset_requests.status = pending` |
| **Luồng chính** | Admin duyệt/từ chối → `POST /v1/password-reset/approve` hoặc `/reject` |
| **Kết quả đầu ra** | SV đăng nhập bằng mật khẩu mới; `token_version` tăng, revoke sessions |

#### AD-04: Báo cáo hệ thống

| Hạng mục | Nội dung |
|----------|----------|
| **Mã UC** | AD-04 |
| **Luồng chính** | `GET /v1/system-report` |
| **Kết quả đầu ra** | overview, session_stats, integrity_stats, pending_grading, recent_exams |
| **Route FE** | `/admin/system-report` |

#### AD-05: Quản lý môn học / chương trình / lớp HC

| Hạng mục | Nội dung |
|----------|----------|
| **Modules** | `/admin/subjects`, `/admin/programs`, `/admin/classes` |
| **API** | `/v1/subjects`, `/v1/programs`, `/v1/admin-classes`, `/v1/subject-groups` |
| **Kết quả** | CRUD `subjects`, `programs`, `admin_classes`, import Excel môn/SV |

#### AD-06: Giám sát thi (Proctoring)

| Hạng mục | Nội dung |
|----------|----------|
| **Route FE** | `/proctoring`, `/proctoring/:examId` — chỉ admin trên FE |
| **API** | `GET /v1/exams/:examId/proctoring`, `/presence`, `/integrity-events`, `/proctor-logs` |
| **Kết quả** | Danh sách SV online, timeline vi phạm, force-submit |

### 5.4. Giáo viên (Teacher) — Đặc tả use case chi tiết

#### GV-01: Tạo và soạn đề thi

| Hạng mục | Nội dung |
|----------|----------|
| **Mã UC** | GV-01 |
| **Điều kiện tiên quyết** | Role teacher/admin; được gán `admin_class` |
| **Luồng chính** | Chọn lớp HC + môn → nhập title, `duration_min`, `closes_at`, `num_versions` (1–4) → thêm câu hỏi |
| **API** | `POST /v1/exams`, `POST /v1/exams/:examId/questions` |
| **Kết quả** | Bản ghi `exams` + `questions`; audit `create_exam` |

#### GV-02: Import đề Word

| Hạng mục | Nội dung |
|----------|----------|
| **Mã UC** | GV-05 |
| **Luồng** | Upload .docx → `POST import-word/preview` (Mammoth) → duyệt → `POST import-word/commit` |
| **Kết quả** | Câu hỏi map vào schema nội bộ; warnings nếu định dạng lỗi |

#### GV-03: Khởi động runtime thi

| Hạng mục | Nội dung |
|----------|----------|
| **Mã UC** | GV-01 (runtime) |
| **Luồng** | `POST /v1/exams/:examId/start-runtime` → ghi `exam_runtime_state` → broadcast Socket `exam:runtime_started` |
| **Kết quả** | Timer server-side; SV có thể bắt đầu session |

#### GV-04: Giám sát Socket

| Hạng mục | Nội dung |
|----------|----------|
| **Mã UC** | GV-02 |
| **Luồng** | Mở proctoring → lắng nghe presence, integrity → gửi cảnh báo / force-submit |
| **Kết quả** | SV nhận `exam:alert` hoặc bị `exam:force_submit` |

#### GV-05: Chấm điểm tự luận

| Hạng mục | Nội dung |
|----------|----------|
| **Mã UC** | GV-04 |
| **Luồng** | `GET /v1/exams/sessions/:sessionId/grading` → `PATCH .../grade` với `{ grades: { questionId: { points_awarded, comment } } }` |
| **Kết quả** | `exam_sessions.score` cập nhật; `grading_status = complete` |

#### GV-06: Quản lý sinh viên lớp

| Hạng mục | Nội dung |
|----------|----------|
| **Route** | `/teacher/students` |
| **API** | `/v1/teacher-students`, `/v1/admin-classes/:id/students` |
| **Kết quả** | Transcript, export CSV bảng điểm lớp |

### 5.5. Sinh viên (Student) — Đặc tả use case chi tiết

#### SV-01: Đăng nhập

| Hạng mục | Nội dung |
|----------|----------|
| **Mã UC** | SV-01 |
| **Luồng** | `POST /v1/auth/login` { email, password } → bcrypt → JWT + `user_sessions` |
| **Kết quả** | Token lưu client; redirect dashboard |
| **Lỗi** | 401 sai mật khẩu; không lộ stack trace production |

#### SV-02: Xem danh sách đề

| Hạng mục | Nội dung |
|----------|----------|
| **Mã UC** | SV-02 |
| **Điều kiện** | Thuộc `admin_class_id` của đề |
| **API** | `GET /v1/exams` |
| **Kết quả** | Chỉ đề trong phạm vi lớp; trạng thái Chưa mở/Đang thi/Đã nộp |

#### SV-03: Vào làm bài

| Hạng mục | Nội dung |
|----------|----------|
| **Mã UC** | SV-03 |
| **Điều kiện** | Runtime active; fullscreen (nếu bật); đề chưa hết hạn |
| **Luồng** | `POST /v1/exams/:examId/sessions` → nhận questions (shuffled), `deadline_at`, `version_code` |
| **Kết quả** | Session `active`; join Socket room `exam:{examId}` |

#### SV-04: Autosave

| Hạng mục | Nội dung |
|----------|----------|
| **Mã UC** | SV-04 |
| **Tần suất** | 30 giây (khuyến nghị contract) |
| **API** | `POST /v1/exams/autosave` — `{ exam_id, saved_at, answers }` max 2MB |
| **Kết quả** | Upsert `exam_session_autosaves`; 409 nếu session đã submitted |

#### SV-05: Gửi integrity events

| Hạng mục | Nội dung |
|----------|----------|
| **Mã UC** | SV-05 |
| **API** | `POST /v1/exams/integrity-events` — batch 1..200 events |
| **Loại sự kiện** | `exam_opened`, `fullscreen_enter/exit/error`, `visibility_hidden`, `window_blur/focus`, `copy_attempt`, `paste_attempt`, `context_menu`, `before_unload` |
| **Kết quả** | Ghi `exam_integrity_events` |

#### SV-06: Nộp bài

| Hạng mục | Nội dung |
|----------|----------|
| **Mã UC** | SV-06 |
| **Luồng** | `POST /v1/exam-sessions/:sessionId/submit` hoặc `/v1/exams/sessions/:sessionId/submit` |
| **Kết quả** | Auto-grade MCQ; `status = submitted`; `grading_status = pending_manual` nếu có essay |

#### SV-07: Xem kết quả

| Hạng mục | Nội dung |
|----------|----------|
| **Mã UC** | SV-07 |
| **API** | `GET /v1/exams/:examId/my-submission`, `/my-results`, review endpoint |
| **Kết quả** | Điểm, đúng/sai, giải thích (theo policy đề) |

### 5.6. Yêu cầu phi chức năng

| Loại | Yêu cầu |
|------|---------|
| **Bảo mật** | HTTPS production, JWT_SECRET mạnh, không commit secret, parameterized SQL, React escape XSS |
| **Hiệu năng** | Pool DB, tránh N+1, autosave không block UI, debounce input |
| **Khả dụng** | UI rõ ràng, i18n vi/en/ja, aria-live cho timer |
| **Tin cậy** | Migration đồng bộ; `exam_runtime_state` restore timer sau restart |
| **Mở rộng** | Router module hóa, OpenAPI, Redis adapter Socket (hướng phát triển) |"""


SECTION_7 = r"""---

## 7. Quy trình và thuật toán

> **Lưu ý:** Đồ án không có luồng "Văn bản đến/đi" hay OCR. Các luồng nghiệp vụ thực tế là vòng đời thi trực tuyến, import Word, autosave, integrity, Socket.IO, chấm điểm và thống kê.

### 7.1. Luồng đăng nhập và xác thực

1. Client gửi `{ email, password }` qua HTTPS tới `POST /v1/auth/login`.
2. Server: `bcrypt.compare` với `accounts.hashed_password` (cost 12).
3. Tạo JWT (HS256, `JWT_SECRET`, exp ~7 ngày) chứa `userId`, `role`, `token_version`.
4. Ghi `user_sessions`: `token_hash`, `device_id`, `expires_at`; vô hiệu hóa session active cũ (single device).
5. Client lưu token; mọi request REST gửi `Authorization: Bearer <token>`.
6. Nếu `first_login = true` → bắt buộc đổi mật khẩu trước khi tiếp tục.

### 7.2. Luồng tạo đề thi và import Word

```
GV/Admin → Nhập metadata (title, duration_min, admin_class_id, subject_id, num_versions)
    → POST /v1/exams
    → Thêm câu: manual | question_bank | import Word
    → [Import Word] upload .docx (multipart, giới hạn kích thước)
    → Mammoth parse → preview JSON/HTML
    → GV duyệt → commit → INSERT questions
    → [Optional] POST /v1/shuffle/:examId — xáo theo chapter
    → Tạo exam_versions (D01–D04) với question_order + option_maps
```

**Thuật toán import Mammoth:** Chuyển `.docx` → HTML/JSON cấu trúc câu hỏi; map sang schema `questions` (mcq/essay, options JSONB, correct_answer JSONB); log warnings định dạng; trả 400 nếu parse lỗi.

### 7.3. Luồng tổ chức phiên thi (runtime)

1. GV `POST /v1/exams/:examId/start-runtime`.
2. Server ghi `exam_runtime_state`: `started_at`, `ends_at = started_at + duration_min`, `is_active = true`.
3. Broadcast Socket.IO `exam:runtime_started` tới room `exam:{examId}`.
4. SV mở đề → kiểm tra runtime active + `closes_at` + quyền lớp.
5. `POST /v1/exams/:examId/sessions`:
   - Gán `version_index = hash(student_id) % num_versions` (deterministic).
   - Load `exam_versions` → trả `questions[]` đã xáo, `option_maps`, `deadline_at`.
6. SV join Socket room; bắt đầu timer UI sync với `ends_at` server (server là nguồn sự thật).

### 7.4. Luồng làm bài, autosave và integrity

**Autosave (contract `EXAM_INTEGRITY_AUTOSAVE_CONTRACT.md`):**

- Client queue answers trong state React.
- Mỗi **30 giây** (hoặc khi có thay đổi): `POST /v1/exams/autosave`.
- Payload: `{ exam_id, saved_at ISO-8601, answers: Record<questionId, value> }`, max **2MB**.
- Server: map `exam_id + user_id` → session `active`; UPSERT `exam_session_autosaves` ON CONFLICT `session_id`.
- Trả `409` nếu session `submitted`/`expired` → client hiển thị "phiên đã kết thúc".
- Client backoff khi 429/503 (exponential backoff).

**Integrity events:**

- Hook: `fullscreen`, `visibilitychange`, `blur`/`focus`, `copy`/`paste`, `contextmenu`, `beforeunload`.
- Batch gửi `POST /v1/exams/integrity-events` (1–200 events/request).
- Dedupe mềm: `(session_id, event_type, event_at, payload_hash)`.
- Lưu `exam_integrity_events` → giám thị lọc timeline.

### 7.5. Luồng nộp bài và chấm điểm

**Nộp thủ công:**
1. SV xác nhận dialog → `POST .../submit` với `{ answers }`.
2. Server transaction: khóa session → reverse option shuffle → auto-grade MCQ → ghi `score`, `graded_details`.
3. Essay: `grading_status = pending_manual`.

**Nộp tự động / Force-submit:**
1. Hết giờ: server interval/job phát `exam:force_submit`.
2. GV force: `POST /v1/exams/:examId/force-submit`.
3. Với mỗi session `active`: lấy autosave mới nhất → merge answers → submit → auto-grade MCQ.
4. Idempotent: session đã `submitted` bỏ qua.

**Thuật toán chấm MCQ tự động:**
```
for each question in exam:
  if question_type == 'mcq':
    student_answer = reverse_shuffle(session.answers[qid], option_map[qid])
    if normalize(student_answer) == normalize(correct_answer):
      points_awarded = question.points
    else:
      points_awarded = 0
    graded_details[qid] = { points_awarded, correct: bool }
total_score = sum(points_awarded)
```

**Chấm tự luận:** GV `PATCH /grade` → cập nhật `graded_details` từng câu → recalculate `score` → `grading_status = complete`.

### 7.6. Luồng giám sát Socket.IO (Proctoring)

```
SV connect Socket (JWT handshake)
  → proctor:join { examId }
  → UPSERT exam_proctor_presence
  → proctor:ping mỗi 5s → touch last_ping_at

GV/Admin join proctor room
  → GET /proctoring, /presence, /integrity-events
  → emit exam:proctor_alert → SV nhận exam:alert

Disconnect > 30s → mark disconnected_at
Force-submit → exam:force_submit → SV auto submit UI
```

### 7.7. Thuật toán xáo trộn câu hỏi và đáp án (Shuffle)

**Gán mã đề (deterministic):**
```typescript
version_index = stableHash(student_id) % num_versions  // 0..3 → D01..D04
```

**Fisher-Yates seeded (trong chapter):**
- Nhóm câu theo `chapter`.
- Shuffle trong từng nhóm với seed = `version_index + hash(chapter)`.
- Không xáo câu giữa các chapter (controlled shuffle).

**Option shuffle:**
- `option_maps[question_id]`: map display key (A/B/C/D) → original key.
- Khi submit: `reverseAnswer(displayKey, optionMap)` trước khi so sánh `correct_answer`.

### 7.8. Thuật toán thống kê điểm (Score Analytics)

- Input: `exam_sessions` WHERE `status IN (submitted, expired)` AND `score IS NOT NULL`.
- `percentage = (score / max_points) * 100`.
- Bucket 5 khoảng: `[0,20)`, `[20,40)`, `[40,60)`, `[60,80)`, `[80,100]`.
- Aggregate: `avg`, `min`, `max`, `pass_rate` (>= 60%), `completion_rate`.
- Group by: `exam_id`, `subject_id`, `admin_class_id`.

### 7.9. Thuật toán dự đoán điểm AI (MiniMax)

**3-tier:**
1. **predict (free):** rule-based từ lịch sử `exam_sessions` + enrollment.
2. **evaluate (AI):** HTTP MiniMax API, queue max **5 concurrent**, timeout **120s** → 408.
3. **full-report:** báo cáo chi tiết AI.

Cache: `student_prediction_cache.payload` JSONB; upsert on generate.

### 7.10. Thuật toán tìm kiếm / lọc (thay cho Full-text search OCR)

Hệ thống **không có** OCR hay full-text search trên scan PDF. Các tìm kiếm thực tế:

| Module | Cơ chế |
|--------|--------|
| Danh sách user | `ILIKE` trên email, username, full_name + filter role |
| Danh sách đề | filter `admin_class_id`, `search` title |
| Question bank | filter subject, difficulty, chapter, tags, `search` content |
| Audit log | filter action, actor, date range |

**Highlight từ khóa:** Không có engine full-text highlight; UI Mantine hiển thị kết quả lọc trực tiếp.

### 7.11. Luồng phục hồi runtime sau server restart

1. Đọc `exam_runtime_state` WHERE `is_active = true`.
2. So sánh `NOW()` với `ends_at`:
   - Nếu chưa hết giờ: client tính remaining = `ends_at - server_time`.
   - Nếu đã hết: trigger force-submit cho sessions còn `active`.
3. Không cộng thêm thời gian cho SV khi refresh trang.

### 7.12. Sequence diagram — Luồng thi end-to-end

```mermaid
sequenceDiagram
  participant GV as Giáo viên
  participant API as Node.js API
  participant SOCK as Socket.IO
  participant SV as Sinh viên
  participant DB as PostgreSQL

  GV->>API: POST start-runtime
  API->>DB: INSERT exam_runtime_state
  API->>SOCK: exam:runtime_started
  SOCK->>SV: signal bắt đầu
  SV->>API: POST sessions
  API->>DB: INSERT exam_sessions
  loop Mỗi 30s
    SV->>API: POST autosave
    API->>DB: UPSERT exam_session_autosaves
  end
  SV->>API: POST submit
  API->>DB: UPDATE session, auto-grade MCQ
  GV->>API: PATCH grade (essay)
  API->>DB: UPDATE score, grading_status
  SV->>API: GET my-results
```"""


SECTION_8 = r"""---

## 8. Kịch bản kiểm thử và đánh giá hiệu năng

### 8.1. Kiểm thử thủ công gợi ý (Bảng 4.2)

| Kịch bản | Bước kiểm tra | Kết quả mong đợi |
|----------|---------------|------------------|
| Health API | GET `/` | 200, thông tin service |
| Đăng nhập SV | POST `/v1/auth/login` | JWT hợp lệ |
| Làm bài + autosave | Quan sát network | 200, không mất tiến độ |
| Hết giờ | Chờ timer = 0 | Khóa nộp, trạng thái đúng |
| Socket runtime | Hai trình duyệt | SV nhận tín hiệu |

### 8.2. Danh mục kiểm thử chi tiết TC-01 → TC-76 (Phụ lục báo cáo)

| ID | Mô tả | Kết quả mong đợi |
|----|-------|------------------|
| TC-01 | Cài dependency backend | Thành công, không lỗi peer nghiêm trọng |
| TC-02 | Cài dependency frontend, dev server | Chạy cổng mặc định 5173 |
| TC-03 | Sao chép `.env.example` → `.env`, điền DATABASE_URL | Hợp lệ |
| TC-04 | Migration DB trống | Không lỗi SQL |
| TC-05 | GET `/` health | 200 |
| TC-06 | GET `/docs` Swagger | Hiển thị endpoint |
| TC-07 | Tạo user qua admin/seed | User tồn tại |
| TC-08 | Đăng nhập admin | Token lưu đúng |
| TC-09 | Đăng nhập giáo viên | Phân quyền route hợp lệ |
| TC-10 | Đăng nhập sinh viên | Thành công |
| TC-11 | Sai mật khẩu | Thông báo lỗi, không lộ stack production |
| TC-12 | Token hết hạn | 401 |
| TC-13 | Admin GET `/v1/users` | Danh sách user |
| TC-14 | Admin cập nhật user | Không vi phạm FK |
| TC-15 | Admin audit log | Có bản ghi sự kiện |
| TC-16 | GV tạo đề hợp lệ | examId trả về |
| TC-17 | Thêm MCQ 4 phương án | Lưu DB |
| TC-18 | Thêm câu tự luận | Lưu DB |
| TC-19 | Import Word preview | Cấu trúc không vỡ |
| TC-20 | Import Word commit | Số câu khớp preview |
| TC-21 | Question bank tạo câu | Gắn môn |
| TC-22 | SV xem danh sách đề | Đề được phép |
| TC-23 | SV không thấy đề lớp khác | 403/ẩn |
| TC-24 | Bắt đầu làm bài | Timer đúng duration_min |
| TC-25 | Refresh trang | Khôi phục runtime, không cộng thời gian |
| TC-26 | Autosave định kỳ | 200, reload giữ đáp án |
| TC-27 | Mất mạng ngắn | Backoff, không spam |
| TC-28 | Integrity thoát fullscreen | Ghi sự kiện |
| TC-29 | Integrity chuyển tab | Ghi sự kiện |
| TC-30 | Giám thị proctoring | Thấy SV online |
| TC-31 | Socket start-runtime | SV nhận tín hiệu |
| TC-32 | Broadcast cảnh báo | Hiển thị trên máy SV |
| TC-33 | Force-submit | SV không chỉnh sửa thêm |
| TC-34 | Nộp bài thủ công | status submitted |
| TC-35 | Hết giờ auto nộp | MCQ được tính điểm |
| TC-36 | Xem kết quả | Điểm + chi tiết đúng/sai |
| TC-37 | Chấm tự luận | Tổng điểm cập nhật |
| TC-38 | Export CSV/Excel | Mở được Excel |
| TC-39 | Shuffle theo chương | Thứ tự khác giữa SV |
| TC-40 | i18n vi/en/ja | Nhãn không vỡ layout |
| TC-41 | Đổi mật khẩu | Login lại OK |
| TC-42 | Reset password email | Mail hợp lệ (SMTP) |
| TC-43 | AI không có API key | Degrade êm, không crash |
| TC-44 | AI có key | Kết quả trong thời gian chấp nhận |
| TC-45 | Score analytics admin | Thống kê không lỗi |
| TC-46 | System report | Không lộ secret |
| TC-47 | npm test backend | Pass |
| TC-48 | npm test frontend | Không fail blocking |
| TC-49 | Build production FE | Không lỗi TS |
| TC-50 | CORS production | Chỉ origin cho phép |
| TC-51 | .env không commit | .gitignore OK |
| TC-52 | Log 500 dev vs prod | Stack ẩn prod |
| TC-53 | Media câu hỏi | MIME đúng |
| TC-54 | Đăng xuất | Token không dùng được |
| TC-55 | 20 tab autosave giả lập | Server ổn định |
| TC-56 | SV không PATCH grade | 403 |
| TC-57 | Teacher không route admin FE | Redirect/403 |
| TC-58 | Backup/restore DB | Schema + data OK |
| TC-59 | Boundary đề 1 phút | Timer không âm |
| TC-60 | Boundary 200 câu | Scroll/autosave mượt |
| TC-61 | Unicode tiêu đề Tiếng Việt | UTF-8 end-to-end |
| TC-62 | Hai tab cùng user | Khóa/cảnh báo |
| TC-63 | Đổi ngôn ngữ khi làm bài | Không mất câu trả lời |
| TC-64 | Mất mạng 60s | Offline UI, retry |
| TC-65 | Chấm vượt điểm tối đa | Validation từ chối |
| TC-66 | Xóa cookie token | 401 redirect login |
| TC-67 | API curl không token | 401 |
| TC-68 | CORS preflight OPTIONS | Origin hợp lệ |
| TC-69 | Log không in password/token | An toàn |
| TC-70 | Rate limit login (nếu có) | Chặn sau N lần |
| TC-71 | Migration trên DB có data | Không mất bảng |
| TC-72 | Export BOM UTF-8 | Excel Windows OK |
| TC-73 | Teacher không xóa admin | 403 |
| TC-74 | Server restart giữa ca thi | Timer restore |
| TC-75 | File đính kèm quá lớn | 413/400 |
| TC-76 | 50 user đọc dashboard | Smoke ổn định |

### 8.3. Kiểm thử theo chiến lược Admin & Student (`TEST_STRATEGY_ADMIN_STUDENT.md`)

**Tài khoản test:**

| Role | Email | Mật khẩu |
|------|-------|----------|
| Admin | `admin01@system.local` | `Test@123` |
| Giáo viên | `gv01@system.local` … `gv03@system.local` | `Test@123` |
| Sinh viên | `sv01@system.local` … `sv37@system.local` | `Test@123` |
| SV CNTT 16-02 | `1671020190@student.dainam.edu.vn` | `Test@123` |

**Ma trận phân quyền smoke:**

| Route | Admin | Student |
|-------|:-----:|:-------:|
| `/admin/students` | ✅ | ❌ |
| `/admin/audit-logs` | ✅ | ❌ |
| `/exams`, `/exam/:id` | ✅ | ✅ |
| `/grading` | ✅ | ❌ |
| `POST .../sessions` | ❌ | ✅ |

**Definition of Done:** 100% P1 pass; ma trận phân quyền pass; E2E một vòng; smoke production; không bug Blocker/Critical.

### 8.4. Kiểm thử biên (boundary) — báo cáo bổ sung

- Thời gian đề: 1 phút, 5 phút, 180 phút.
- Số câu: 1, 50, 200.
- File Word rất nhỏ / rất lớn.
- JWT sắp hết hạn khi đang làm bài.
- Mạng offline 30s rồi online.
- Double submit / double click nộp bài.
- Đổi múi giờ client — server vẫn là nguồn sự thật timer.

### 8.5. Kiểm thử tự động

```bash
cd BackEnd/server && npm test    # Vitest
cd FrontEnd/client && npm test   # Vitest unit
```

Backend: auth, grading, exam services. Frontend: unit tests theo project Vitest.

### 8.6. Đánh giá hiệu năng hệ thống

**Mục tiêu và phương pháp (theo báo cáo Chương 4.6):**

| Hạng mục | Khuyến nghị | Ghi chú đồ án |
|----------|-------------|---------------|
| Autosave load test | k6 hoặc Apache Bench trên staging | Ghi p95 latency, throughput |
| Dashboard query | `EXPLAIN ANALYZE` | Thêm index nếu sequential scan cao |
| Concurrent users | TC-55 (20 tab), TC-76 (50 user dashboard) | Smoke nhẹ |
| Socket reconnect | Client library auto-reconnect | Kiểm tra mất tín hiệu |
| FE re-render | Debounce input; tránh re-render toàn màn khi autosave | ExamTake.tsx |
| AI queue | Max 5 concurrent MiniMax; timeout 120s | Tránh thundering herd |

**Kết quả đánh giá (trạng thái hiện tại — báo cáo Chương 5):**

| Tiêu chí | Đánh giá |
|----------|----------|
| MVP/demo end-to-end | **Ổn** — luồng thi cốt lõi hoàn chỉnh |
| Production readiness | Cần CI/test coverage, hardening secret, APM |
| Proctoring | Mức "mềm", phụ thuộc trình duyệt |
| Socket scale | Single-node OK; multi-instance cần Redis adapter |
| Test coverage | BE Vitest có; FE một phần; mở rộng trước production |

**Hạn chế đã ghi nhận:**
- Proctoring không thay thế giám sát con người / webcam chuyên dụng.
- CI và độ bao phủ test cần tăng.
- OpenAPI có thể drift so với code — cần test contract.

**Hướng phát triển hiệu năng:**
- Redis adapter Socket.IO.
- APM / OpenTelemetry, log JSON tập trung.
- Rate limit đăng nhập, WAF.
- Partial scoring MCQ, IRT (học thuật)."""


FOOTER = r"""---

## Kết luận

Đồ án đã phân tích, thiết kế và triển khai hệ thống thi trực tuyến với các module chính phù hợp thực tiễn giáo dục số. Hệ thống thể hiện vai trò của kiến trúc REST, cơ sở dữ liệu quan hệ PostgreSQL, và kênh thời gian thực Socket.IO trong tổ chức thi. Hướng tiếp theo: củng cố bảo mật vận hành, mở rộng kiểm thử tự động, hoàn thiện triển khai production.

---

## Tài liệu tham khảo

1. Tài liệu nội bộ: `DO_AN_MASTER.md`, `README.md`, `BackEnd/server/API.md`, `openapi.yaml`
2. `BackEnd/server/docs/ROLES_AND_PERMISSIONS.md`
3. `BackEnd/server/EXAM_INTEGRITY_AUTOSAVE_CONTRACT.md`, `SOCKET_IO_POC.md`
4. Express.js — https://expressjs.com/
5. React — https://react.dev/
6. PostgreSQL — https://www.postgresql.org/docs/
7. Socket.IO — https://socket.io/docs/
8. JWT RFC 7519 — https://www.rfc-editor.org/rfc/rfc7519

---

*File sinh tự động bởi `scripts/generate_dac_ta_he_thong.py`. Chỉnh sửa bìa (họ tên, MSV, GVHD) trước khi nộp.*
"""
