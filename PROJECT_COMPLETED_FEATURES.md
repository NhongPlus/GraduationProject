# Tính Năng Đã Hoàn Thiện & Hướng Dẫn Test

> Cập nhật: 2026-04-30 · Thêm AI Prediction bằng MiniMax

---

## I. TÍNH NĂNG ĐÃ LÀM

### Backend — Đã hoàn thiện

#### 1. Auth & Session
- [x] `POST /v1/auth/login` — đăng nhập JWT
- [x] `POST /v1/auth/register` — admin tạo tài khoản (admin/teacher/student)
- [x] Session management: `1 thiết bị = 1 session` (revoke session cũ khi login mới)
- [x] Token JWT với role payload
- [x] Middleware RBAC: `roleMiddleware`

#### 2. User Management
- [x] `GET /v1/users` — danh sách user (admin)
- [x] `POST /v1/users` — tạo user (admin)
- [x] `GET /v1/users/:id` — chi tiết user
- [x] `PATCH /v1/users/:id` — cập nhật user
- [x] `DELETE /v1/users/:id` — xóa user

#### 3. Exam CRUD
- [x] `GET /v1/exams` — danh sách đề thi
- [x] `POST /v1/exams` — tạo đề thi (admin/teacher)
- [x] `GET /v1/exams/:id` — chi tiết đề thi
- [x] `PATCH /v1/exams/:id` — cập nhật đề thi
- [x] `DELETE /v1/exams/:id` — xóa đề thi

#### 4. Question CRUD
- [x] `GET /v1/exams/:examId/questions` — danh sách câu hỏi (student ẩn đáp án đúng)
- [x] `POST /v1/exams/:examId/questions` — thêm câu hỏi (mcq / essay)
- [x] `DELETE /v1/exams/:examId/questions/:id` — xóa câu hỏi

#### 5. Exam Session & Submit
- [x] `POST /v1/exam-sessions` — student bắt đầu phiên thi ✅ **MỚI MOUNT**
- [x] `POST /v1/exam-sessions/:sessionId/submit` — student nộp bài ✅ **MỚI MOUNT**
- [x] `POST /v1/exams/:examId/force-submit` — teacher/admin ép nộp
- [x] Auto-grading trắc nghiệm, `pending_manual` cho tự luận
- [x] `GET /v1/exams/:examId/my-submission` — xem kết quả bài đã nộp
- [x] `GET /v1/exams/:examId/sessions` — staff xem danh sách phiên
- [x] `GET /v1/sessions/:sessionId/grading` — teacher/admin chấm điểm tự luận

#### 6. Autosave & Integrity
- [x] `POST /v1/exams/:examId/autosave` — lưu tạm đáp án (10s interval)
- [x] `POST /v1/exams/:examId/integrity-events` — ghi sự kiện toàn màn hình / tab switch / copy-paste / blur
- [x] Normalize `q1/q2` → `question_id` khi submit

#### 7. Realtime (Socket.IO)
- [x] `exam:join` / `exam:leave` — student tham gia/phòng khỏi phòng thi
- [x] `exam:start` — teacher bắt đầu thi, server timer, gửi `final_15m` warning
- [x] `proctor_alert` — gửi cảnh báo đến student
- [x] `force_submit` — ép nộp realtime kèm summary
- [x] JWT handshake verification

#### 8. Board & Misc
- [x] `GET /v1/board` ✅ **MỚI MOUNT**
- [x] Word `.docx` import (mammoth)
- [x] Email reminder scheduler cho exam deadline

#### 9. AI Prediction (MiniMax)
- [x] `POST /v1/prediction` — AI dự đoán điểm các môn tiếp theo dựa trên kết quả vừa thi
- [x] System prompt chứa knowledge base CNTT16-02 (37 SV, 52 môn, Pearson correlations, ĐTB lớp)
- [x] Tự động phát hiện môn phụ thuộc từ chuỗi prerequisites
- [x] Fallback khi parse JSON lỗi

#### Frontend — Prediction
- [x] `Prediction.tsx` gọi `POST /v1/prediction` (MiniMax AI), hiển thị `predictions[]`, `overall_advice`, `just_completed`
- [x] Fallback: hiển thị thông báo lỗi khi gọi BE thất bại

---

### Frontend — Đã hoàn thiện

#### 1. Auth
- [x] Login page với i18n (VI/EN/JP)
- [x] Session lưu localStorage (`access_token`, `user_role`, `user_name`, `user_email`)
- [x] Auth event dispatch khi login/logout
- [x] **ĐÃ SỬA**: role mapping — `teacher` không còn bị map thành `admin` trong UI

#### 2. Pages
- [x] Login
- [x] Dashboard (Admin/Teacher → staff view, Student → student view)
- [x] Exam List (staff: Start Runtime / Force Submit; student: Take / View Result)
- [x] **ExamTake** — fullscreen gate + timer + autosave 10s + integrity tracking + force-submit handler + 5s violation auto-submit lock
- [x] Admin StudentManagement (CRUD user accounts)
- [x] Prediction (client-side calculation)
- [x] Profile (đổi mật khẩu — **TODO: cần BE endpoint**)

#### 3. Realtime & Integrity
- [x] `examRealtimeSocket` — kết nối Socket.IO, nhận `force_submit` / `proctor_alert`
- [x] `startExamRealtime()` — teacher trigger start
- [x] Autosave queue → `POST /exams/autosave` mỗi 10s
- [x] Integrity event queue → `POST /exams/integrity-events`

#### 4. i18n
- [x] `vi`, `en`, `ja` — đầy đủ cho login, exam, dashboard

---

## II. HƯỚNG DẪN TEST UI

