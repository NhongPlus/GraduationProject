# Hướng dẫn Test Teacher UI - Từng bước chi tiết

## Trước khi bắt đầu

1. Mở 2 cửa sổ terminal:
   - **Terminal 1**: `cd BackEnd/server && npm run dev` (Backend chạy port 5000)
   - **Terminal 2**: `cd FrontEnd/client && npm run dev` (Frontend chạy port 5173)
2. Mở trình duyệt: `http://localhost:5173`

---
| Role | Email | Password |
|------|-------|----------|
| Admin | `admin01@system.local` | `Test@123` |
| Teacher | `gv01@system.local` | `Test@123` |
| Student | `sv01@system.local` | `Test@123` |

## Bước 0: Chuẩn bị DB (bắt buộc trước khi test GV)

Hệ thống mới dùng **lớp hành chính** (`CNTT 16-02`). Giáo viên phải được **gán chủ nhiệm** lớp đó; nếu không, màn tạo đề sẽ hiện *"Chưa được gán lớp quản lý"*.

### 0.1 Chạy migration (lần đầu hoặc DB mới)

```bash
cd BackEnd/server
npm run migrate
```

### 0.2 Gán GV `gv01` quản lý lớp CNTT 16-02

```bash
cd BackEnd/server
npm run assign-teacher-class
```

Hoặc gán email cụ thể:

```bash
npx ts-node -r tsconfig-paths/register scripts/assign-teacher-admin-class.ts gv01@system.local
```

**Kỳ vọng:** Console in ra `Đã gán gv01@system.local → chủ nhiệm CNTT 16-02`.

### 0.3 Kiểm tra nhanh bằng API (tùy chọn)

```bash
# Đăng nhập GV
curl.exe -s -X POST "http://localhost:5000/v1/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"gv01@system.local\",\"password\":\"Test@123\"}"

# Lấy token → gọi (thay YOUR_JWT)
curl.exe -s "http://localhost:5000/v1/admin-classes/me" -H "Authorization: Bearer YOUR_JWT"
```

**Kỳ vọng:** JSON có `display_name`: `CNTT 16-02`.

### 0.4 Trên UI

1. **Đăng xuất** (nếu đang login) → đăng nhập lại `gv01@system.local` / `Test@123`
2. Vào **Tạo bài thi** → ô **Lớp hành chính** hiển thị `CNTT 16-02` (không còn dòng cảnh báo)
3. **Môn học** — mở picker 2 cột, chọn 1 môn

**SQL thủ công (Neon / pgAdmin)** nếu script lỗi:

```sql
UPDATE admin_classes ac
SET manager_teacher_id = a.id
FROM accounts a
WHERE ac.display_name = 'CNTT 16-02'
  AND a.email = 'gv01@system.local';
```

---

## Bước 1: Đăng nhập với tài khoản Teacher

1. Mở `http://localhost:5173`
2. Nhập **Email** và **Password** của tài khoản Teacher
3. Nhấn **Đăng nhập**
4. Sau khi đăng nhập thành công, bạn sẽ thấy **Sidebar bên trái** và **Dashboard** ở giữa

---

## Màn 1: Dashboard (Trang chủ)

**URL:** `http://localhost:5173/main`

### Các thành phần cần kiểm tra:

- [ ] Hiển thị **tên giáo viên** ở góc trên
- [ ] Menu **Sidebar bên trái** có các mục:
  - Dashboard
  - Bài thi (Exam)
  - Ngân hàng câu hỏi (Question Bank)
  - Lịch thi / Ca thi
  - Chấm điểm (Grading)
  - Giám thị (Proctoring) — nếu có
  - Thông báo (Notification Bell ở header)
- [ ] Dashboard hiển thị:
  - Số bài thi đã tạo
  - Số sinh viên đã làm bài
  - Các bài thi gần đây

---

## Màn 2: Danh sách Bài thi

**URL:** `http://localhost:5173/main/exam` (hoặc click menu "Bài thi")

### Kiểm tra bảng danh sách:

- [ ] Bảng hiển thị các cột: **Tên bài thi**, **Lớp**, **Thời gian**, **Hạn nộp**, **Trạng thái**
- [ ] Có **nút Tạo bài thi** (nếu chưa có bài nào, hiển thị empty state)
- [ ] Các **nút hành động** trên mỗi dòng: Sửa, Xóa, Start, Set time
- [ ] **Phân trang** (Pagination) nếu có nhiều bài thi

