# Danh sách API (Back-end)

**Base path:** `{BASE}/v1` — trong đó `{BASE}` tùy môi trường:

- **Production:** `https://api.nhongplus.id.vn` → API REST: `https://api.nhongplus.id.vn/v1/...`
- **Local:** `http://{APP_HOST}:{APP_PORT}` (ví dụ `http://localhost:5000`)

**Frontend production:** `https://nhongplus.id.vn` — cần khớp **CORS** / **Socket.IO** (`CORS_ORIGINS` trong `.env`, xem `src/config/enviroment.ts`).

**SPA (React `BrowserRouter`):** Host tĩnh phải trả `index.html` cho mọi path kiểu `/login` (không tìm file tên `login`). Nếu không, lần đầu vào `/` rồi điều hướng trong app có thể vẫn OK, nhưng **F5 hoặc mở thẳng URL** sẽ **404**. Trong repo FE: `public/_redirects` (Netlify / Cloudflare Pages), `vercel.json` (Vercel), `public/.htaccess` (Apache); Nginx dùng `try_files $uri /index.html`.

**Auth:** Các route dưới `/v1/users` và `/v1/exams` cần header `Authorization: Bearer <token>` (trừ khi ghi rõ là public).

---

## Root (ngoài `/v1`)

| Method | Path | Mô tả |
|--------|------|--------|
| `GET` | `/` | Healthcheck — `{ success, message }` |

---

## Auth — `/v1/auth`

| Method | Path | Auth | Role | Mô tả |
|--------|------|------|------|--------|
| `POST` | `/v1/auth/register` | Không | — | Đăng ký (`email`, `username`, `password`, `role`, `full_name` optional). `role` ∈ `admin` \| `teacher` \| `student` (khớp enum `user_role` trên DB) |
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

## Exams — `/v1/exams`

Tất cả route: **có JWT**. Role cụ thể xem cột Role.

### Đề thi

| Method | Path | Role | Mô tả |
|--------|------|------|--------|
| `GET` | `/v1/exams` | `admin`, `teacher`, `student` | Danh sách đề |
| `POST` | `/v1/exams` | `admin`, `teacher` | Tạo đề |
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
| `GET` | `/v1/exams/:examId/my-submission` | `student` | Bản nộp `submitted` mới nhất của tôi cho đề này + chi tiết (không lộ đáp án đúng) |
| `GET` | `/v1/exams/sessions/:sessionId/grading` | `admin`, `teacher` | Dữ liệu chấm tay (GV tạo đề hoặc admin): bài làm + đề + `graded_details` đầy đủ |
| `PATCH` | `/v1/exams/sessions/:sessionId/grade` | `admin`, `teacher` | `{ grades: { [questionId]: { points_awarded, comment? } } }` — chỉ câu `essay`; cập nhật tổng `score` và `grading_status` |

---

## Tài khoản seed test (Neon / PostgreSQL)

Dùng khi quên mật khẩu hoặc dữ liệu cũ lưu sai (plaintext trong `hashed_password`). **Mật khẩu chung cho cả 3 user:** `Test@123` (bcrypt cost 12, khớp `auth.service`).

Enum Postgres `user_role`: **`admin`**, **`teacher`**, **`student`** (không có `lecturer`).

Chạy trong **Neon → SQL Editor** (hoặc bất kỳ client Postgres nào trỏ đúng database).

```sql
-- Bảng: accounts | role khớp enum user_role
-- Nếu cần cast: 'admin'::user_role, 'teacher'::user_role, 'student'::user_role

| Role | Email |


13	admin01@system.local
14	admin02@system.local
15	teacher01@system.local
16	teacher02@system.local
17	student01@system.local
18	student02@system.local
pass Test@123

**Đăng nhập** (`POST /v1/auth/login`) — mật khẩu: **`Test@123`**



---

## Ghi chú

- **Cập nhật danh sách:** Khi thêm/sửa file trong `src/routes/v1/`, nhớ chỉnh lại `API.md` cho khớp.
- Trong repo còn `boardRouter.ts`, `examSessionRouter.ts` nhưng **chưa được mount** trong `src/routes/v1/index.ts` — không có trên server cho đến khi bạn `RouterV1.use(...)`.
