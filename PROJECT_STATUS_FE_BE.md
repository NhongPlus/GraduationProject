# Bao cao tinh trang FrontEnd va BackEnd

Cap nhat: 2026-04-13

## 1) Tong quan du an

- Du an da co day du 2 lop `FrontEnd` va `BackEnd`, ket noi qua REST API va co huong mo rong realtime bang Socket.IO.
- Frontend da co khung giao dien va luong nguoi dung chinh (dang nhap, dashboard, danh sach bai thi, lam bai, xem ket qua).
- Backend da co nen tang API kha day du cho auth, user management, exam/question/session va grading co ban.
- He thong da dat muc "MVP co the demo", nhung chua dat muc "production-ready" do con mot so mismatch FE-BE va thieu test tu dong.

## 2) Tinh trang FrontEnd (da lam duoc gi)

### Kien truc va to chuc

- FE dat tai `FrontEnd/client`, dung React + TypeScript + Vite.
- Kien truc tach ro `pages`, `components`, `services`, `configs`, `hooks`, `locales`.
- Dinh tuyen tach rieng, co route guard cho:
  - `ProtectedRoute` (trang can dang nhap)
  - `PublicRoute` (trang public)
  - `AuthorityGuard` (role-based access)
- Layout da tach `AuthLayout` va `DefaultLayout`, co lazy loading va loading screen.

### Tinh nang da co

- **Xac thuc**:
  - Dang nhap qua API that.
  - Luu token va thong tin user/role phuc vu dieu huong.
- **Phan quyen**:
  - Da co logic role `admin` va `student`.
  - Admin co khu quan ly sinh vien/nguoi dung.
- **Cac trang chinh da hien dien**:
  - Login
  - Dashboard (tach Admin/Student)
  - Danh sach bai thi
  - Lam bai thi theo `examId`
  - Xem ket qua
  - Prediction
  - Ho so ca nhan
- **Luong bai thi (UI + logic co ban)**:
  - Timer
  - Luu tam bai lam (autosave localStorage)
  - Submit bai
  - Xem ket qua sau nop
- **Da ngon ngu (i18n)**:
  - Ho tro `vi`, `en`, `ja`
  - Co dong bo locale cho ngay gio.
- **UI maturity**:
  - Co component pattern, Storybook setup, SCSS modules, Mantine.

### Diem dang do / can hoan thien

- Co dau hieu **chua dong bo ten ham/du lieu** giua page va `services/examApi.ts`.
- Co truong hop **chua dong bo model User** giua UI va service (vd `name` vs `full_name`).
- Nhieu widget dashboard con dung mock/hard-coded data, chua noi API that hoan toan.
- Chuc nang doi mat khau trong profile con phu thuoc endpoint BE chua xong.
- State quan trong van phan tan (localStorage + event), Redux chua duoc dung sau cho business flow.
- Chua thay bo test FE duoc viet day du (Vitest/Playwright da co dependency).

## 3) Tinh trang BackEnd (da lam duoc gi)

### Kien truc va to chuc

- BE dat tai `BackEnd/server`, dung Node.js + TypeScript + Express.
- Kien truc phan lop ro:
  - `routes -> controllers -> services -> models -> db`
- API versioning voi prefix `/v1`.
- Da co middleware auth JWT, RBAC va error handler.
- DB dung PostgreSQL qua `pg` Pool.
- Da gan Socket.IO vao cung HTTP server.

### Tinh nang da co

- **Auth**:
  - Register/Login
  - Bam mat khau bang bcrypt
  - Phat JWT
- **User management (admin)**:
  - CRUD user
  - Khong tra ve `hashed_password`.
- **Exam domain**:
  - CRUD de thi
  - CRUD cau hoi theo de (mcq + essay)
  - Student lay cau hoi khong lo dap an dung
  - Start exam session
  - Submit bai
  - Xem lich su bai lam ca nhan
- **Grading**:
  - Tu dong cham trac nghiem
  - Tu luan de `pending_manual`
  - Co API de cham/cap nhat diem tu luan.
- **Realtime POC**:
  - Join room theo exam
  - Ping dong ho server
  - Gui alert theo room
  - Co script smoke test.

### Diem dang do / can hoan thien

