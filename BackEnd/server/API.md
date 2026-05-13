# Danh sách API (Back-end)

**Base path:** `{BASE}/v1` — trong đó `{BASE}` tùy môi trường:

- **Production:** `https://api.nhongplus.id.vn` → API REST: `https://api.nhongplus.id.vn/v1/...`
- **Local:** `http://{APP_HOST}:{APP_PORT}` (ví dụ `http://localhost:5000`)

**Frontend production:** `https://nhongplus.id.vn` — cần khớp **CORS** / **Socket.IO** (`CORS_ORIGINS` trong `.env`, xem `src/config/enviroment.ts`).

**Frontend env:** file mẫu `FrontEnd/client/.env.example` — biến `VITE_API_URL` trỏ tới API production (`https://api.nhongplus.id.vn`). **Sau khi deploy, không dùng `localhost` làm base API** (curl hay trình duyệt đều phải gọi host public).

**Ví dụ `POST /v1/auth/login` (curl):**

- Local: `http://localhost:5000/v1/auth/login`
- Production: `https://api.nhongplus.id.vn/v1/auth/login` — thay host, giữ nguyên path `/v1/...`.

**SPA (React `BrowserRouter`):** Host tĩnh phải trả `index.html` cho mọi path kiểu `/login` (không tìm file tên `login`). Nếu không, lần đầu vào `/` rồi điều hướng trong app có thể vẫn OK, nhưng **F5 hoặc mở thẳng URL** sẽ **404**. Trong repo FE: `public/_redirects` (Netlify / Cloudflare Pages), `vercel.json` (Vercel), `public/.htaccess` (Apache); Nginx dùng `try_files $uri /index.html`.

**Auth:** Các route dưới `/v1/users` và `/v1/exams` cần header `Authorization: Bearer <token>` (trừ khi ghi rõ là public).

**Swagger docs:**

- UI: `GET /docs`
- JSON: `GET /docs-json`

---

## Root (ngoài `/v1`)

| Method | Path | Mô tả |
|--------|------|--------|
| `GET` | `/` | Healthcheck — `{ success, message }` |

---

## Auth — `/v1/auth`

| Method | Path | Auth | Role | Mô tả |
|--------|------|------|------|--------|
| `POST` | `/v1/auth/register` | JWT | `admin` | Tạo tài khoản (`email`, `username`, `password`, `role`, `full_name` optional). **Không** mở đăng ký công khai — sinh viên / giảng viên chỉ đăng nhập; tài khoản do admin tạo (hoặc seed / `/v1/users`). |
| `POST` | `/v1/auth/login` | Không | — | Đăng nhập (`email`, `password`) → `token` + `user` |

---

## Users — `/v1/users`

Tất cả route: **JWT + role `admin`**.

| Method | Path | Mô tả |
|--------|------|--------|
| `GET` | `/v1/users` | Danh sách user (public fields, không password) |
| `POST` | `/v1/users` | Tạo user |
| `GET` | `/v1/users/:id` | Chi tiết user |
| `PATCH` | `/v1/users/:id` | Cập nhật (`full_name`, `is_active`, `role`, … theo controller) |
| `DELETE` | `/v1/users/:id` | Xóa user |

---

## Dashboard — `/v1/dashboard`

| Method | Path | Role | Mô tả |
|--------|------|------|--------|
| `GET` | `/v1/dashboard/ping` | Không | Kiểm tra route có tới API Node (`{ success, message, path }`). Không đọc DB. |
| `GET` | `/v1/dashboard` | `admin`, `teacher`, `student` | Dữ liệu tổng hợp cho màn dashboard: `{ viewer_role, student?, staff? }`. **Sinh viên** nhận `student` (thống kê, bài sắp tới theo lớp đã ghi danh, biểu đồ điểm vs TB lớp theo đề, kết quả gần đây). **Admin** nhận `staff` (số liệu toàn hệ thống, danh sách SV mới, hoạt động phiên thi). **Giảng viên** nhận `staff` (số liệu theo lớp/đề của GV, hoạt động phiên). |

**Ghi chú deploy:** Code tự phát hiện cột `exams.closes_at` (migration `004_exam_deadline_reminders.sql`). Nếu DB chưa có cột, truy vấn “bài sắp tới” vẫn chạy (hạn `closes_at` = null). Sau khi deploy bản server mới, gọi `GET /v1/dashboard/ping` trước; nếu 404 thì reverse-proxy / process chưa cập nhật build. |

---

## Exams — `/v1/exams`

Tất cả route: **có JWT**. Role cụ thể xem cột Role.

### Đề thi

| Method | Path | Role | Mô tả |
|--------|------|------|--------|
| `GET` | `/v1/exams` | `admin`, `teacher`, `student` | Danh sách đề |
| `POST` | `/v1/exams` | `admin`, `teacher` | Tạo đề. Body: `title`, `class_id`, `duration_min`, `description` (optional), `closes_at` (optional, ISO) — **hạn chót được phép bắt đầu phiên**; sau thời điểm này sinh viên không mở phiên mới. Job server gửi **email nhắc** tới sinh viên trong lớp khi còn ~24h và ~1h trước `closes_at` (cần cấu hình SMTP trong `.env`, xem `src/config/enviroment.ts`). |
| `GET` | `/v1/exams/:id` | `admin`, `teacher`, `student` | Chi tiết đề |
| `DELETE` | `/v1/exams/:id` | `admin`, `teacher` | Xóa đề |