### Hành động cần test:

#### 2.1 Tạo bài thi mới
1. Nhấn **"Tạo bài thi"** hoặc **"+"**
2. Điền:
   - **Tiêu đề**: `Bài thi Test GV`
   - **Lớp hành chính**: `CNTT 16-02` (tự hiển thị sau Bước 0)
   - **Môn học**: mở picker 2 cột (khối trái → môn phải), chọn 1 môn
   - **Thời gian (phút)**: `60`
   - **Mô tả**: `Bài thi test cho giáo viên`
3. Nhấn **Lưu** hoặc **Tạo**
4. **Kỳ vọng**: Quay lại danh sách, thấy bài thi mới trong bảng

#### 2.2 Sửa bài thi
1. Click **nút Sửa** (biểu tượng bút) trên 1 bài thi
2. Thay đổi **tiêu đề** hoặc **thời gian**
3. Nhấn **Lưu**
4. **Kỳ vọng**: Bảng cập nhật thông tin mới

#### 2.3 Xóa bài thi
1. Click **nút Xóa** (biểu tượng thùng rác)
2. Xác nhận xóa trên modal
3. **Kỳ vọng**: Bài thi biến mất khỏi danh sách

#### 2.4 Set time (đặt thời gian)
1. Click **nút "Set time"** trên 1 bài thi
2. Nhập thời gian mới (ví dụ: `90` phút)
3. **Kỳ vọng**: Thời gian cập nhật trong bảng

#### 2.5 Start (mở thi)
1. Click **nút "Start"** trên 1 bài thi
2. **Kỳ vọng**: Bài thi chuyển sang trạng thái "Đã bắt đầu" / "Đang thi"
3. Lúc này sinh viên có thể vào làm bài

---

## Màn 3: Chi tiết / Tạo Bài thi (ExamAuthoring)

**URL:** `http://localhost:5173/main/exam/create` hoặc `/exam/:id/edit`

### Kiểm tra giao diện:

- [ ] **Tab thông tin bài thi**:
  - Tiêu đề bài thi (TextInput)
  - Lớp học (Select)
  - Thời gian (NumberInput)
  - Hạn nộp (DateTimePicker)
  - Mô tả (Textarea)
- [ ] **Tab danh sách câu hỏi**:
  - Danh sách câu hỏi đã thêm
  - Mỗi câu hiển thị: nội dung, loại (trắc nghiệm/tự luận), điểm
- [ ] **Tab Import từ Word**: Upload file .docx
- [ ] Các nút: **Lưu**, **Cập nhật**, **Xem trước**, **Import**

### Hành động cần test:

#### 3.1 Thêm câu hỏi trắc nghiệm
1. Nhấn **"+"** hoặc **"Thêm câu hỏi"**
2. Chọn loại: **Trắc nghiệm**
3. Nhập nội dung: `1 + 1 = ?`
4. Nhập các đáp án: A, B, C, D
5. Chọn đáp án đúng: **A**
6. Nhập điểm: `1`
7. Nhấn **Lưu**
8. **Kỳ vọng**: Câu hỏi xuất hiện trong danh sách

#### 3.2 Thêm câu hỏi tự luận
1. Nhấn **"+"** hoặc **"Thêm câu hỏi"**
2. Chọn loại: **Tự luận**
3. Nhập nội dung: `Giải thích định lý Pythagoras`
4. Nhập điểm: `5`
5. Nhấn **Lưu**
6. **Kỳ vọng**: Câu hỏi tự luận xuất hiện

#### 3.3 Import từ file Word
1. Nhấn **"Import từ Word"**
2. Upload 1 file `.docx` theo template
3. Nhấn **Preview** để xem trước
4. Nhấn **Import** để thêm vào bài thi
5. **Kỳ vọng**: Các câu hỏi được thêm vào danh sách

#### 3.4 Xóa câu hỏi
1. Click **nút Xóa** trên 1 câu hỏi trong danh sách
2. Xác nhận
3. **Kỳ vọng**: Câu hỏi biến mất

---

## Màn 4: Ngân hàng câu hỏi (Question Bank)

**URL:** `http://localhost:5173/main/question-bank`

### Kiểm tra giao diện:

