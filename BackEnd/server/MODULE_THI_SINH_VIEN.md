# Module cho phép sinh viên thi — vấn đề, công nghệ và lộ trình xây dựng

Tài liệu này làm rõ **bài toán kỹ thuật** và **lựa chọn công nghệ** cho nhánh chức năng trọng tâm của đồ án: *sinh viên đăng nhập, vào đề, làm bài trắc nghiệm, nộp bài, hệ thống chấm điểm và chuẩn bị dữ liệu cho AI / behavior logging*. Nội dung căn cứ vào kiến trúc mục tiêu (mục 3.3.2–3.4 trong đề cương) và codebase hiện tại (`Express` + `TypeScript` + `PostgreSQL`).

---

## 1. Vấn đề cần làm rõ

### 1.1. Bối cảnh

- Backend đang ở giai đoạn **nền tảng + luồng thi mở rộng**: **JWT**, **phân quyền**, **CRUD đề / câu hỏi** (có `question_type`: `mcq` \| `essay`), **phiên thi**, **nộp bài**, **chấm TN trên server**, **lưu điểm + đáp án + chi tiết chấm** trên `exam_sessions`, **hết giờ theo server khi submit**, **API xem bài nộp của student** và **API giáo viên chấm tự luận** (xem `src/services/exam.service.ts`, `src/routes/v1/examRouter.ts`, migration `src/db/migrations/002_exam_submission_grading.sql`).
- Các phần **behavior logging**, **refresh token**, **gọi mô-đun AI (Random Forest)**, **hàng đợi xử lý bất đồng bộ** có thể **chưa hoàn chỉnh hoặc chưa gắn vào router chính** — đây là điểm cần tách bạch trong luận văn: *đã làm*, *đang làm*, *dự kiến*.

### 1.2. Câu hỏi kỹ thuật cốt lõi khi “cho sinh viên thi”

| Câu hỏi | Ý nghĩa |
|--------|---------|
| **Ai là nguồn sự thật về đáp án và điểm?** | Chỉ server; client chỉ hiển thị và gửi lựa chọn. |
| **Khi nào “bắt đầu thi” và “hết giờ”?** | Cần trạng thái phiên (`active` / `submitted` / `expired`) và mốc thời gian trên DB. |
| **Random câu hỏi** random ở đâu? | Nên random **trên server** khi tạo phiên (hoặc khi lấy đề cho phiên), rồi **lưu snapshot** thứ tự/id câu gán cho lần thi đó — tránh mỗi lần F5 lại đổi đề. |
| **Có cần Socket.IO không?** | Không bắt buộc cho luồng tối thiểu (REST đủ). Socket hữu ích khi cần **đồng hồ đếm ngược đồng bộ**, **giám sát live**, **thông báo hết giờ tức thì** — có thể để **giai đoạn 2** của đồ án. |
| **Behavior (chuyển tab, tốc độ làm bài…)** thu thập thế nào? | Client ghi sự kiện → gửi **theo lô (batch)** qua REST hoặc qua WebSocket; server **lưu log + tổng hợp thống kê** phục vụ AI. |

Làm rõ các điểm trên giúp chương “Thiết kế và triển khai” trong đồ án **mạch lạc, có thể bảo vệ**.

---

## 2. Phạm vi module “Sinh viên thi” (theo đề cương)

Gói chức năng tối thiểu nên được mô tả trong luận văn như một **pipeline**:

1. **Xác thực & phân quyền** — JWT; route thi chỉ `student` (đã có hướng triển khai trong `examRouter`).
2. **Exam management (phần liên quan thí sinh)** — xem danh sách đề, xem metadata (thời lượng, môn/lớp nếu có).
3. **Bắt đầu phiên** — `POST .../exams/:examId/sessions`: tạo hoặc tái sử dụng phiên `active`, gắn `student_id`, `exam_id`, `started_at`.
4. **Lấy câu hỏi cho thí sinh** — API trả **dạng public** (không lộ `correct_answer`); có thể mở rộng thêm trường `topic`, `difficulty` phục vụ AI.
5. **Nộp bài** — `POST .../sessions/:sessionId/submit`: map `question_id → đáp án`; server **chấm TN**, lưu **tự luận chờ chấm**, ghi `score` (tạm = phần TN), `max_points`, `student_answers`, `graded_details` (JSON), `grading_status` (`pending_manual` \| `complete`), `status = submitted`. Response student **không** trả `correct`.
5b. **Xem kết quả** — `GET .../exams/:examId/my-submission` (student): bản nộp mới nhất + chi tiết an toàn.
5c. **Chấm tự luận** — `GET .../sessions/:sessionId/grading`, `PATCH .../sessions/:sessionId/grade` (admin/teacher, chủ đề do `created_by` đề): cập nhật điểm essay và `grading_status`.
6. **Hậu xử lý** — enqueue hoặc gọi HTTP tới service AI; lưu `predictedScore`, `feedback`, `behavior_risk` (theo mục 3.4).

Behavior logging có thể chèn vào bước 4–5: client gửi log định kỳ, server lưu bảng `exam_behavior_events` hoặc tương đương.

---

## 3. Lựa chọn công nghệ (khuyến nghị cho đồ án)

### 3.1. Nền tảng đã chọn — giữ nguyên

| Thành phần | Vai trò |
|------------|---------|
| **Node.js + Express 5 + TypeScript** | API REST, validation, tách layer controller / service / model — phù hợp đồ án, dễ trình bày trong báo cáo. |
| **PostgreSQL (`pg`)** | Dữ liệu quan hệ (user, exam, question, session, submission) — chuẩn cho báo cáo và truy vấn thống kê. |
| **JWT (`jsonwebtoken`)** | Stateless auth; phù hợp SPA / client tách biệt. |

**Lý do không đổi stack giữa chừng:** giảm rủi ro, tập trung vào **nghiệp vụ thi và tích hợp AI**, vốn là điểm nhấn đồ án.

### 3.2. REST so với Socket.IO — khi nào dùng gì

| Nhu cầu | REST | Socket.IO |
|---------|------|-----------|
| Bắt đầu phiên, lấy đề, nộp bài | Đủ | Không bắt buộc |
| Autosave câu trả lời nháp (optional) | `PATCH` session / bảng answers | Có thể, nhưng REST đơn giản hơn cho đồ án |
| Đồng hồ thi đồng bộ server-side | Có thể dùng polling nhẹ hoặc deadline trên DB | Phù hợp nếu muốn “hết giờ” đẩy xuống client tức thì |
| Stream log hành vi tần suất cao | Batch POST mỗi N giây | Ổn nếu đã quen socket |

**Khuyến nghị cho luận văn:** mô tả **REST làm luồng chính**; Socket.IO là **mở rộng tùy chọn** nếu thời gian cho phép — tránh bị “kẹt” vì song song hai kênh real-time.

### 3.3. Refresh token

- **Hiện trạng thường gặp:** chỉ access token ngắn hạn hoặc token dài hạn — dễ demo nhưng kém an toàn.
- **Hướng chuẩn cho phần Auth trong đề cương:** access token ngắn + refresh token (httpOnly cookie hoặc lưu DB + rotation). Có thể triển khai **sau** khi luồng thi ổn định.

### 3.4. Mô-đun AI (Random Forest)

- **Train / infer:** Python (`scikit-learn`) là lựa chọn tự nhiên cho Random Forest Regressor; tách **service riêng** (HTTP hoặc message queue).
- **Node backend:** vai trò **orchestrator** — sau khi nộp bài, gom `pastScores`, `questionDifficulty`, `timeSpent`, `accuracy`, `behaviorStats`, gọi AI service, nhận JSON phân tích, **ghi DB** (`predicted_score`, `feedback`, `topic_mastery`, `cheat_risk`, …).
- **Đồng bộ vs bất đồng bộ:** với đồ án, có thể bắt đầu **gọi đồng bộ** (chờ vài trăm ms) rồi nâng cấp **job queue** nếu model chậm.

---

## 4. Thiết kế dữ liệu và an toàn (gợi ý trình bày trong chương thiết kế)

