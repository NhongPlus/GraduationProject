# Role Permissions — Hệ thống thi trực tuyến

**Cập nhật:** 2026-05-08

---

## Tổng quan Role

| Role | Backend | Frontend | Mô tả |
|------|---------|---------|-------|
| `admin` | ✅ | ✅ | Quản trị viên |
| `teacher` | ✅ | ❌ (map thành `user`) | Giáo viên — FE không nhận diện riêng |
| `student` | ✅ | ✅ (map thành `user`) | Học sinh — nằm chung `user` với teacher |

### Frontend chỉ có 2 role

```typescript
// Frontend authSlice.ts
type FrontendRole = 'admin' | 'user';
```

```typescript
// resolveRoleFromStorage()
if (role === 'admin') return 'admin';
return 'user'; // teacher + student đều thành 'user'
```

**Hệ quả:** Teacher không có trang riêng, dùng chung giao diện student nhưng vẫn có quyền của teacher nhờ BE role middleware.

---

## Frontend — Route Authority

| Trang | Path | FE authority | Ai được vào |
|-------|------|-------------|-------------|
| Dashboard | `/main` | `['user', 'admin']` | student + teacher + admin |
| Danh sách bài thi | `/exams` | `['user', 'admin']` | student + teacher + admin |
| **Tạo bài thi** | `/exams/new` | `['admin']` | **Chỉ admin** |
| **Sửa bài thi** | `/exams/:id/edit` | `['admin']` | **Chỉ admin** |
| Làm bài thi | `/exam/:id` | `['user', 'admin']` | student + teacher + admin |
| Xem kết quả | `/result/:examId` | `['user', 'admin']` | student + teacher + admin |
| Dự đoán điểm | `/prediction` | `['user', 'admin']` | student + teacher + admin |
| Kết quả của tôi | `/my-results` | `['user', 'admin']` | student + teacher + admin |
| Hồ sơ | `/profile` | `['user', 'admin']` | student + teacher + admin |
| Quản lý sinh viên | `/admin/students` | `['admin']` | Chỉ admin |
| Chấm điểm | `/grading/:sessionId` | `['user', 'admin']` | student + teacher + admin |
| Phiên thi | `/exam-sessions/:examId` | `['user', 'admin']` | student + teacher + admin |
| Giám sát thi | `/proctoring/:examId` | `['admin']` | Chỉ admin |
| Reset password | `/admin/password-resets` | `['admin']` | Chỉ admin |
| Phân tích điểm | `/score-analytics` | `['admin']` | Chỉ admin |
| Audit log | `/admin/audit-logs` | `['admin']` | Chỉ admin |
| System report | `/admin/system-report` | `['admin']` | Chỉ admin |

---

## Backend — API Permission Matrix

### Router phân loại theo URL gốc

---

### `GET /v1/dashboard` → dashboardRouter
| Method | Path | Roles |
|--------|------|-------|
| GET | `/ping` | public (no auth) |
| GET | `/` | admin, teacher, student |

---

### `POST /v1/auth` → authRouter
| Method | Path | Roles |
|--------|------|-------|
| POST | `/login` | public (no auth) |
| POST | `/register` | admin |

---

### `GET|POST|PATCH|DELETE /v1/users` → userRouter
| Method | Path | Roles |
|--------|------|-------|
| GET | `/` | admin |
| POST | `/` | admin |
| GET | `/:id` | admin |
| PATCH | `/:id` | admin |
| PATCH | `/:id/password` | admin (changePasswordController — không dùng roleMiddleware) |
| DELETE | `/:id` | admin |

---

### `GET|POST|PATCH|DELETE /v1/exams` → examRouter
| Method | Path | Roles |
|--------|------|-------|
| GET | `/sessions/me` | admin, teacher, student |
| POST | `/sessions/:sessionId/submit` | student |
| GET | `/sessions/:sessionId/grading` | admin, teacher |
| PATCH | `/sessions/:sessionId/grade` | admin, teacher |
| POST | `/integrity-events` | student |
| POST | `/autosave` | student |
| GET | `/` | admin, teacher, student |
| POST | `/` | admin, teacher |
| POST | `/import-word/preview` | admin, teacher |
| POST | `/import-word/commit` | admin, teacher |
| POST | `/import-word/ai-recompose` | admin, teacher |
| GET | `/:id` | admin, teacher, student |
| PATCH | `/:id` | admin, teacher |
| DELETE | `/:id` | admin, teacher |
| GET | `/:examId/questions` | admin, teacher, student |
| POST | `/:examId/questions` | admin, teacher |
| DELETE | `/:examId/questions/:questionId` | admin, teacher |
| POST | `/:examId/sessions` | student |
| GET | `/:examId/sessions` | admin, teacher |
| GET | `/:examId/proctoring` | admin, teacher |
| POST | `/:examId/start-runtime` | admin, teacher |
| POST | `/:examId/force-submit` | admin, teacher |
| GET | `/:examId/my-submission` | student |

