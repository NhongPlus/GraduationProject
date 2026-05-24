# -*- coding: utf-8 -*-
"""Sinh file docs/DAC_TA_HE_THONG_CHI_TIET.md từ tài liệu đồ án và mã nguồn."""
from __future__ import annotations

from pathlib import Path

from dac_ta_build_db_section import build_section_6
from dac_ta_sections import FOOTER, SECTION_5, SECTION_7, SECTION_8

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "DAC_TA_HE_THONG_CHI_TIET.md"


def main() -> None:
    content = build_document()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(content, encoding="utf-8")
    print(f"Written {OUT} ({len(content):,} chars, {content.count(chr(10)):,} lines)")


def build_document() -> str:
    parts = [
        header(),
        section_1(),
        section_2(),
        section_3(),
        section_4(),
        section_5(),
        section_6(),
        section_7(),
        section_8(),
        footer(),
    ]
    return "\n\n".join(parts)


def header() -> str:
    return """# ĐẶC TẢ HỆ THỐNG SIÊU CHI TIẾT

## Hệ thống thi trực tuyến (Online Examination System)

**Nguồn trích xuất:** `BaoCaoDoAn_OnlineExamination.docx`, `BaoCaoDoAn_OnlineExamination_DaiNam.docx`, `TONGB_HOP_DOAN_TOT_NGHIEP.md`, `DO_AN_MASTER.md`, `docs/DOMAIN_MODEL.md`, `BackEnd/server/docs/ROLES_AND_PERMISSIONS.md`, `BackEnd/server/EXAM_INTEGRITY_AUTOSAVE_CONTRACT.md`, `BackEnd/server/SOCKET_IO_POC.md`, `TEST_STRATEGY_ADMIN_STUDENT.md`, migrations PostgreSQL (`BackEnd/server/src/db/migrations/`), `package.json` (BE/FE).

**Mã nguồn:** `C:\\VS-Code\\GraduationProject`

**Ngày lập đặc tả:** 2026-05-24

> **Ghi chú:** Tài liệu đồ án được cung cấp mô tả **Hệ thống thi trực tuyến** (React + Node.js + PostgreSQL + Socket.IO), không phải hệ thống quản lý văn bản/OCR. Các actor thực tế là **Admin**, **Giáo viên (teacher)**, **Sinh viên (student)** — không có actor Giáo vụ / Lãnh đạo khoa / Khách như mẫu đề tài khác. CSDL là **PostgreSQL** (không MySQL/Sequelize); frontend là **React SPA** (không EJS/Bootstrap).

---

## Mục lục

1. [Thông tin chung](#1-thông-tin-chung)
2. [Tổng quan, tính cấp thiết và mục tiêu cụ thể](#2-tổng-quan-tính-cấp-thiết-và-mục-tiêu-cụ-thể)
3. [Kiến trúc hệ thống chi tiết](#3-kiến-trúc-hệ-thống-chi-tiết)
4. [Đặc tả chi tiết công nghệ](#4-đặc-tả-chi-tiết-công-nghệ)
5. [Phân tích chức năng chi tiết theo Actor](#5-phân-tích-chức-năng-chi-tiết-theo-actor)
6. [Thiết kế Cơ sở dữ liệu vật lý](#6-thiết-kế-cơ-sở-dữ-liệu-vật-lý)
7. [Quy trình và thuật toán](#7-quy-trình-và-thuật-toán)
8. [Kịch bản kiểm thử và đánh giá hiệu năng](#8-kịch-bản-kiểm-thử-và-đánh-giá-hiệu-năng)"""