- **Session:** một dòng cho mỗi lần “vào thi”; ràng buộc *một phiên `active` trên (student, exam)* nếu nghiệp vụ yêu cầu.
- **Đáp án đúng:** không bao giờ trả về API dành cho student; chỉ dùng nội bộ khi chấm.
- **Random đề:** bảng trung gian `session_questions (session_id, question_id, order)` hoặc lưu JSON snapshot trong session — **tái hiện lại đề đã giao**.
- **Chấm điểm:** so khớp đáp án trên server (MCQ); essay lưu trong `graded_details`, điểm cập nhật khi GV chấm.
- **Một dòng `exam_sessions` = một lần làm bài của một sinh viên:** cột `student_id` xác định ai; `score` là điểm **của phiên đó** (không phải một ô gom cả lớp). Nhiều sinh viên ⇒ nhiều dòng (cùng `exam_id` khác `student_id` / `id` phiên).
- **Behavior:** schema kiểu `(session_id, event_type, payload_json, client_ts, server_ts)`; tổng hợp thành `behaviorStats` trước khi gọi AI.

---

## 5. Lộ trình triển khai gợi ý (theo giai đoạn — dễ viết vào báo cáo)

| Giai đoạn | Mục tiêu | Ghi chú |
|-----------|----------|---------|
| **G1 — Luồng thi tối thiểu** | Đăng nhập → danh sách đề → start session (có `deadline_at`) → lấy câu public → submit → lưu DB → xem `my-submission` | Đã có phần lõi backend; FE cần gọi đúng contract (`API.md`) |
| **G2 — Random & snapshot** | Random từ bộ câu theo đề; cố định cho từng session | Tránh thay đề khi reload |
| **G3 — Giới hạn thời gian & hết hạn** | Cron hoặc kiểm tra khi submit/get; `expireSession` | Gắn với `duration_min` trên exam |
| **G4 — Behavior logging** | API batch log + migration bảng events | Phục vụ mục 3.3.2(d) |
| **G5 — AI pipeline** | Service Python + contract JSON + cột kết quả trên submission/session | Phục vụ mục 3.4 |
| **G6 (tùy chọn)** | Socket.IO: đồng hồ, thông báo | Chỉ khi còn thời gian |

---

## 6. Liên kết với code hiện tại trong repo

- **Route thi / phiên:** `src/routes/v1/examRouter.ts` — đã mount qua `src/routes/v1/index.ts` tại prefix `/v1/exams`.
- **Logic nghiệp vụ:** `src/services/exam.service.ts` — session, submit, chấm điểm.
- **Mô hình:** `src/models/exam.model.ts`, `question.model.ts`, `examsession.model.ts`.
- **Tài liệu API tổng quan:** [`API.md`](API.md) — giữ khớp `examRouter`.
- **Nguồn đúng cho luồng thi:** `src/services/exam.service.ts`, `src/controllers/exam.controller.ts`, `src/routes/v1/examRouter.ts` (không duy trì bản copy song song trong `.md`).

Một số router khác (nếu có trong repo) **chưa mount** thì chưa xuất hiện trên server — khi viết báo cáo nên ghi rõ *“đã implement nhưng chưa đăng ký route”* hoặc hoàn tất `RouterV1.use(...)`.

---

## 7. Kết luận ngắn

Module “sinh viên thi” trong đồ án của bạn **không bắt buộc** phải dùng Socket.IO ngay từ đầu: **Express + PostgreSQL + JWT** là đủ cho **luồng cốt lõi** và dễ bảo vệ. Hãy **cố định random câu theo phiên**, **chấm điểm và giữ đáp án đúng trên server**, rồi mở rộng **behavior log** và **AI service** như các lớp “plug-in” sau pipeline nộp bài — vừa sát đề cương 3.3.2–3.4, vừa phù hợp mức độ hiện tại của folder backend.

---

*Tài liệu này có thể được trích dẫn trong luận văn ở mục “Phân tích yêu cầu / Thiết kế module thi trực tuyến”. Cập nhật file khi kiến trúc thực tế thay đổi (ví dụ: thêm refresh token, thêm service AI, hoặc bật Socket.IO).*