- Co router da ton tai nhung chua mount vao `routes/v1/index.ts` (mot so endpoint chua dung duoc).
- Con dau vet code POC/demo trong mot so controller/validation (logic gia, TODO).
- Migrations hien co chua phan anh day du schema dang dung (co nguy co lech schema khi setup moi).
- Nhieu domain model da co nhung chua expose thanh API active day du.
- Bao mat can hardening them (tranh de secret mac dinh khi deploy).
- Chua thay test tu dong cho cac flow quan trong (auth, exam, grading, permission).
- Socket moi dung muc POC, chua day du cac tinh nang giam sat thi real-time nang cao.

## 4) Danh gia tien do tong hop

- **Muc san sang demo**: Tot (co the demo full flow co ban).
- **Muc san sang production**: Trung binh - can hoan thien dong bo FE-BE, test, migration strategy va hardening.
- **Rui ro lon nhat hien tai**:
  - Mismatch contract API/DTO giua FE va BE gay loi runtime.
  - Thieu test hoi quy cho cac luong cot loi.
  - Chua chot duoc schema migration nhat quan.

## 5) De xuat uu tien tiep theo (Sprint gan nhat)

1. Chot lai API contract chung (OpenAPI hoac file mapping) cho `exam`, `result`, `user`.
2. Refactor frontend service/page de dong bo 100% ten ham, field va response shape.
3. Hoan thien endpoint BE con thieu (profile/password, cac router chua mount).
4. Chuan hoa migration de co the setup DB tu dau on dinh.
5. Bo sung test toi thieu:
   - BE: auth + exam submit + grading + RBAC
   - FE: login flow + exam flow + route guard
6. Hoan thien phan realtime tu POC len feature set toi thieu cho thi that.

## 6) Ket luan ngan

- Frontend va Backend deu da di qua giai doan "khoi tao" va da co nhieu module chay duoc.
- He thong hien phu hop cho demo nghiep vu chinh.
- De dat muc trien khai on dinh, can tap trung vao dong bo contract FE-BE, test tu dong, va hardening van hanh.
---

## 7) Cap nhat tinh nang moi (Force-submit, Autosave, Realtime)

> Trang thai tong quat: **Da co ban hoan tat luong chinh**, dang tiep tuc hardening de san sang production.

### 7.1 Frontend (Exam runtime)

- Da nhan va xu ly su kien force-submit tu server qua Socket.IO.
- Da mo rong payload realtime co `summary` de hien thi ket qua nhanh sau khi ket thuc.
- `ExamTake` da xu ly theo huong server-authoritative:
  - Ket thuc bai ngay khi nhan force-submit.
  - Dung timer/client-flow local de tranh submit trung.
- Da xu ly cac response 400/409 trong tinh huong session da dong, giam false-fail.
- Da cai thien man hinh ket thuc bai thi (thong ke + dong bo trang thai theo server).

### 7.2 Backend (Force-submit API + socket notify)

- Da bo sung endpoint:
  - `POST /v1/exams/:examId/force-submit`
- Da ap dung phan quyen:
  - Chi `teacher`/`admin` duoc phep goi.
- Da bo sung logic xu ly:
  - Submit toan bo session dang active cua de thi.
  - Dong session o backend de ngan submit lan 2.
  - Socket giu vai tro notify, backend giu vai tro source-of-truth.
- Da phat su kien force-submit kem `summary` cho client.

### 7.3 Xu ly du lieu autosave

- Da bo sung helper mapping autosave -> submit payload.
- Ho tro 2 nhom key:
  - Kieu DB/API: `question_id`
  - Kieu FE cache cu: `q1`, `q2`, ...
- Muc tieu dat duoc: tang tuong thich nguoc va giam mat du lieu khi nop bai.

### 7.4 Kiem thu da co

- Da co unit test cho logic mapping autosave -> submit answers.
- Ket qua ghi nhan:
  - Frontend typecheck: PASS
  - Backend build: PASS
  - Backend test: PASS (bao gom test moi lien quan force-submit)

### 7.5 Danh gia hien tai (sau cap nhat)

- Diem manh:
  - Da khoa duoc van de double-submit.
  - Da giam sai lech trang thai FE-BE khi ket thuc bai thi.
- Han che con lai:
  - Chua co full integration/e2e bao phu toan bo kich ban mat ket noi/reconnect.
  - Co che ACK/retry realtime chua day du cho cac su kien quan trong.
  - Can tiep tuc lam ro muc "server-authoritative 100%" cho timer/resume edge-case.