def section_1() -> str:
    return """---

## 1. Thông tin chung

| Hạng mục | Nội dung |
|----------|----------|
| **Tên đề tài** | XÂY DỰNG HỆ THỐNG THI TRỰC TUYẾN (ONLINE EXAMINATION SYSTEM) |
| **Sinh viên thực hiện** | ................................................ |
| **Mã sinh viên (MSV)** | ................................................ |
| **Người hướng dẫn** | Giảng viên hướng dẫn (theo bìa đồ án) |
| **Khoa** | CÔNG NGHỆ THÔNG TIN |
| **Trường** | TRƯỜNG ĐẠI HỌC ĐẠI NAM |
| **Bộ** | BỘ GIÁO DỤC VÀ ĐÀO TẠO |
| **Địa điểm, thời gian** | HÀ NỘI 2026 |
| **Kho mã nguồn** | `GraduationProject` — frontend `FrontEnd/client`, backend `BackEnd/server` |

### 1.1. Lời cam đoan (trích từ báo cáo)

Tôi xin cam đoan rằng đồ án tốt nghiệp với đề tài "Xây dựng hệ thống thi trực tuyến (Online Examination System)" là kết quả nghiên cứu và thực hiện của cá nhân tôi dưới sự hướng dẫn của giảng viên hướng dẫn. Các nội dung phân tích, thiết kế, triển khai và đánh giá được trình bày trong đồ án là trung thực; phần tham khảo từ tài liệu, mã nguồn mở và các công trình khác đã được trích dẫn trong phần tài liệu tham khảo. Tôi xin hoàn toàn chịu trách nhiệm trước nhà trường về tính trung thực của nội dung đồ án.

### 1.2. Thống kê hệ thống (theo `TONGB_HOP_DOAN_TOT_NGHIEP.md`)

| Chỉ số | Giá trị |
|--------|---------|
| Tổng số model (backend) | 31 |
| Tổng số router (API) | 25 |
| Tổng số trang (frontend) | 33+ |
| Tổng số migration SQL | 37–42 file |
| Tổng số bảng CSDL nghiệp vụ | 28 (+ `_migrations`) |
| Số môn học seed CNTT 16-02 | 52 |
| Số sinh viên seed demo | 37 (`sv01` … `sv37`) |"""


