# Kế hoạch kiểm thử chức năng thi (Frontend + Backend)

Cập nhật: 2026-04-26  
Phạm vi: Luồng làm bài thi, realtime, force-submit, autosave, integrity.

---

## 1) Chuẩn bị trước khi kiểm thử

- Khởi động Backend và Frontend ở môi trường local hoặc staging.
- Chuẩn bị dữ liệu mẫu:
  - 1 tài khoản `teacher` hoặc `admin`
  - 2 tài khoản `student`
  - 1 đề thi có ít nhất 5 câu (bao gồm trắc nghiệm và tự luận)
- Đảm bảo:
  - Socket hoạt động (`/socket.io`)
  - Token đăng nhập hợp lệ

---

## 2) Checklist kiểm thử chức năng

### A. Bắt đầu bài thi và đồng bộ thời gian

- [ ] A1. Student vào màn hình thi khi teacher chưa bắt đầu:
  - Kết quả mong đợi: hiển thị trạng thái chờ, chưa được làm bài.

- [ ] A2. Teacher bắt đầu bài thi:
  - Kết quả mong đợi: student nhận sự kiện realtime `exam:started`, timer bắt đầu chạy.

- [ ] A3. Hai student vào cùng lúc:
  - Kết quả mong đợi: timer đồng bộ, không bị reset bất thường.

---

### B. Session và nộp bài

- [ ] B1. Student nộp bài bình thường:
  - Kết quả mong đợi: nộp thành công, session chuyển sang `submitted`, có kết quả.

- [ ] B2. Student bấm nộp bài 2 lần:
  - Kết quả mong đợi: không tạo dữ liệu trùng, frontend hiển thị trạng thái hợp lý.

- [ ] B3. Student nộp bài sau khi đã bị force-submit:
  - Kết quả mong đợi: frontend xử lý nhẹ nhàng, không báo lỗi nghiêm trọng (400/409).

---

### C. Force-submit (giáo viên / admin)

- [ ] C1. Teacher gọi API `POST /v1/exams/:examId/force-submit`:
  - Kết quả mong đợi: trả về `summary` gồm số lượng session `active / submitted / failed`.

- [ ] C2. Student đang làm bài nhận force-submit:
  - Kết quả mong đợi: bài thi kết thúc ngay lập tức, hiển thị thông báo + kết quả.

- [ ] C3. Student gọi API force-submit:
  - Kết quả mong đợi: bị từ chối (403).

- [ ] C4. Gọi force-submit lần thứ 2:
  - Kết quả mong đợi: không phát sinh submit trùng, dữ liệu vẫn chính xác.

---

### D. Fullscreen và kiểm tra gian lận (integrity)

- [ ] D1. Vào màn thi nhưng chưa bật fullscreen:
  - Kết quả mong đợi: không bị khóa bài ngay lập tức.

- [ ] D2. Đang thi mà thoát fullscreen:
  - Kết quả mong đợi: ghi nhận vi phạm, có cảnh báo hoặc đếm ngược nộp bài.

- [ ] D3. Chuyển tab hoặc mất focus khi đang thi:
  - Kết quả mong đợi: ghi nhận sự kiện vi phạm và xử lý đúng theo rule.

---

### E. Autosave và khôi phục dữ liệu

- [ ] E1. Đang làm bài thì mất mạng:
  - Kết quả mong đợi: dữ liệu được lưu tạm, không bị mất.

- [ ] E2. Có mạng lại:
  - Kết quả mong đợi: dữ liệu autosave được gửi lại lên server thành công.

- [ ] E3. Dữ liệu lưu dạng `q1/q2` và `question_id`:
  - Kết quả mong đợi: map đúng khi submit, không mất câu trả lời.

---

### F. Reconnect realtime

- [ ] F1. Student mất kết nối socket 5–10 giây rồi vào lại:
  - Kết quả mong đợi: nhận lại trạng thái bài thi chính xác.

- [ ] F2. Trong lúc mất kết nối, teacher force-submit:
  - Kết quả mong đợi: khi reconnect, frontend cập nhật trạng thái đã kết thúc bài.

---

## 3) Kiểm thử API nhanh (tham khảo)

### Force-submit

```bash
curl -X POST "http://localhost:5000/v1/exams/<examId>/force-submit" ^
  -H "Authorization: Bearer <teacher_token>" ^
  -H "Content-Type: application/json"