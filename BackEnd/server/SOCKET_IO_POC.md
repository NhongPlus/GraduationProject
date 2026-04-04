# Socket.IO — lộ trình & POC đã gắn

## Mục tiêu từng bước (không làm “một cục”)

| Bước | Nội dung | Trạng thái |
|------|----------|------------|
| **0 — POC** | Cùng cổng với HTTP, JWT ở handshake, `join` room theo `examId`, `ping` trả `server_time`, GV `proctor_alert` broadcast vào room | **Đã code** (`src/socket/examSocket.ts`, `server.ts`) |
| **1 — Đồng bộ hết giờ** | Server lưu `ends_at`; khi hết giờ (interval hoặc job) `io.to(room).emit('exam:force_submit')` hoặc client chỉ nhận `exam:ended` rồi gọi REST submit | Chưa |
| **2 — Tạm dừng / tiếp tục** | Cột hoặc bảng trạng thái kỳ thi; REST đổi trạng thái → Socket broadcast `exam:paused` / `exam:resumed` | Chưa |
| **3 — Giám sát** | Heartbeat student → Redis/memory map; room `exam:{id}:proctors` chỉ giám thị; event `exam:presence` | Chưa |
| **4 — Hành vi / gian lận** | Client gửi `exam:behavior` batch → lưu DB → optional forward tới proctor room | Chưa |
| **5 — Nhóm / chat** | Room `group:{id}`; message persistence (REST) + realtime (Socket) | Chưa |

POC giúp bạn **test kết nối, auth, room, broadcast** trước khi nối với nghiệp vụ thi đầy đủ.

**Frontend:** sau khi đăng nhập thành công tại `/login`, app gọi thử Socket.IO (cùng `VITE_API_URL`) và hiển thị **Realtime: thành công** hoặc **Realtime: lỗi** vài giây trước khi vào dashboard. Tùy chọn build: `VITE_SOCKET_POC_EXAM_ID` (UUID đề), `VITE_SOCKET_FORCE_POLLING=true` nếu WebSocket bị chặn.

---

## Cách chạy thử nhanh (backend)

1. Trong thư mục `server`: `npm run dev` (hoặc `npm run build && npm start`).
2. Lấy JWT — **PowerShell** (đổi email/mật khẩu theo DB seed của bạn):

```powershell
$r = Invoke-RestMethod -Method POST -Uri "http://localhost:5000/v1/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"student01@system.local","password":"Test@123"}'
$studentToken = $r.data.token

$r2 = Invoke-RestMethod -Method POST -Uri "http://localhost:5000/v1/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"seed-teacher@test.local","password":"Test@123"}'
$teacherToken = $r2.data.token
```

(Dùng email/mật khẩu **có trong DB** của bạn; JWT nằm trong **`data.token`** theo format API hiện tại.)

**Production:** đổi host thành `https://api.nhongplus.id.vn` và thêm `$env:SOCKET_URL = "https://api.nhongplus.id.vn"` cho các lệnh socket bên dưới.

3. **Smoke một lệnh** (tự thoát sau khi nhận `exam:server_time`):

```powershell
$env:TOKEN = $studentToken
$env:EXAM_ID = "00000000-0000-0000-0000-000000000001"
npm run socket:smoke
```

Kỳ vọng: `exam:welcome`, `exam:joined`, `exam:server_time`.

4. **Test broadcast giám thị** — **hai cửa sổ terminal**, cùng một `EXAM_ID`:

   - **Terminal A (thí sinh, giữ chạy):** `npm run socket:student` với `$env:TOKEN = $studentToken` và `$env:EXAM_ID` như trên. Script tự `exam:join` + `exam:ping`, rồi chờ `exam:alert` (Ctrl+C để thoát).
   - **Terminal B (GV/admin, chạy xong là thoát):** `$env:TOKEN = $teacherToken`, cùng `EXAM_ID`, tùy chọn `$env:ALERT_MSG = "Nộp bài trong 5 phút!"`, rồi `npm run socket:proctor`. Terminal A phải in `>>> NHAN CANH BAO:`.