def section_2() -> str:
    return """---

## 2. Tổng quan, tính cấp thiết và mục tiêu cụ thể

### 2.1. Giới thiệu chung và tính cấp thiết

Trong bối cảnh chuyển đổi số giáo dục, hình thức kiểm tra – đánh giá trực tuyến ngày càng phổ biến. Đại dịch COVID-19 đã thúc đẩy nhanh việc tổ chức thi trên môi trường mạng, đặt ra yêu cầu về tính ổn định, bảo mật, công bằng và khả năng giám sát hành vi thí sinh.

Kiểm tra và đánh giá kết quả học tập là khâu then chốt trong quản lý đào tạo. Khi quy mô lớp học tăng và học viên phân tán địa lý, tổ chức thi tập trung tại phòng máy gặp hạn chế về chi phí cơ sở vật chất, lịch thi và khả năng mở rộng. Thi trực tuyến cho phép linh hoạt thời gian, giảm chi phí in ấn đề giấy, tự động hóa một phần chấm trắc nghiệm và thống kê nhanh kết quả.

Tuy nhiên, thi trực tuyến đặt ra thách thức về toàn vẹn dữ liệu bài làm, đồng bộ thời gian làm bài, phát hiện hành vi bất thường, và phân quyền chặt chẽ để tránh lộ đề hoặc truy cập trái phép. Do đó, việc xây dựng một hệ thống có kiến trúc rõ ràng, có tài liệu API và quy ước autosave/integrity là cần thiết cho cả mục đích học tập và làm cơ sở mở rộng thương mại.

Một hệ thống thi trực tuyến hoàn chỉnh không chỉ là trang web hiển thị câu hỏi, mà cần chuỗi nghiệp vụ: quản trị người dùng và phân quyền, quản lý môn học và đề thi, tổ chức phiên thi, đồng bộ thời gian, tự động lưu bài, chống gian lận ở mức hợp lý, kênh thông báo thời gian thực cho giám thị, chấm điểm và thống kê kết quả.

### 2.2. Mục tiêu nghiên cứu

**Mục tiêu tổng quát:** Xây dựng phần mềm web hỗ trợ vòng đời tổ chức thi trực tuyến, có khả năng triển khai cục bộ phục vụ demo và có thể cấu hình triển khai môi trường thật.

**Mục tiêu cụ thể:**

1. Phân tích yêu cầu và thiết kế use case theo từng vai trò.
2. Triển khai backend REST `/v1` với PostgreSQL, migration schema, JWT và RBAC.
3. Triển khai frontend SPA với React, quản lý trạng thái, định tuyến và i18n.
4. Hiện thực làm bài thi: timer, autosave, integrity events, fullscreen theo cấu hình đề.
5. Hiện thực Socket.IO cho tín hiệu thi (bắt đầu, cảnh báo, force-submit) và màn hình giám thị.
6. Bổ sung tài liệu OpenAPI và hướng dẫn kiểm thử nhanh trong kho mã nguồn.

### 2.3. Phạm vi và đối tượng nghiên cứu

**Phạm vi:** Module người dùng, đề thi, phiên thi, làm bài, chấm điểm, giám sát, thống kê, import Word, ngân hàng câu hỏi, dự đoán điểm AI (MiniMax), đa ngôn ngữ (vi/en/ja), audit log, email thông báo.

**Không bao gồm:** Phần cứng phòng thi, sinh trắc học nâng cao, chứng thực pháp lý điện tử đầy đủ cấp quốc gia.

**Đối tượng nghiên cứu:** Kiến trúc ứng dụng web đa vai trò, mẫu thiết kế API, quản lý phiên làm bài an toàn, trải nghiệm người dùng khi làm bài dài với mạng không ổn định.

### 2.4. Phương pháp nghiên cứu

- Khảo sát tài liệu: đọc mã nguồn, `API.md`, `openapi.yaml`, contract autosave/integrity.
- Phân tích so sánh: đối chiếu với Moodle Quiz, Google Forms, hệ thống thương mại.
- Thực nghiệm: cài đặt cục bộ, chạy migration, kiểm thử end-to-end.
- Đánh giá: kiểm tra log, hành vi Socket, test tự động backend (Vitest).

### 2.5. Ý nghĩa thực tiễn và học thuật

**Thực tiễn:** Phục vụ khóa học ngắn hạn, kiểm tra giữa kỳ trực tuyến, thi thử trong trường đại học; giảm khối lượng vận hành giấy tờ; rút ngắn thời gian công bố điểm trắc nghiệm.

**Học thuật:** Case study thống nhất cho CSDL, Lập trình web, PM mã nguồn mở, An toàn thông tin; rèn kỹ năng viết tài liệu kỹ thuật (use case, ma trận quyền, phân tích rủi ro).

### 2.6. Business Rules cốt lõi

1. **1 GV quản lý 1 lớp HC:** `admin_classes.manager_teacher_id` là UNIQUE (hoặc bảng gán 1–1).
2. **Không có đăng ký công khai:** sinh viên / giảng viên chỉ đăng nhập; tài khoản do admin tạo.
3. **Xuất bảng điểm:** GV lọc theo `admin_class_id` được gán; super admin không giới hạn lớp.
4. **Server-authoritative runtime:** Khi hết giờ realtime (`exam:force_submit`), server tự động force-submit toàn bộ phiên còn `active`, ưu tiên dùng autosave snapshot mới nhất nếu có.

### 2.7. Tính năng nổi bật

- Đề thi hỗ trợ câu hỏi trắc nghiệm (MCQ) và tự luận (essay)
- Media upload (audio/video/image, max 25MB) qua Cloudinary
- Import đề thi từ file Word (.docx) kèm AI-assisted regeneration (Mammoth)
- Timer đồng bộ server (`exam_runtime_state`) — persist khi server restart
- Auto-save định kỳ (30s) trong quá trình làm bài
- Giám sát toàn màn hình (fullscreen) và integrity events (tab switch, copy/paste, window blur)
- Proctoring thời gian thực qua Socket.IO với presence heartbeat 5s
- Ngân hàng câu hỏi (question bank) có thể tái sử dụng, có `usage_count`
- Xáo trộn câu hỏi theo chương (shuffle) với đáp án deterministic theo `student_id` hash (Fisher-Yates seeded)
- Chấm điểm tự động MCQ, chấm tay tự luận (grading assignments cho nhiều GV)
- Thống kê điểm theo 5 bucket ranges: 0-20%, 20-40%, 40-60%, 60-80%, 80-100%
- Dự đoán điểm bằng AI MiniMax với 3-tier architecture: predict → evaluate → full-report
- Đa ngôn ngữ (Tiếng Việt / English / 日本語) qua i18next
- Email thông báo deadline (24h và 1h trước) qua Nodemailer (SMTP)
- Audit log toàn hệ thống (22 loại action)
- Chia sẻ đề thi giữa các lớp + phân công giảng viên cộng tác chấm điểm
- Excel/CSV export kết quả thi"""