---

### `POST /v1/exam-sessions` → examSessionRouter
| Method | Path | Roles |
|--------|------|-------|
| POST | `/` | student |
| POST | `/:sessionId/submit` | student |

> **Note:** `examRouter` có `GET /sessions/me` (admin/teacher/student) và `POST /sessions/:sessionId/submit` (student).
> `examSessionRouter` có `POST /` (student) và `POST /:sessionId/submit` (student) — trùng về logic nhưng 2 router riêng.

---

### `GET /v1/classes` → classRouter
| Method | Path | Roles |
|--------|------|-------|
| GET | `/` | admin, teacher, student |

---

### `POST /v1/prediction` → predictionRouter
| Method | Path | Roles |
|--------|------|-------|
| POST | `/` | student, teacher, admin |

---

### `GET|POST /v1/password-reset` → passwordResetRouter
| Method | Path | Roles |
|--------|------|-------|
| POST | `/self` | public (no auth) |
| POST | `/` | admin |
| GET | `/pending` | admin |
| POST | `/approve` | admin |
| POST | `/reject` | admin |
| GET | `/me` | admin, teacher, student |

---

### `GET /v1/score-analytics` → scoreAnalyticsRouter
| Method | Path | Roles |
|--------|------|-------|
| GET | `/exam/:examId` | admin, teacher |
| GET | `/subjects` | admin, teacher |

---

### `GET /v1/audit-logs` → auditLogRouter
| Method | Path | Roles |
|--------|------|-------|
| GET | `/` | admin |

---

### `GET /v1/system-report` → systemReportRouter
| Method | Path | Roles |
|--------|------|-------|
| GET | `/` | admin |

---

### `GET|PATCH /v1/notifications` → notificationRouter
| Method | Path | Roles |
|--------|------|-------|
| GET | `/` | admin, teacher, student (logic phân chia bên trong) |
| GET | `/user` | admin, teacher, student |
| PATCH | `/:id/read` | admin, teacher, student |
| PATCH | `/read-all` | admin, teacher, student |

---

### `GET|POST /v1/board` → boardRouter
| Method | Path | Roles |
|--------|------|-------|
| GET | `/` | public (no auth) |
| POST | `/` | public (boardValidation) |

---

## Tổng hợp quyền theo role

### `student` — Học sinh
- `GET /v1/dashboard` → dashboard cá nhân
- `GET /v1/exams` → danh sách bài thi ( enrolled)
- `GET /v1/exams/:id` → xem bài thi
- `GET /v1/exams/:examId/questions` → lấy câu hỏi (không đáp án)
- `POST /v1/exam-sessions` → bắt đầu phiên thi
- `POST /v1/exam-sessions/:sessionId/submit` → nộp bài
- `POST /v1/exams/sessions/me` → xem phiên thi của mình
- `POST /v1/exams/sessions/:sessionId/submit` → nộp bài (examRouter)
- `POST /v1/exams/:examId/sessions` → tạo session mới
- `GET /v1/exams/:examId/my-submission` → xem bài nộp
- `POST /v1/exams/integrity-events` → gửi sự kiện integrity
- `POST /v1/exams/autosave` → tự động lưu
- `POST /v1/prediction` → dự đoán điểm
- `GET /v1/classes` → danh sách lớp
- `POST /v1/password-reset/self` → yêu cầu reset password
- `GET /v1/password-reset/me` → xem yêu cầu reset của mình
- `GET /v1/notifications` → thông báo
- `GET /v1/notifications/user` → thông báo cá nhân

### `teacher` — Giáo viên
- `GET /v1/dashboard` → dashboard của giáo viên (tất cả lớp)
- `GET /v1/exams` → danh sách tất cả bài thi
- `POST /v1/exams` → tạo bài thi
- `PATCH /v1/exams/:id` → sửa bài thi (chủ đề)
- `DELETE /v1/exams/:id` → xóa bài thi (chủ đề)
- `GET /v1/exams/:id/questions` → lấy câu hỏi (có đáp án)
- `POST /v1/exams/:examId/questions` → thêm câu hỏi
- `DELETE /v1/exams/:examId/questions/:questionId` → xóa câu hỏi
- `GET /v1/exams/:examId/sessions` → xem tất cả phiên thi
- `GET /v1/exams/sessions/:sessionId/grading` → xem chấm điểm
- `PATCH /v1/exams/sessions/:sessionId/grade` → chấm điểm
- `GET /v1/exams/:examId/proctoring` → giám sát thi
- `POST /v1/exams/:examId/start-runtime` → bắt đầu phiên thi
- `POST /v1/exams/:examId/force-submit` → ép nộp
- `POST /v1/exams/import-word/preview` → xem trước import
- `POST /v1/exams/import-word/commit` → commit import
- `POST /v1/exams/import-word/ai-recompose` → AI sửa lại
- `GET /v1/classes` → danh sách lớp
- `GET /v1/score-analytics/exam/:examId` → phân tích điểm
- `GET /v1/score-analytics/subjects` → phân tích theo môn
- `POST /v1/prediction` → dự đoán điểm
- `POST /v1/password-reset/self` → yêu cầu reset password
- `GET /v1/password-reset/me` → xem yêu cầu reset
- `GET /v1/notifications` → thông báo
- `GET /v1/notifications/user` → thông báo cá nhân