| Lệnh npm | Script | Việc |
|----------|--------|------|
| `socket:smoke` | `scripts/socket-smoke.js` | Join + ping + thoát |
| `socket:student` | `scripts/socket-student.js` | Giữ kết nối, in `exam:alert` |
| `socket:proctor` | `scripts/socket-proctor.js` | Emit `exam:proctor_alert` (chỉ teacher/admin) |

---

## Client (bất kỳ app nào)

- URL: `http://<APP_HOST>:<APP_PORT>` (mặc định thường `5000`).
- Path Socket.IO: `/socket.io` (mặc định).
- Auth: `io(url, { auth: { token: "<JWT>" } })` (giống `Authorization: Bearer`).

CORS / Socket.IO dùng biến **`CORS_ORIGINS`** (chuỗi các URL cách nhau bởi dấu phẩy). Nếu không set, mặc định gồm `http://localhost:5173` và **`https://nhongplus.id.vn`** (FE production: [nhongplus.id.vn](https://nhongplus.id.vn/), API: [api.nhongplus.id.vn](https://api.nhongplus.id.vn/)). Thêm `https://www.nhongplus.id.vn` nếu bạn dùng subdomain `www`.

---

## Nhờ người khác test từ máy khác (biết đã kết nối thành công)

**Không cần cùng Wi‑Fi.** Chỉ cần máy họ truy cập được URL API public (HTTPS) và server đã **proxy đúng** path `/socket.io` tới Node (nếu không, chỉ REST chạy được, Socket sẽ lỗi).

### Việc bạn nhờ bạn làm (có Node.js + clone repo `server`)

1. Cài dependency (một lần): trong thư mục `server` chạy `npm install`.
2. **Login** lấy JWT (đổi URL + email/mật khẩu tài khoản thật trên hệ thống của bạn), ví dụ PowerShell:

```powershell
$base = "https://api.nhongplus.id.vn"
$r = Invoke-RestMethod -Method POST -Uri "$base/v1/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"...","password":"..."}'
$env:TOKEN = $r.data.token
$env:SOCKET_URL = $base
$env:EXAM_ID = "<uuid-de-thi>"
npm run socket:smoke
```

3. **Coi là thành công** khi trong terminal họ thấy lần lượt:
   - `[ok] connected` kèm một `socket.id`
   - `[event] exam:welcome` (server gửi ngay sau khi nối)
   - `[event] exam:joined` (sau khi script emit `exam:join`)
   - `[event] exam:server_time` có `serverNowMs` và `iso`

Nếu thấy `[err] connect_error` hoặc script thoát lỗi → chưa nối được Socket (thường do proxy/nginx chưa forward `/socket.io`, hoặc token sai/hết hạn). Khi đó vẫn có thể thử `$env:SOCKET_FORCE_POLLING="1"` trước khi `npm run socket:smoke` (một số mạng chặn WebSocket).

### Phía bạn (chủ server) — đối chiếu

Khi họ kết nối thành công, log Node (console nơi chạy `npm start` / PM2) sẽ có dạng:

- `[socket] connect id=... user=<uuid> role=student` (hoặc teacher)
- `[socket] <id> -> exam:<examId>` (sau `exam:join`)

Như vậy bạn **nhận biết** cả từ phía client (bạn họ) và phía server (bạn).

---

## Ghi chú kiến trúc

- **Đếm ngược “không lệch” trên web:** vẫn cần **mốc `ends_at` trên server**; Socket chỉ **đẩy sự kiện cùng lúc** (hết giờ, tạm dừng). Client có thể hiển thị countdown local + chỉnh offset bằng `exam:server_time` (mở rộng sau).
- REST hiện tại (**nộp bài, lưu DB**) giữ nguyên; Socket **không thay** luồng persist, chỉ bổ sung realtime.

---

## File liên quan

- `src/server.ts` — `http.Server` + `SocketIOServer`, `registerExamSocket(io)`.
- `src/socket/examSocket.ts` — middleware JWT + sự kiện POC.
- `src/types/socket-io.d.ts` — type `socket.data`.
- `scripts/socket-smoke.js`, `socket-student.js`, `socket-proctor.js` — test từ terminal.