def section_3() -> str:
    return """---

## 3. Kiến trúc hệ thống chi tiết

### 3.1. Sơ đồ khối tổng thể (Hình 2.1 — báo cáo đồ án)

```
┌──────────────────────────────────────────────────────────┐
│                   Browser (Client)                        │
│          React 19 + TypeScript + Vite 7                  │
│          Mantine v8 (UI components)                      │
│          Redux Toolkit (state management)                 │
│          React Router v7 (routing)                        │
│          Socket.IO client + i18next + Axios              │
└──────────────────────────┬─────────────────────────────────┘
                           │ HTTPS / HTTP
                           │ REST API v1 + WebSocket
┌──────────────────────────▼─────────────────────────────────┐
│                Backend — Node.js / Express               │
│               TypeScript + Express 5                      │
│  ┌─────────────────┐ ┌──────────────────┐ ┌────────────┐   │
│  │  Controllers    │ │    Services      │ │   Jobs     │   │
│  │    (20+)       │ │     (30+)       │ │ (deadline) │   │
│  └─────────────────┘ └──────────────────┘ └────────────┘   │
│  ┌─────────────────┐ ┌──────────────────┐ ┌────────────┐   │
│  │    Models       │ │   Middlewares    │ │  Socket.IO │   │
│  │     (31)        │ │  (auth/RBAC)     │ │ (proctor)  │   │
│  └─────────────────┘ └──────────────────┘ └────────────┘   │
│                                                            │
│  PostgreSQL (Neon)  │  Cloudinary (media)  │  MiniMax AI     │
│  37+ SQL migrations │  SMTP (Nodemailer)   │                │
└────────────────────────────────────────────────────────────┘
```

### 3.2. Mô hình phân tầng e-assessment

Trong các hệ thống đào tạo hiện đại, đánh giá trực tuyến (e-assessment) tổ chức đề thi, giám sát phiên làm bài, thu thập bài làm, lưu trữ dữ liệu và chấm điểm thông qua các dịch vụ phần mềm. Mô hình phổ biến là ứng dụng web nhiều lớp: trình duyệt đóng vai trò client, máy chủ ứng dụng triển khai nghiệp vụ và API, cơ sở dữ liệu quan hệ đảm bảo tính bền vững của dữ liệu.

Đồ án đi theo mô hình: **React/TypeScript** (lớp giao diện), **Node.js/Express** (lớp dịch vụ REST), **PostgreSQL** (lớp lưu trữ). Bên cạnh kênh HTTP, hệ thống bổ sung **Socket.IO** để phục vụ giám sát thời gian thực và phát tín hiệu bắt đầu/kết thúc thi.

### 3.3. Mô hình REST — HTTP và JSON (Hình 2.2)

REST sử dụng các phương thức HTTP nhất quán:

| Phương thức | Mục đích |
|-------------|----------|
| GET | Đọc tài nguyên |
| POST | Tạo mới |
| PATCH/PUT | Cập nhật |
| DELETE | Xóa |

Tài nguyên đặt tên bằng danh từ (ví dụ `/v1/exams`), biểu diễn bằng JSON. Mã trạng thái: 200, 201, 400, 401, 403, 404, 409, 413, 429, 500.

Tiền tố phiên bản **`/v1`** giúp tách contract. File **`openapi.yaml`** và Swagger `/docs` duy trì schema request/response.

**Base URL production:** `https://api.nhongplus.id.vn/v1`  
**Base URL local:** `http://localhost:5000/v1`

### 3.4. Luồng JWT và RBAC (Hình 2.3)

```
Client                    Express API                 PostgreSQL
  │ POST /v1/auth/login        │                          │
  │ {email, password}          │                          │
  │ ─────────────────────────► │ bcrypt.compare           │
  │                            │ INSERT user_sessions     │
  │ ◄───────────────────────── │ JWT (HS256, exp 7d)      │
  │ { token, user }            │                          │
  │                            │                          │
  │ GET /v1/exams              │                          │
  │ Authorization: Bearer JWT  │                          │
  │ ─────────────────────────► │ authMiddleware           │
  │                            │ roleMiddleware           │
  │ ◄───────────────────────── │ query exams              │
```

**JWT claims tối thiểu:** định danh user, role (`admin`/`teacher`/`student`), `token_version`, thời hạn.

**RBAC:** Middleware `roleMiddleware` sau `authMiddleware`; từ chối 403 khi role không đủ quyền.

**Session tracking:** Một user chỉ có **1 session active** (`user_sessions` UNIQUE WHERE `is_active = true`). Revoke khi admin force-reset password.

### 3.5. Luồng truyền nhận API giữa Frontend (React) và Backend (Node.js)

| Bước | Thành phần | Hành động |
|------|------------|-----------|
| 1 | `FrontEnd/client/src/services/*.ts` | Axios gọi REST với `Authorization: Bearer` |
| 2 | `BackEnd/server/src/routes/v1/*.ts` | Router mount endpoint |
| 3 | `auth.middleware.ts` | Giải mã JWT, gắn `req.user` |
| 4 | `role.middleware.ts` | Kiểm tra role |
| 5 | `validation/*.ts` (Joi) | Validate body/query |
| 6 | `controllers/*.ts` | Xử lý request |
| 7 | `services/*.ts` | Business logic |
| 8 | `models/*.ts` | Truy vấn SQL tham số hóa (`pg` pool) |
| 9 | Response JSON | `{ success, data, message }` hoặc error envelope |

**Không có microservice Python/OCR** trong phạm vi đồ án. AI MiniMax được gọi trực tiếp từ backend Node.js qua HTTP API (dự đoán điểm).

### 3.6. Socket.IO — room và sự kiện (Hình 2.4)

```
                    ┌─────────────┐
                    │ Socket.IO   │
                    │ Server Hub  │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           │               │               │
    room: exam:{examId}    │        room: exam:{examId}:proctors
           │               │               │
    ┌──────▼──────┐  ┌─────▼─────┐  ┌──────▼──────┐
    │  Sinh viên  │  │ Giáo viên │  │   Admin     │
    │  (student)  │  │ (teacher) │  │  (proctor)  │
    └─────────────┘  └───────────┘  └─────────────┘
```

**Client → Server:** `proctor:join`, `proctor:leave`, `proctor:ping` (heartbeat 5s), `proctor:violation`, `proctor:screenshot`, `exam:join`, `exam:ping`

**Server → Client:** `exam:force_submit`, `exam:runtime_ended`, `exam:final_15m`, `exam:runtime_started`, `proctor:presence_update`, `exam:alert`, `exam:proctor_alert`

**Auth Socket:** JWT tại handshake `io(url, { auth: { token } })`.

**Scale:** Multi-instance cần Redis adapter để đồng bộ room giữa các node.

### 3.7. Mô hình React — UI / state / side-effects (Hình 2.6)

- **Component UI:** Mantine v8, pages trong `FrontEnd/client/src/pages/main/`
- **State toàn cục:** Redux Toolkit (`authSlice`, exam state)
- **Side-effects:** Axios (REST), Socket.IO client, autosave queue 30s, integrity queue 10–15s
- **Routing:** React Router v7, authority guard trong `routes.config.ts`

### 3.8. Vòng đời phiên thi (Hình 2.7)

```
Tạo đề → Thêm câu hỏi → Start runtime → SV làm bài (autosave)
    → Nộp bài / Hết giờ / Force-submit → Auto-grade MCQ
    → Chấm tự luận (nếu có) → Xem kết quả → Thống kê / Export
```

### 3.9. Sơ đồ use case tổng thể theo tác nhân (Hình 3.1)

```mermaid
flowchart TB
  subgraph Actors
    AD[Admin]
    GV[Giáo viên]
    SV[Sinh viên]
  end
  subgraph System
  REST[REST API /v1]
  SOCK[Socket.IO]
  DB[(PostgreSQL)]
  end
  AD --> REST
  GV --> REST
  SV --> REST
  AD --> SOCK
  GV --> SOCK
  SV --> SOCK
  REST --> DB
  SOCK --> DB
```

### 3.10. Cấu trúc thư mục dự án

```
GraduationProject/
├── BackEnd/server/          # API, migrations, socket, services
│   ├── src/controllers/     # 20+ handlers
│   ├── src/routes/v1/       # 25 routers
│   ├── src/services/        # 30+ business logic
│   ├── src/models/          # 31 models
│   ├── src/db/migrations/   # SQL migrations
│   ├── API.md, openapi.yaml
│   └── docs/
├── FrontEnd/client/         # SPA React
│   └── src/pages/main/      # Dashboard, Exam, Admin, Grading, Proctoring
├── docs/                    # DOMAIN_MODEL.md, sơ đồ ER
├── TONGB_HOP_DOAN_TOT_NGHIEP.md
├── DO_AN_MASTER.md
└── BaoCaoDoAn_OnlineExamination.docx
```"""