### `admin` — Quản trị viên
- Tất cả quyền của teacher
- `GET /v1/users` → danh sách users
- `POST /v1/users` → tạo user
- `GET /v1/users/:id` → xem user
- `PATCH /v1/users/:id` → sửa user
- `DELETE /v1/users/:id` → xóa user
- `PATCH /v1/users/:id/password` → đổi password user
- `GET /v1/audit-logs` → xem audit log
- `GET /v1/system-report` → xem system report
- `GET /v1/password-reset/pending` → xem yêu cầu reset chờ
- `POST /v1/password-reset/approve` → duyệt reset
- `POST /v1/password-reset/reject` → từ chối reset
- `POST /v1/auth/register` → tạo tài khoản
- `GET /v1/exams/sessions/me` → xem phiên thi (admin cũng có quyền)
- `GET /v1/score-analytics/exam/:examId` → phân tích điểm
- `GET /v1/score-analytics/subjects` → phân tích theo môn

---

## Vấn đề cần sửa

### 1. Frontend không nhận diện teacher riêng
- `authSlice.ts` map teacher → user → `isTeacher = false`
- Teacher không có trang riêng, dùng chung giao diện student
- **Hệ quả:** Teacher bị chặn ở FE dù BE cho phép nhiều hơn student

### 2. `/v1/exams/sessions/me` trả 403 cho admin
- Route có role `[admin, teacher, student]` nhưng logic bên trong có thể sai

### 3. Trang tạo bài thi (`/exams/new`) chỉ `authority: ['admin']`
- Teacher bị chặn ở FE dù BE cho phép teacher tạo bài thi

### 4. Grading page dùng `authority: ['user', 'admin']`
- Teacher = user nên teacher vào được grading page
- Nhưng không có trang riêng cho teacher, dùng chung route student

---

## Đề xuất phân vùng lại (phân quyền lại FE)

**Phương án A (nhanh):** Thêm `teacher` vào `FrontendRole`, cập nhật `authority` các trang.

```typescript
// authSlice.ts — đề xuất
export type FrontendRole = 'admin' | 'teacher' | 'user'; // user = student
```

**Phương án B (chuẩn):** Tách riêng hoàn toàn — `student`, `teacher`, `admin`, cập nhật cả BE lẫn FE.

```typescript
// authSlice.ts — đề xuất B
export type FrontendRole = 'admin' | 'teacher' | 'student';
function resolveRoleFromStorage(): FrontendRole {
  const role = localStorage.getItem(USER_ROLE_KEY);
  if (role === 'admin') return 'admin';
  if (role === 'teacher') return 'teacher';
  return 'student';
}
```

### Các trang cần thay đổi authority:

| Trang | Hiện tại | Đề xuất |
|-------|---------|---------|
| Tạo bài thi `/exams/new` | `['admin']` | `['admin', 'teacher']` |
| Sửa bài thi `/exams/:id/edit` | `['admin']` | `['admin', 'teacher']` |
| Phân tích điểm `/score-analytics` | `['admin']` | `['admin', 'teacher']` |
| Giám sát thi `/proctoring/:examId` | `['admin']` | `['admin', 'teacher']` |

---

## Các router trong hệ thống

```
/v1/auth/*           → authRouter
/v1/users/*          → userRouter
/v1/dashboard/*      → dashboardRouter
/v1/exams/*          → examRouter
/v1/exam-sessions/*  → examSessionRouter
/v1/classes/*        → classRouter
/v1/board/*          → boardRouter
/v1/prediction/*     → predictionRouter
/v1/password-reset/* → passwordResetRouter
/v1/score-analytics/* → scoreAnalyticsRouter
/v1/audit-logs/*     → auditLogRouter
/v1/system-report/*  → systemReportRouter
/v1/notifications/*  → notificationRouter
```