### 1. Chạy Backend + Frontend

```bash
# Terminal 1 — Backend
cd BackEnd/server
npm run migrate   # tạo bảng mới (008_fix_accounts_table)
npm run dev       # chạy localhost:5000

# Terminal 2 — Frontend
cd FrontEnd/client
npm run dev       # chạy localhost:3000
```

### 2. Test Auth Login

```
Email:    admin01@system.local
Password: Test@123

Role admin:   admin01@system.local / Test@123
Role teacher: teacher01@system.local / Test@123
Role student: student01@system.local / Test@123
```

1. Mở http://localhost:3000/login
2. Đăng nhập admin → vào Dashboard
3. Đăng nhập student → vào Dashboard (view khác)

### 3. Test Exam Flow (Student)

```
1. Login student
2. Vào Exam List
3. Bấm "Take" một bài thi
4. Verify:
   - Fullscreen được bật
   - Timer đếm ngược
   - Đáp án được autosave (kiểm tra Network tab → /exams/autosave)
   - Tab ra ngoài → sự kiện integrity được ghi (Network → /exams/integrity-events)
5. Hết giờ hoặc bấm Submit → xem kết quả
```

### 4. Test Force-Submit (Teacher)

```
1. Login teacher
2. Tạo 1 exam mới + vài câu hỏi
3. Mở tab khác, login student → vào bài thi đó
4. Tab teacher → Exam List → bấm "Force Submit"
5. Kiểm tra:
   - Tab student: nhận force_submit realtime, bài thi kết thúc ngay
   - Tab teacher: hiển thị summary (submitted/failed sessions)
   - DB: session status = submitted
```

### 5. Test Autosave

```
1. Login student → vào bài thi
2. Chọn đáp án vài câu
3. Đợi 10-15s (autosave interval)
4. Check Network tab:
   - POST /v1/exams/{id}/autosave với payload answers
5. Refresh trang → đáp án còn đó (localStorage draft)
```

### 6. Test Integrity Events

```
1. Login student → vào bài thi
2. Thử các hành động:
   - Bấm Ctrl+C / Ctrl+V → integrity copy_attempt / paste_attempt
   - Đóng fullscreen → fullscreen_exit
   - Tab sang tab khác → visibility_hidden / window_blur
3. Check Network → POST /v1/exams/{id}/integrity-events
```

### 7. Test Registration (Admin)

```
1. Login admin
2. Vào Student Management
3. Tạo user mới (email, username, password, role)
4. Verify: user xuất hiện trong danh sách
```

### 8. Test Socket Events

```bash
# Sau khi backend đang chạy
cd BackEnd/server
npm run socket:teacher-start  # teacher bắt đầu exam
npm run socket:proctor       # gửi alert đến room
npm run socket:smoke          # smoke test
```

---

## III. UNIT TEST

### Chạy tất cả

```bash
# Backend
cd BackEnd/server && npm test

# Frontend
cd FrontEnd/client && npm test
```

### Kết quả hiện tại

| Layer | Test Files | Tests | Status |
|-------|-----------|-------|--------|
| Backend | 5 | **40 passed** | ✅ |
| Frontend | 1 | **5 passed** | ✅ |

### Backend test files

| File | Tests | Coverage |
|------|-------|---------|
| `utils/examStartDeadline.test.ts` | 9 | `closesAt`, `isPastClosesAt`, `normalizeClosesAtInput` |
| `services/exam.service.test.ts` | 14 | `normalizeAutosaveToSubmitAnswers`, `normalizeIntegrityEvents`, `submitSessionService` validation |
| `services/auth.service.test.ts` | 10 | `registerUser`, `loginUser`, `verifyTokenPayload` |
| `services/examAutosave.test.ts` | 4 | `normalizeAutosaveToSubmitAnswers` (legacy qN mapping) |
| `services/examImport.service.test.ts` | 3 | Word import |

---

## IV. CÁC BƯỚC SETUP MỚI TỪ ĐẦU

```bash
cd BackEnd/server

# 1. Chạy tất cả migration (thứ tự: 001→008)
npm run migrate

# 2. Seed accounts (nếu có seed script)
# hoặc dùng tài khoản mặc định:
#   admin01@system.local / Test@123
#   teacher01@system.local / Test@123
#   student01@system.local / Test@123

# 3. Start server
npm run dev

# 4. Test login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin01@system.local","password":"Test@123"}'
```

---

## V. CÁC BUG ĐÃ SỬA (2026-04-30)

| # | Vấn đề | File | Trạng thái |
|---|--------|------|------------|
| 1 | `examSessionRouter` + `boardRouter` không mount | `routes/v1/index.ts` | ✅ Đã fix |
| 2 | `teacher` bị map thành `admin` trong UI | `store/authSlice.ts` | ✅ Đã fix |
| 3 | Schema lệch: migration `001` tạo bảng `users` nhưng code dùng `accounts` | `008_fix_accounts_table.sql` | ✅ Tạo migration mới |

---

## VI. CÒN CẦN LÀM (Roadmap tiếp theo)

| # | Tính năng | Ưu tiên |
|---|-----------|---------|
| 1 | Backend endpoint đổi mật khẩu (Profile) | Cao |
| 2 | Presence dashboard cho teacher (ai online trong exam) | Cao |
| 3 | ACK/retry cho realtime events | Trung bình |
| 4 | API Prediction (backend ML/rule-based) | Trung bình |
| 5 | Rate limiting + JWT secret validation | Trung bình |
| 6 | Audit logging cho admin actions | Thấp |
| 7 | Integration test cho force-submit | Thấp |
| 8 | E2E test cho full exam runtime flow | Thấp |