def section_4() -> str:
    return """---

## 4. Đặc tả chi tiết công nghệ

### 4.1. Bảng công nghệ theo tầng (Bảng 2.2 — báo cáo)

| Tầng | Công nghệ | Phiên bản (package.json) |
|------|-----------|--------------------------|
| **Frontend — Framework** | React | ^19.2.0 |
| **Frontend — Ngôn ngữ** | TypeScript | ~5.9.3 |
| **Frontend — Build** | Vite | ^7.2.4 |
| **Frontend — UI** | Mantine (@mantine/core, hooks, form, dates, charts, dropzone) | ^8.3.10 / ^9.1.1 (dropzone) |
| **Frontend — State** | Redux Toolkit, redux-persist | ^2.7.0 |
| **Frontend — Routing** | React Router DOM | ^7.11.0 |
| **Frontend — HTTP** | Axios | ^1.13.6 |
| **Frontend — Realtime** | socket.io-client | 4.8.3 |
| **Frontend — i18n** | i18next, react-i18next | ^25.7.3 |
| **Frontend — Charts** | recharts, @mantine/charts | ^3.6.0 |
| **Frontend — Icons** | @tabler/icons-react, lucide-react | ^3.36.1 |
| **Frontend — Test** | Vitest, Playwright, Storybook | ^4.0.18 |
| **Backend — Runtime** | Node.js | LTS (khuyến nghị) |
| **Backend — Ngôn ngữ** | TypeScript | ^5.9.3 |
| **Backend — Web framework** | Express | ^5.2.1 |
| **Backend — CSDL driver** | pg (node-postgres) | ^8.18.0 |
| **Backend — Auth** | jsonwebtoken, bcrypt | ^9.0.3, ^6.0.0 (cost 12) |
| **Backend — Validation** | Joi | ^18.0.2 |
| **Backend — Realtime** | socket.io | ^4.8.3 |
| **Backend — Email** | nodemailer | ^6.9.16 |
| **Backend — Word import** | mammoth | ^1.12.0 |
| **Backend — Media** | cloudinary, multer | ^1.41.3, ^2.1.1 |
| **Backend — Export** | xlsx | ^0.18.5 |
| **Backend — API docs** | swagger-ui-express | ^5.0.1 |
| **Backend — Test** | Vitest | ^4.1.4 |
| **CSDL** | PostgreSQL (Neon serverless) | — |
| **AI** | MiniMax API | Tùy env `MINIMAX_*` |
| **Deploy FE** | Vercel / Netlify / Apache `.htaccess` | — |
| **Deploy BE** | Render / VPS + Nginx reverse proxy | — |

### 4.2. Công nghệ KHÔNG sử dụng (so với mẫu đề tài khác)

| Công nghệ | Trạng thái trong đồ án |
|-----------|------------------------|
| MySQL | Không — dùng PostgreSQL |
| Sequelize ORM | Không — truy vấn SQL trực tiếp qua `pg` pool |
| EJS template engine | Không — SPA React |
| Bootstrap | Không — Mantine UI |
| Tesseract / PaddleOCR | Không — không có module OCR |
| Python microservice | Không — monolith Node.js TypeScript |

### 4.3. Môi trường phát triển (Bảng 4.1)

| Thành phần | Phiên bản / ghi chú |
|------------|---------------------|
| Node.js | LTS phù hợp package.json |
| npm | Quản lý dependency |
| PostgreSQL | Local hoặc Neon cloud |
| Git | Quản lý phiên bản |
| Trình duyệt | Chrome/Edge — kiểm thử fullscreen, DevTools |
| IDE | VS Code / Cursor |

### 4.4. Biến môi trường chính

| Biến | Mục đích |
|------|----------|
| `DATABASE_URL` | Kết nối PostgreSQL |
| `JWT_SECRET` | Ký JWT |
| `CORS_ORIGINS` | Origin FE được phép |
| `SMTP_*` | Gửi email reset password / deadline |
| `CLOUDINARY_*` | Upload media câu hỏi |
| `MINIMAX_*` | Dự đoán điểm AI |
| `VITE_API_URL` | URL API cho frontend (dev/prod) |

### 4.5. Danh mục viết tắt (Bảng — báo cáo)

| Viết tắt | Ý nghĩa |
|----------|---------|
| API | Application Programming Interface |
| BE | Backend |
| CRUD | Create, Read, Update, Delete |
| FE | Frontend |
| HTTP/HTTPS | Giao thức truyền tải siêu văn bản |
| JWT | JSON Web Token |
| MCQ | Multiple Choice Question |
| RBAC | Role-Based Access Control |
| REST | Representational State Transfer |
| SMTP | Simple Mail Transfer Protocol |
| SPA | Single Page Application |
| SQL | Structured Query Language |
| UI/UX | Giao diện / trải nghiệm người dùng |
| UUID | Định danh duy nhất toàn cục |

### 4.6. So sánh nền tảng thi trực tuyến (Bảng 2.1)

| Nền tảng | Ưu điểm | Nhược điểm / ghi chú |
|----------|---------|---------------------|
| Moodle Quiz | Phổ biến trong giáo dục, plugin phong phú | Cài đặt nặng, tùy biến UI phức tạp |
| Google Forms | Nhanh, dễ dùng | Hạn chế proctoring, ít kiểm soát server-side timer |
| Hệ thống thương mại | Proctoring mạnh, SLA | Chi phí, khó tùy chỉnh mã nguồn |
| **Đồ án (GraduationProject)** | Mã nguồn mở, stack hiện đại, OpenAPI | Cần hardening production, CI đầy đủ |"""


def section_5() -> str:
    return SECTION_5


def section_6() -> str:
    return build_section_6()


def section_7() -> str:
    return SECTION_7


def section_8() -> str:
    return SECTION_8


def footer() -> str:
    return FOOTER


if __name__ == "__main__":
    main()