- [ ] Thanh **tìm kiếm** (tìm theo nội dung)
- [ ] Bộ **lọc**: Loại câu hỏi (trắc nghiệm/tự luận), Độ khó (Dễ/Trung bình/Khó), Môn học
- [ ] Bảng danh sách: Câu hỏi, Loại, Độ khó, Tags, Điểm, Đã sử dụng, Hành động
- [ ] Nút **"Tạo câu hỏi"**
- [ ] Nút **"Import hàng loạt từ Word"**

### Hành động cần test:

#### 4.1 Tạo câu hỏi mới
1. Nhấn **"Tạo câu hỏi"**
2. Điền form:
   - **Nội dung**: `2 + 2 = ?`
   - **Loại**: Trắc nghiệm
   - **Môn**: chọn 1 môn
   - **Điểm**: `1`
   - **Độ khó**: Dễ
   - **Đáp án**: A, B, C, D — chọn đúng là **C**
3. Nhấn **Lưu**
4. **Kỳ vọng**: Câu hỏi xuất hiện trong danh sách

#### 4.2 Thêm câu hỏi vào bài thi
1. Click **"Thêm vào đề thi"** trên 1 câu hỏi
2. Một **Modal** hiện ra → nhập **Exam ID** (lấy từ danh sách bài thi)
3. Nhấn **Xác nhận**
4. **Kỳ vọng**: Câu hỏi được thêm vào đề thi

#### 4.3 Sửa câu hỏi
1. Click **nút Sửa** trên 1 câu hỏi
2. Thay đổi nội dung hoặc đáp án
3. Nhấn **Lưu**
4. **Kỳ vọng**: Câu hỏi cập nhật

#### 4.4 Xóa câu hỏi
1. Click **nút Xóa** trên 1 câu hỏi
2. Xác nhận xóa
3. **Kỳ vọng**: Câu hỏi biến mất

---

## Màn 5: Giám thị (Proctoring)

**URL:** `http://localhost:5173/main/proctoring` (hoặc click menu "Giám thị")

### Yêu cầu:
- Có ít nhất **1 bài thi đang ở trạng thái "Đã bắt đầu"** và có sinh viên đang làm bài

### Kiểm tra giao diện:

- [ ] Dropdown/Combobox **chọn bài thi** (nếu có nhiều bài thi đang thi)
- [ ] Thông tin bài thi: Tên, Thời gian còn lại, Số SV đang thi
- [ ] Danh sách **sinh viên đang online** (nếu có)
- [ ] Số **vi phạm** (tab switch, copy/paste) nếu có
- [ ] Nút **"Gửi cảnh báo"**

### Hành động cần test:

#### 5.1 Xem danh sách sinh viên đang thi
1. Chọn 1 bài thi đang mở
2. **Kỳ vọng**: Hiển thị danh sách sinh viên đang online, thời gian còn lại

#### 5.2 Gửi cảnh báo đến sinh viên
1. Nhấn **"Gửi cảnh báo"**
2. Nhập nội tin nhắn: `Vui lòng quay lại màn hình thi`
3. Nhấn **Gửi**
4. **Kỳ vọng**: Sinh viên nhận được thông báo trên màn hình (nếu đang online)

#### 5.3 Xem logs vi phạm
1. Tìm dòng sinh viên có **số vi phạm > 0**
2. Click vào để xem chi tiết
3. **Kỳ vọng**: Hiển thị danh sách các sự kiện vi phạm (tab switch, blur, copy)

---

## Màn 6: Chấm điểm (Grading)

**URL:** `http://localhost:5173/main/grading`

### Yêu cầu:
- Có ít nhất **1 bài thi đã nộp** và có câu hỏi **tự luận**

### Kiểm tra giao diện:

- [ ] Danh sách bài thi cần chấm
- [ ] Mỗi dòng: Tên bài thi, Số bài chưa chấm, Số bài đã chấm

### Hành động cần test:

#### 6.1 Chấm điểm tự luận
1. Click vào 1 bài thi trong danh sách
2. **Kỳ vọng**: Hiển thị danh sách câu hỏi tự luận của từng sinh viên
3. Nhập **điểm** cho từng câu tự luận
4. Nhập **nhận xét** (nếu có)
5. Nhấn **"Chấm xong"** hoặc **"Lưu"**
6. **Kỳ vọng**: Điểm được lưu, bài chuyển sang "Đã chấm"

---