### 7.6 Viec can lam tiep (uu tien cao)

1. Bo sung UI nut "Force Submit" cho teacher/admin dashboard.
2. Bo sung integration test cho `POST /v1/exams/:examId/force-submit`.
3. Bo sung e2e test cho luong thi co force-submit + reconnect.
4. Dong bo i18n message moi trong exam runtime.
5. Nang cap realtime ACK/retry va monitoring event delivery.

---

## 8) Test case de test thu tinh nang moi

### 8.1 API force-submit

1. **TC_API_FS_01 - Teacher force-submit thanh cong**
   - Tien dieu kien: Co exam dang mo, co >=1 student dang thi.
   - Buoc test: Dang nhap teacher -> goi `POST /v1/exams/:examId/force-submit`.
   - Mong doi:
     - HTTP `200`.
     - Response co thong tin tong hop (`summary`).
     - Tat ca session active cua exam chuyen sang da dong/da nop.

2. **TC_API_FS_02 - Student khong duoc force-submit**
   - Tien dieu kien: Dang nhap bang role student.
   - Buoc test: Goi endpoint force-submit.
   - Mong doi: HTTP `403` (hoac loi phan quyen tuong duong), khong thay doi session.

3. **TC_API_FS_03 - ExamId khong ton tai**
   - Buoc test: Goi endpoint voi `examId` khong hop le.
   - Mong doi: HTTP `404`, khong phat sinh thay doi du lieu.

4. **TC_API_FS_04 - Force-submit lap lai**
   - Tien dieu kien: Exam da force-submit 1 lan.
   - Buoc test: Goi lai endpoint force-submit.
   - Mong doi: He thong xu ly idempotent (khong tao submit trung, tra ve trang thai hop ly).

### 8.2 Realtime force-submit (FE)

5. **TC_RT_FS_01 - Client nhan su kien force-submit**
   - Tien dieu kien: Student dang o man `ExamTake`.
   - Buoc test: Teacher goi force-submit.
   - Mong doi:
     - FE nhan event realtime.
     - Bai thi ket thuc ngay.
     - Hien thi `summary` dung du lieu server tra ve.

6. **TC_RT_FS_02 - Chan submit trung o FE**
   - Tien dieu kien: Da nhan force-submit.
   - Buoc test: Thu bam submit tay hoac de timer local ket thuc.
   - Mong doi: Khong tao request submit trung; neu co loi 400/409 thi FE xu ly "im", khong do loi sai.

7. **TC_RT_FS_03 - Student dang o man hinh khac quay lai**
   - Tien dieu kien: Student roi tab/man hinh, exam bi force-submit.
   - Buoc test: Quay lai man hinh bai thi.
   - Mong doi: FE dong bo trang thai tu server, khong cho tiep tuc lam bai.

### 8.3 Autosave mapping

8. **TC_AS_01 - Map key `question_id`**
   - Input autosave: `{ question_id: answer }`.
   - Mong doi: Payload submit hop le, dung mapping.

9. **TC_AS_02 - Map key `q1`, `q2`**
   - Input autosave: `{ q1: ..., q2: ... }`.
   - Mong doi: Payload submit duoc quy doi dung sang format backend.

10. **TC_AS_03 - Du lieu tron 2 dinh dang**
    - Input autosave co ca `question_id` va `qN`.
    - Mong doi: He thong uu tien/chuan hoa theo quy tac da dinh, khong mat cau tra loi.

### 8.4 End-to-end runtime

11. **TC_E2E_01 - Luong thi binh thuong khong force-submit**
    - Bat dau thi -> lam bai -> nop bai.
    - Mong doi: Ket qua/cham diem/lich su bai lam binh thuong, khong hoi quy.

12. **TC_E2E_02 - Luong thi co force-submit giua chung**
    - Student dang lam bai, teacher force-submit.
    - Mong doi: Session dong dung 1 lan, ket qua ton tai, khong duplicate record.

13. **TC_E2E_03 - Mat mang ngan han khi dang thi**
    - Gia lap ngat mang 5-10s roi ket noi lai.
    - Mong doi: FE recover trang thai hop ly; neu da force-submit tren server thi FE hien ket thuc bai.

14. **TC_E2E_04 - Tai cao nhieu student cung phong**
    - 30-100 student gia lap cung exam room.
    - Mong doi: Ty le nhan event force-submit cao, do tre chap nhan duoc, khong nghen he thong.