### Câu hỏi

| Method | Path | Role | Mô tả |
|--------|------|------|--------|
| `GET` | `/v1/exams/:examId/questions` | `admin`, `teacher`, `student` | Danh sách câu (student không thấy `correct_answer`) |
| `POST` | `/v1/exams/:examId/questions` | `admin`, `teacher` | Thêm câu: body `content`, `points`, `question_type` (`mcq` \| `essay`, mặc định `mcq`); MCQ bắt buộc `options`, `correct_answer`; essay có thể bỏ `options` / `correct_answer` |
| `DELETE` | `/v1/exams/:examId/questions/:questionId` | `admin`, `teacher` | Xóa câu hỏi |

### Phiên thi (session)

| Method | Path | Role | Mô tả |
|--------|------|------|--------|
| `POST` | `/v1/exams/:examId/sessions` | `student` | Bắt đầu / lấy phiên `active`: trả `{ session, deadline_at, duration_min }` |
| `GET` | `/v1/exams/:examId/sessions` | `admin`, `teacher` | Danh sách phiên theo đề (kèm `score`, `grading_status`, … nếu có trên DB) |
| `POST` | `/v1/exams/sessions/:sessionId/submit` | `student` | Nộp bài: `{ answers }` — map `question_id` → đáp án (chuỗi hoặc mảng cho MCQ nhiều đáp án). Chấm TN, lưu `score`, `graded_details`, `grading_status` |
| `GET` | `/v1/exams/sessions/me` | `student` | Lịch sử phiên của tôi |
| `POST` | `/v1/exams/:examId/force-submit` | `admin`, `teacher` | Force-submit thủ công toàn bộ phiên còn `active` của đề (dùng autosave mới nhất nếu có), trả summary `active/submitted/failed` |
| `GET` | `/v1/exams/:examId/my-submission` | `student` | Bản nộp `submitted` mới nhất của tôi cho đề này + chi tiết (không lộ đáp án đúng) |
| `GET` | `/v1/exams/sessions/:sessionId/grading` | `admin`, `teacher` | Dữ liệu chấm tay (GV tạo đề hoặc admin): bài làm + đề + `graded_details` đầy đủ |
| `PATCH` | `/v1/exams/sessions/:sessionId/grade` | `admin`, `teacher` | `{ grades: { [questionId]: { points_awarded, comment? } } }` — chỉ câu `essay`; cập nhật tổng `score` và `grading_status` |

**Server-authoritative runtime:** Khi hết giờ từ realtime (`exam:force_submit`), server sẽ tự động force-submit toàn bộ phiên còn `active` của đề thi, ưu tiên dùng autosave snapshot mới nhất nếu có.

### Integrity log + autosave (contract cho FE fail-safe)

Mục này dành cho flow Phase 1 FE đang gửi dữ liệu từ client queue/retry. BE có thể implement sau mà không làm FE vỡ.

| Method | Path | Role | Mô tả |
|--------|------|------|--------|
| `POST` | `/v1/exams/integrity-events` | `student` | Nhận batch sự kiện giám sát fullscreen/tab/focus/copy... |
| `POST` | `/v1/exams/autosave` | `student` | Nhận snapshot nháp mới nhất của bài đang làm |

Xem chi tiết payload/response/schema DB ở file: `EXAM_INTEGRITY_AUTOSAVE_CONTRACT.md`.

---

## Tài khoản seed test (Neon / PostgreSQL)

Dùng khi quên mật khẩu hoặc dữ liệu cũ lưu sai (plaintext trong `hashed_password`). **Mật khẩu chung cho cả 3 user:** `Test@123` (bcrypt cost 12, khớp `auth.service`).

Enum Postgres `user_role`: **`admin`**, **`teacher`**, **`student`** (không có `lecturer`).

Chạy trong **Neon → SQL Editor** (hoặc bất kỳ client Postgres nào trỏ đúng database).

```sql
-- Bảng: accounts | role khớp enum user_role
-- Nếu cần cast: 'admin'::user_role, 'teacher'::user_role, 'student'::user_role

| Role | Email |


## Tài Khoản Test

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin01@system.local` | `Test@123` |
| Teacher | `gv01@system.local` | `Test@123` |
| Student | `sv01@system.local` | `Test@123` |

sinh viên và teacher chỉ có login ko có register 
deadline cho bài thi 
nhắc nhở => gửi về mail 



**Đăng nhập** (`POST /v1/auth/login`) — mật khẩu: **`Test@123`**



---

## Ghi chú

- **Cập nhật danh sách:** Khi thêm/sửa file trong `src/routes/v1/`, nhớ chỉnh lại `API.md` cho khớp.
- Trong repo còn `boardRouter.ts`, `examSessionRouter.ts` nhưng **chưa được mount** trong `src/routes/v1/index.ts` — không có trên server cho đến khi bạn `RouterV1.use(...)`.
