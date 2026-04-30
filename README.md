# Hệ Thống Thi Trực Tuyến CNTT16-02

> **学者は手に持つ。**
> *"Người học thức giấc trong tay."*
>
> **Online Examination System** — Hệ thống thi trực tuyến hỗ trợ giám sát, chấm tự động, và dự đoán điểm bằng AI MiniMax.

**Cập nhật:** 2026-04-30

---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Tính năng chính](#tính-năng-chính)
- [Tech Stack](#tech-stack)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Yêu cầu & Cài đặt](#yêu-cầu--cài-đặt)
- [Tài khoản mặc định](#tài-khoản-mặc-định)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Cấu trúc Database](#cấu-trúc-database)
- [Chạy Tests](#chạy-tests)
- [Công nghệ & Thư viện](#công-nghệ--thư-viện)

---

## Tổng quan

Hệ thống thi trực tuyến được xây dựng cho ngành Công nghệ Thông tin (CNTT16-02) với các chức năng:

- **Quản lý đề thi** — teacher/admin tạo, sửa, xóa đề thi (trắc nghiệm + tự luận)
- **Làm bài thi** — sinh viên làm bài với fullscreen gate, timer, autosave 10s
- **Giám sát realtime** — Socket.IO cho teacher theo dõi phiên thi, force-submit
- **Chống gian lận** — tracking fullscreen exit, tab switch, copy/paste, blur
- **AI dự đoán điểm** — MiniMax API dự đoán điểm các môn tiếp theo dựa trên kết quả vừa thi
- **Đa ngôn ngữ** — giao diện hỗ trợ Tiếng Việt, English, 日本語

---

## Tính năng chính

### Backend
| Tính năng | Mô tả |
|-----------|-------|
| Auth JWT | Đăng nhập, đăng ký, refresh token |
| RBAC | Phân quyền admin / teacher / student |
| 1 thiết bị = 1 session | Revoke session cũ khi đăng nhập thiết bị mới |
| Exam CRUD | Tạo/sửa/xóa đề thi + câu hỏi |
| Auto-grading | Trắc nghiệm chấm tự động, tự luận chấm tay |
| Autosave | Lưu đáp án tạm mỗi 10s khi đang thi |
| Integrity tracking | Ghi log fullscreen exit, tab switch, copy/paste |
| Realtime (Socket.IO) | Teacher start/stop exam, force-submit, cảnh báo 15p |
| AI Prediction | MiniMax dự đoán điểm dựa trên lịch sử + Pearson correlation |
| Word import | Upload `.docx` để tạo đề thi nhanh |
| Email reminder | Nhắc hạn thi qua SMTP |

### Frontend
| Tính năng | Mô tả |
|-----------|-------|
| Login | i18n (VI/EN/JA) |
| Dashboard | View khác nhau cho student / teacher / admin |
| Exam List | Student: Take / View Result; Staff: Start Runtime / Force Submit |
| ExamTake | Fullscreen gate, timer, autosave, integrity tracking, force-submit handler |
| AI Prediction | Gọi BE → hiển thị dự đoán từ MiniMax |
| Student Management | Admin CRUD tài khoản sinh viên |
| i18n | Đầy đủ cho login, exam, dashboard, prediction |

---

## Tech Stack

### Frontend
```
React 19 + TypeScript + Vite 7
Mantine v8 (UI components)
Redux Toolkit + Redux Persist
React Router v7
Socket.IO Client
i18next (đa ngôn ngữ)
SCSS + Mantine Charts + Recharts
Storybook (component docs)
Vitest + Playwright (testing)
```

### Backend
```
Node.js + TypeScript + Express 5
PostgreSQL (Neon)
Socket.IO 4
JWT (jsonwebtoken) + bcrypt
Swagger UI Express (API docs)
Vitest (unit test)
```

---

## Cấu trúc dự án

```
GraduationProject/
├── BackEnd/server/
│   ├── src/
│   │   ├── config/          # enviroment, prediction config
│   │   ├── controllers/      # route handlers
│   │   ├── db/migrations/    # SQL migration files
│   │   ├── middlewares/      # auth, role, error handler
│   │   ├── models/           # database models
│   │   ├── routes/v1/        # API routes
│   │   ├── services/         # business logic
│   │   ├── socket/           # Socket.IO handlers
│   │   ├── utils/           # helpers
│   │   └── server.ts         # entry point
│   ├── scripts/             # socket test scripts
│   └── package.json
│
├── FrontEnd/client/
│   ├── src/
│   │   ├── components/      # reusable UI components
│   │   ├── pages/           # page components
│   │   ├── services/         # API clients
│   │   ├── store/           # Redux store
│   │   ├── locales/        # i18n translation files
│   │   ├── hooks/          # custom React hooks
│   │   └── App.tsx
│   └── package.json
│
├── cntt1602_grades.json     # Knowledge base cho AI prediction
├── dashboard.pen            # Pencil design file
└── README.md
```

---

## Yêu cầu & Cài đặt

### 1. Yêu cầu

- **Node.js** >= 18
- **PostgreSQL** (Neon PostgreSQL hoặc local)
- **MiniMax API Key** (cho tính năng AI prediction — optional)

### 2. Cài đặt Backend

```bash
cd BackEnd/server
npm install

# Tạo database schema (chạy trên pgAdmin hoặc psql)
# Xem file: src/db/migrations/009_clean_schema_with_subjects.sql

# Copy và điền .env
cp .env.example .env

# Chạy dev server
npm run dev
# Server chạy tại http://localhost:5000
```

### 3. Cài đặt Frontend

```bash
cd FrontEnd/client
npm install
npm run dev
# Client chạy tại http://localhost:5173
```

### 4. Database Setup (Neon PostgreSQL)

1. Tạo database trên [Neon Console](https://console.neon.tech)
2. Chạy file SQL trong pgAdmin:
   ```
   BackEnd/server/src/db/migrations/009_clean_schema_with_subjects.sql
   ```
   File này tạo đầy đủ bảng và seed dữ liệu mẫu.

---

## Tài khoản mặc định

Sau khi chạy migration, các tài khoản sau sẽ được tạo:

| Email | Password | Role |
|-------|----------|------|
| admin01@system.local | Test@123 | admin |
| teacher01@system.local | Test@123 | teacher |
| student01@system.local | Test@123 | student |

> ⚠️ **Lưu ý:** Đổi mật khẩu mặc định trước khi triển khai production.

---

## Environment Variables

### Backend — `BackEnd/server/.env`

```env
# Server
APP_PORT=5000
APP_HOST=localhost

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT
JWT_SECRET=your_strong_secret_key_here
JWT_EXPIRES_IN=1d

# CORS
CORS_ORIGINS=http://localhost:5173,https://nhongplus.id.vn

# SMTP (optional — cho email nhắc hạn thi)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@email.com
SMTP_PASS=your_password
MAIL_FROM=noreply@exam.local

# MiniMax AI (optional — cho AI Prediction)
MINIMAX_API_KEY=your_minimax_api_key
MINIMAX_BASE_URL=https://api.minimax.chat/v1
MINIMAX_MODEL=MiniMax-M2.7
```

### Frontend — `FrontEnd/client/.env`

```env
VITE_API_URL=http://localhost:5000
```

---

## API Endpoints

### Base URL: `http://localhost:5000/api/v1`

### Auth
| Method | Endpoint | Mô tả | Role |
|--------|----------|--------|------|
| POST | `/auth/login` | Đăng nhập | public |
| POST | `/auth/register` | Tạo tài khoản | admin |

### Users
| Method | Endpoint | Mô tả | Role |
|--------|----------|--------|------|
| GET | `/users` | Danh sách user | admin |
| POST | `/users` | Tạo user | admin |
| GET | `/users/:id` | Chi tiết user | admin |
| PATCH | `/users/:id` | Cập nhật user | admin |
| DELETE | `/users/:id` | Xóa user | admin |

### Exams
| Method | Endpoint | Mô tả | Role |
|--------|----------|--------|------|
| GET | `/exams` | Danh sách đề thi | all |
| POST | `/exams` | Tạo đề thi | teacher, admin |
| GET | `/exams/:id` | Chi tiết đề thi | all |
| PATCH | `/exams/:id` | Cập nhật đề thi | teacher, admin |
| DELETE | `/exams/:id` | Xóa đề thi | admin |
| POST | `/exams/:examId/questions` | Thêm câu hỏi | teacher, admin |
| GET | `/exams/:examId/questions` | Danh sách câu hỏi | all |
| DELETE | `/exams/:examId/questions/:qId` | Xóa câu hỏi | teacher, admin |
| POST | `/exams/:examId/sessions` | Bắt đầu phiên thi | student |
| POST | `/exams/:examId/submit` | Nộp bài | student |
| POST | `/exams/:examId/force-submit` | Ép nộp | teacher, admin |
| GET | `/exams/:examId/my-submission` | Xem kết quả | student |
| GET | `/exams/:examId/sessions` | Danh sách phiên | teacher, admin |
| POST | `/exams/:examId/autosave` | Lưu tạm đáp án | student |
| POST | `/exams/:examId/integrity-events` | Ghi sự kiện integrity | student |
| POST | `/exams/:examId/start-runtime` | Bắt đầu thi (realtime) | teacher, admin |
| GET | `/exams/:examId/import-word/preview` | Preview Word import | teacher, admin |
| POST | `/exams/:examId/import-word/commit` | Commit Word import | teacher, admin |

### Exam Sessions
| Method | Endpoint | Mô tả | Role |
|--------|----------|--------|------|
| GET | `/exam-sessions` | Danh sách phiên | staff |
| GET | `/exam-sessions/:id` | Chi tiết phiên | student, staff |
| PATCH | `/exam-sessions/:id/grade` | Chấm điểm tự luận | teacher, admin |
| GET | `/exam-sessions/:id/grading` | Xem chi tiết chấm | teacher, admin |

### Classes
| Method | Endpoint | Mô tả | Role |
|--------|----------|--------|------|
| GET | `/classes` | Danh sách lớp | all |

### Dashboard
| Method | Endpoint | Mô tả | Role |
|--------|----------|--------|------|
| GET | `/dashboard` | Thống kê dashboard | all |

### Board
| Method | Endpoint | Mô tả | Role |
|--------|----------|--------|------|
| GET | `/board` | Bảng điểm | all |

### AI Prediction
| Method | Endpoint | Mô tả | Role |
|--------|----------|--------|------|
| POST | `/prediction` | Dự đoán điểm bằng AI | student, teacher, admin |

### API Documentation

Swagger UI: `http://localhost:5000/api-docs`

---

## Cấu trúc Database

```
accounts
  ├── id (UUID)
  ├── email, username (UNIQUE)
  ├── hashed_password
  ├── role (admin|teacher|student)
  ├── full_name, is_active
  └── created_at, updated_at

subjects
  ├── id (UUID)
  ├── name (UNIQUE)
  ├── code, credits, semester
  ├── category
  └── is_active

classes
  ├── id (UUID)
  ├── subject_id → subjects.id
  ├── teacher_id → accounts.id
  └── semester, year

enrollments
  ├── id (UUID)
  ├── class_id → classes.id
  ├── student_id → accounts.id
  └── enrolled_at

exams
  ├── id (UUID)
  ├── title, description
  ├── class_id → classes.id
  ├── created_by → accounts.id
  ├── duration_min
  ├── closes_at
  └── created_at

questions
  ├── id (UUID)
  ├── exam_id → exams.id
  ├── content, question_type (mcq|essay)
  ├── options (JSONB)
  ├── correct_answer (JSONB)
  ├── points, display_order
  └── created_at

exam_sessions
  ├── id (UUID)
  ├── exam_id → exams.id
  ├── student_id → accounts.id
  ├── status (active|submitted|expired)
  ├── started_at, submitted_at
  ├── score, max_points
  ├── student_answers (JSONB)
  ├── graded_details (JSONB)
  ├── grading_status
  └── created_at

exam_session_autosaves
  ├── id (UUID)
  ├── session_id → exam_sessions.id
  ├── exam_id → exams.id
  ├── student_id → accounts.id
  ├── answers (JSONB)
  ├── saved_at, server_at

exam_integrity_events
  ├── id (UUID)
  ├── exam_id → exams.id
  ├── session_id → exam_sessions.id
  ├── student_id → accounts.id
  ├── event_type
  ├── event_at
  ├── details (JSONB)
  └── created_at

exam_deadline_notifications
  ├── id (UUID)
  ├── exam_id → exams.id
  ├── student_id → accounts.id
  ├── sent_at
  ├── notification_type
  └── created_at

user_sessions
  ├── id (UUID)
  ├── user_id → accounts.id
  ├── device_id, device_info
  ├── token_hash
  ├── is_active
  ├── created_at, expires_at, last_active_at
```

---

## Chạy Tests

### Backend

```bash
cd BackEnd/server
npm test          # chạy tất cả tests
npm run test:ui   # mở Vitest UI
npm run test:coverage  # coverage report
```

### Frontend

```bash
cd FrontEnd/client
npm test          # unit tests
npm run test:ui   # mở Vitest UI
```

### Kết quả hiện tại

| Layer | Tests | Status |
|-------|-------|--------|
| Backend | 40 passed | ✅ |
| Frontend | 5 passed | ✅ |

---

## Socket.IO Events

### Client → Server

| Event | Payload | Mô tả |
|-------|---------|-------|
| `exam:join` | `{ examId, sessionId }` | Student vào phòng thi |
| `exam:leave` | `{ examId, sessionId }` | Student rời phòng thi |
| `exam:start` | `{ examId }` | Teacher bắt đầu thi |

### Server → Client

| Event | Payload | Mô tả |
|-------|---------|-------|
| `final_15m` | `{ examId, endsAt }` | Cảnh báo 15 phút cuối |
| `proctor_alert` | `{ type, message }` | Cảnh báo từ teacher |
| `force_submit` | `{ sessionId, summary }` | Ép nộp bài thi |

---

## Công nghệ & Thư viện

### Backend Dependencies

| Package | Version | Mục đích |
|---------|---------|---------|
| express | ^5.2.1 | Web framework |
| socket.io | ^4.8.3 | Realtime |
| pg | ^8.18.0 | PostgreSQL client |
| jsonwebtoken | ^9.0.3 | JWT auth |
| bcrypt | ^6.0.0 | Password hashing |
| cors | ^2.8.6 | CORS |
| dotenv | ^17.3.1 | Env vars |
| joi | ^18.0.2 | Validation |
| mammoth | ^1.12.0 | Word import |
| nodemailer | ^6.9.16 | Email |
| swagger-ui-express | ^5.0.1 | API docs |
| vitest | ^4.1.4 | Testing |

### Frontend Dependencies

| Package | Version | Mục đích |
|---------|---------|---------|
| react | ^19.2.0 | UI framework |
| @mantine/core | ^8.3.10 | UI components |
| @reduxjs/toolkit | ^2.7.0 | State management |
| react-router-dom | ^7.11.0 | Routing |
| socket.io-client | ^4.8.3 | Realtime client |
| i18next | ^25.7.3 | i18n |
| axios | ^1.13.6 | HTTP client |
| recharts | ^3.6.0 | Charts |
| vitest | ^4.0.18 | Testing |
| storybook | ^10.2.8 | Component docs |

---

## Liên hệ & Contributing

- **Author:** NhongPlus
- **License:** MIT

> 勉強は続けた方がいいよ。だってさ、体は正直だから。
> *"Học tập là điều nên tiếp tục. Bởi vì cơ thể con người là thật lòng nhất."*
>
> Hệ thống được phát triển phục vụ đồ án tốt nghiệp ngành Công nghệ Thông tin.