## Màn 7: Xem kết quả thi (Exam Result)

**URL:** `http://localhost:5173/main/exam-result/:sessionId` (hoặc từ danh sách bài thi)

### Yêu cầu:
- Có ít nhất **1 bài thi đã nộp**

### Kiểm tra giao diện:

- [ ] **Thông tin bài thi**: Tên, Thời gian nộp, Điểm tổng
- [ ] Danh sách câu hỏi:
  - **Trắc nghiệm**: Hiển thị đáp án đã chọn, đáp án đúng, đúng/sai
  - **Tự luận**: Hiển thị nội dung đã trả lời, điểm đã chấm, nhận xét
- [ ] Có hiển thị **giải thích** (explanation) nếu có

### Hành động cần test:

#### 7.1 Xem chi tiết kết quả
1. Click vào 1 bài thi đã nộp
2. **Kỳ vọng**:
   - Câu trắc nghiệm: hiển thị đáp án đã chọn (màu xanh nếu đúng, đỏ nếu sai)
   - Câu tự luận: hiển thị nội dung SV trả lời + điểm
   - Tổng điểm ở đầu trang

---

## Màn 8: Notification Bell (Chuông thông báo)

**Vị trí:** Góc trên bên phải, cạnh nút đổi ngôn ngữ

### Hành động cần test:

#### 8.1 Xem thông báo
1. Nhấn vào **biểu tượng chuông** 🔔
2. **Kỳ vọng**: Dropdown hiện ra với danh sách thông báo
3. Mỗi thông báo hiển thị: **Tiêu đề**, **Nội dung**, **Thời gian**
4. Thông báo **chưa đọc** có **badge số màu đỏ**

#### 8.2 Đánh dấu đã đọc
1. Nhấn **icon ✓** trên 1 thông báo
2. **Kỳ vọng**: Thông báo chuyển sang trạng thái "đã đọc"

#### 8.3 Đánh dấu tất cả đã đọc
1. Nhấn **icon ✓✓** ở header của dropdown
2. **Kỳ vọng**: Tất cả thông báo chuyển sang "đã đọc", badge số mất

---

## Màn 9: Xuất kết quả (Export)

**URL:** Thường nằm trong trang chi tiết bài thi, hoặc menu "Kết quả thi"

### Hành động cần test:

#### 9.1 Export CSV
1. Mở chi tiết 1 bài thi
2. Nhấn **"Export CSV"** hoặc **"Tải kết quả"**
3. Chọn định dạng: **CSV**
4. **Kỳ vọng**: File CSV được tải về, mở bằng Excel thấy đúng dữ liệu

#### 9.2 Export Excel
1. Thay vì CSV, chọn **Excel**
2. **Kỳ vọng**: File `.xls` được tải về, mở bằng Excel đúng format

---

## Checklist Tổng kết

Sau khi test xong tất cả các màn, đánh dấu ✓ những mục đã test và ghi chú lỗi (nếu có):

### Dashboard
- [ ] Đăng nhập thành công với Teacher
- [ ] Sidebar hiển thị đúng menu
- [ ] Notification Bell hoạt động

### Bài thi (Exam)
- [ ] Tạo bài thi mới
- [ ] Sửa bài thi
- [ ] Xóa bài thi
- [ ] Set time (đặt thời gian)
- [ ] Start (mở thi)

### Chi tiết bài thi
- [ ] Thêm câu hỏi trắc nghiệm
- [ ] Thêm câu hỏi tự luận
- [ ] Import từ Word
- [ ] Xóa câu hỏi
- [ ] Lưu bài thi

### Ngân hàng câu hỏi
- [ ] Tạo câu hỏi mới
- [ ] Thêm câu hỏi vào bài thi
- [ ] Sửa câu hỏi
- [ ] Xóa câu hỏi
- [ ] Tìm kiếm/lọc

### Giám thị
- [ ] Xem danh sách SV đang thi
- [ ] Gửi cảnh báo
- [ ] Xem logs vi phạm

### Chấm điểm
- [ ] Xem danh sách bài cần chấm
- [ ] Chấm điểm tự luận
- [ ] Lưu kết quả chấm

### Xuất kết quả
- [ ] Export CSV
- [ ] Export Excel

### Thông báo
- [ ] Xem thông báo
- [ ] Đánh dấu đã đọc
- [ ] Đánh dấu tất cả đã đọc
