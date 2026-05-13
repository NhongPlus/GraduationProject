# Tài liệu tổng hợp đồ án — Hệ thống thi trực tuyến (Online Examination)

**Mục đích:** Một nguồn duy nhất để nắm **phạm vi dự án**, **kiến trúc**, **tiến độ**, **kiểm thử** và **tài liệu kỹ thuật** phục vụ báo cáo tốt nghiệp.  
**Cập nhật:** 2026-05-13  

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)  
2. [Kiến trúc & công nghệ](#2-kiến-trúc--công-nghệ)  
3. [Cấu trúc repo](#3-cấu-trúc-repo)  
4. [Chạy dự án & môi trường](#4-chạy-dự-án--môi-trường)  
5. [Tài khoản kiểm thử](#5-tài-khoản-kiểm-thử)  
6. [Tiến độ theo module](#6-tiến-độ-theo-module)  
7. [Mục chức năng đã ghi nhận (Item 1–13)](#7-mục-chức-năng-đã-ghi-nhận-item-113)  
8. [Hướng dẫn kiểm thử nhanh](#8-hướng-dẫn-kiểm-thử-nhanh)  
9. [API, OpenAPI, phân quyền](#9-api-openapi-phân-quyền)  
10. [Rủi ro & hướng phát triển](#10-rủi-ro--hướng-phát-triển)  
11. [Tài liệu kỹ thuật bổ sung (file giữ lại)](#11-tài-liệu-kỹ-thuật-bổ-sung-file-giữ-lại)  

---

## 1. Tổng quan

Hệ thống hỗ trợ **vòng đời thi trực tuyến**: quản lý người dùng (admin/teacher/student), lớp–môn, đề thi & câu hỏi (MCQ/essay, media), **import Word**, làm bài có **timer**, **autosave**, **chống gian lận** (fullscreen, integrity events), **Socket.IO** (bắt đầu thi, cảnh báo, force-submit), **chấm điểm** (tự động + tay), **giám thị**, **ngân hàng câu hỏi**, **thống kê điểm**, **dự đoán điểm (AI MiniMax)**, đa ngôn ngữ (vi/en/ja).

**Đánh giá nhanh:** MVP/demo **ổn**; production cần tiếp tục **chuẩn hoá contract**, **CI/test**, **bảo mật env**, **quan sát vận hành**.

---

## 2. Kiến trúc & công nghệ

| Lớp | Công nghệ |
|-----|-----------|
| **Frontend** | React 19, TypeScript, Vite 7, Mantine v8, Redux Toolkit, React Router v7, Socket.IO client, i18next, Axios |
| **Backend** | Node.js, TypeScript, Express 5, PostgreSQL (Neon), Socket.IO, JWT, bcrypt, Joi, Mammoth (docx), Nodemailer |
| **AI** | MiniMax (dự đoán điểm), có thể tắt nếu không cấu hình key |

Luồng chính: **Browser → REST `/v1/...` + Socket.IO** cùng host API; FE build production mặc định API `https://api.nhongplus.id.vn` (xem `FrontEnd/client/src/configs/app.config.ts`, `.env.production`).

---

## 3. Cấu trúc repo

```
GraduationProject/
├── DO_AN_MASTER.md          ← tài liệu tổng hợp đồ án (file này)
├── README.md                ← hướng dẫn nhanh + liên kết
├── BackEnd/server/          ← API, migrations, socket, services
│   ├── API.md               ← danh sách endpoint REST
│   ├── openapi.yaml
│   └── src/db/migrations/   ← schema theo phiên bản
└── FrontEnd/client/         ← SPA React
```

---

## 4. Chạy dự án & môi trường

### Backend

```bash
cd BackEnd/server
cp .env.example .env   # điền DATABASE_URL, JWT_SECRET, …
npm install
npm run migrate          # hoặc chạy SQL migration theo hướng dẫn dự án
npm run dev              # mặc định http://localhost:5000
```

### Frontend

```bash
cd FrontEnd/client
npm install
npm run dev              # mặc định http://localhost:5173
```

- **API REST:** `{API_URL}/v1` (local: `http://localhost:5000/v1`).  
- **Production:** FE build dùng `https://api.nhongplus.id.vn`; không đặt `VITE_API_URL=http://localhost:5000` trong file `.env` chung (chỉ `.env.development`).  

### Kiểm tra nhanh

- `GET http://localhost:5000/` — health.  
- `GET http://localhost:5000/docs` — Swagger (nếu bật).

---

## 5. Tài khoản kiểm thử

(Mật khẩu seed phổ biến: **`Test@123`** — đổi trước khi public.)

| Vai trò | Email (ví dụ) |
|---------|------------------|
| Admin | `admin01@system.local` |
| Giảng viên | `gv01@system.local` … `gv03@system.local` |
| Sinh viên | `sv01@system.local` … (theo seed) |

Script thêm user: `BackEnd/server/scripts/insert-three-test-students.sql` (sv13–sv15).

---

## 6. Tiến độ theo module

| Module | Trạng thái | Ghi chú ngắn |
|--------|--------------|---------------|
| Auth / JWT / session thiết bị | Hoàn thành cốt lõi | Một thiết bị một session; cần hardening secret production |
| User / RBAC | Hoàn thành cốt lõi | Chi tiết role: `BackEnd/server/docs/ROLES_AND_PERMISSIONS.md` |
| Exam / Question / Session | Hoàn thành cốt lõi | Import Word, media, grading |
| Làm bài / Timer / Autosave / Integrity | Hoàn thành phần lớn | Server timer restore: `exam_runtime_state`; FE vẫn cần đồng bộ edge cases |
| Socket.IO (thi, giám thị) | Hoàn thành phần lớn | POC nâng cấp thành dashboard; xem `SOCKET_IO_POC.md` |
| Dashboard / thống kê | Đã có | Teacher/admin/student khác view |
| Question bank / Subject | Đã có | API `/v1/question-bank`, `/v1/subjects` |
| Password reset / Notification / Audit | Đã có route + migration | Kiểm tra SMTP & quyền admin |
| AI Prediction | Tùy env | Cần `MINIMAX_*` |
| Test tự động | BE: vitest; FE: một phần | Mở rộng coverage, CI |

---

## 7. Mục chức năng đã ghi nhận (Item 1–13)

Các báo cáo chi tiết từng item trước đây (`ITEM_*_TEST_REPORT.md`) đã **gộp ý** vào bảng sau.

| Item | Nội dung đã ghi nhận |
|------|----------------------|
| **1** | Timer đồng bộ server + UI; chuyển trạng thái kết thúc bài |
| **2** | Giám thị realtime: presence, log vi phạm, broadcast cảnh báo |
| **3** | Xem lại bài thi: đúng/sai, đáp án, giải thích |
| **4** | Ngân hàng câu hỏi (CRUD, tái sử dụng) |
| **5** | Quản lý môn học (admin) |
| **6** | Reset mật khẩu qua email + test FE |
| **7** | Proctoring nâng cao (integrity mở rộng, mức độ vi phạm, …) |
| **8** | Chia sẻ đề / phân công chấm cho GV |
| **9** | Export kết quả CSV/Excel |
| **10** | Xáo trộn câu theo chương (shuffle có kiểm soát) |
| **11** | Persist trạng thái timer khi server restart |
| **12** | Báo cáo coverage test (FE/BE) |
| **13** | OpenAPI / contract (file `openapi.yaml`) |

---

## 8. Hướng dẫn kiểm thử nhanh

1. Chạy BE + FE (mục 4).  
2. Đăng nhập **student** → danh sách đề → **Làm bài** (fullscreen nếu bật).  
3. Đăng nhập **teacher** → **Bắt đầu thi** (runtime) → quan sát Socket/timer phía student.  
4. **Nộp bài** → xem **kết quả** / chấm tự luận (teacher).  
5. **Admin:** user management, subject, audit log (nếu deploy migration đầy đủ).  

Kế hoạch kiểm thử luồng thi (chi tiết từng bước) có thể tái lập từ git history (file cũ `TEST_PLAN_EXAM_RUNTIME_FE_BE.md`, `TEST_GUIDE.md` đã gộp ý vào mục này).

---

## 9. API, OpenAPI, phân quyền

- **Danh sách REST & ghi chú deploy:** [`BackEnd/server/API.md`](BackEnd/server/API.md)  
- **OpenAPI:** [`BackEnd/server/openapi.yaml`](BackEnd/server/openapi.yaml)  
- **Role & permission:** [`BackEnd/server/docs/ROLES_AND_PERMISSIONS.md`](BackEnd/server/docs/ROLES_AND_PERMISSIONS.md)  

---

## 10. Rủi ro & hướng phát triển

1. **Contract FE–BE:** giữ `openapi.yaml` và test khớp response.  
2. **Migration:** luôn chạy đủ migration trên DB mới trước demo.  
3. **Biến môi trường:** không commit secret; production bắt buộc `DATABASE_URL`, `JWT_SECRET`, CORS, SMTP (nếu dùng mail).  
4. **CI:** chạy `npm test` (BE) và test FE theo pipeline.  
5. **Socket & scale:** document giới hạn single-node; cân nhắc Redis adapter nếu multi-instance.

---

## 11. Tài liệu kỹ thuật bổ sung (file giữ lại)

| File | Mục đích |
|------|----------|
| [`BackEnd/server/API.md`](BackEnd/server/API.md) | Endpoint `/v1` |
| [`BackEnd/server/EXAM_INTEGRITY_AUTOSAVE_CONTRACT.md`](BackEnd/server/EXAM_INTEGRITY_AUTOSAVE_CONTRACT.md) | Contract autosave / integrity |
| [`BackEnd/server/SOCKET_IO_POC.md`](BackEnd/server/SOCKET_IO_POC.md) | Socket.IO thi |
| [`BackEnd/server/MODULE_THI_SINH_VIEN.md`](BackEnd/server/MODULE_THI_SINH_VIEN.md) | Module sinh viên |
| [`BackEnd/server/README.md`](BackEnd/server/README.md) | Hướng dẫn backend cục bộ |
| [`FrontEnd/client/README.md`](FrontEnd/client/README.md) | Hướng dẫn frontend |
| [`FrontEnd/client/chien_luoc_fullscreen.md`](FrontEnd/client/chien_luoc_fullscreen.md) | Chiến lược fullscreen |
| [`FrontEnd/client/docs/screens-components.md`](FrontEnd/client/docs/screens-components.md) | Màn hình / component |

---

## Ghi chú về việc gọn tài liệu

Các file markdown **trùng phạm vi đồ án** ở root (`PROJECT_*`, `ITEM_*`, `TEST_*`, `BAO_CAO_*`) đã được **tóm tắt vào file này** và **xoá khỏi repo** để tránh phân tán. Nội dung chi tiết từng báo cáo item vẫn có thể xem trong **lịch sử Git** (commit trước ngày gộp).

---

*Tài liệu này có thể copy vào Chương tổng quan / Phụ lục đồ án; điều chỉnh ngày và trạng thái khi nộp bản cuối.*
