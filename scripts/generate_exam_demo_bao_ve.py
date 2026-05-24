#!/usr/bin/env python3
"""Generate demo exam .docx for thesis defense (MCQ + essay)."""

from pathlib import Path

from docx import Document
from docx.shared import Pt

OUTPUT = Path(__file__).resolve().parents[1] / "BackEnd" / "exam_demo_bao_ve_do_an.docx"

CONTENT = """Tiêu đề: Đề demo — Hệ thống thi trực tuyến (Bảo vệ đồ án)
Thời gian: 30
Mô tả: Đề minh họa import Word, làm bài trực tuyến và chấm tự luận. Dùng cho buổi demo bảo vệ.

PHẦN I — TRẮC NGHIỆM (10 câu, 5 điểm)

[LOAI:TN] [DIEM:0.5] [KHO:DE] [CHUONG:1]
Đồ án xây dựng hệ thống thi trực tuyến. Giao thức nào được dùng để cập nhật trạng thái coi thi theo thời gian thực?
A. HTTP polling mỗi 30 giây
B. WebSocket (Socket.IO)
C. FTP
D. SMTP
Đáp án: B

[LOAI:TN] [DIEM:0.5] [KHO:DE] [CHUONG:1]
Giảng viên import đề thi từ file Word. Dòng bắt đầu mỗi câu trắc nghiệm trong file mẫu phải có thẻ loại nào?
A. Thẻ LOAI:TL (tự luận)
B. Thẻ LOAI:TN (trắc nghiệm)
C. Thẻ LOAI:ZIP
D. Thẻ LOAI:PDF
Đáp án: B

[LOAI:TN] [DIEM:0.5] [KHO:DE] [CHUONG:1]
Thẻ [DIEM:1.5] trong file Word dùng để khai báo điều gì?
A. Thời gian làm bài (phút)
B. Điểm của câu hỏi
C. Mã lớp hành chính
D. Số mã đề
Đáp án: B

[LOAI:TN] [DIEM:0.5] [KHO:TRUNGBINH] [CHUONG:2]
Khi sinh viên làm bài, hệ thống lưu bản nháp (autosave) nhằm mục đích gì?
A. Gửi email kết quả
B. Khôi phục bài làm nếu mất kết nối hoặc tải lại trang
C. In đề ra giấy
D. Đổi mật khẩu tự động
Đáp án: B

[LOAI:TN] [DIEM:0.5] [KHO:TRUNGBINH] [CHUONG:2]
Tính năng giám sát (proctoring) có thể ghi nhận sự kiện nào sau đây?
A. Sinh viên chuyển tab hoặc thoát toàn màn hình
B. Thay đổi font chữ trong Word
C. Cài đặt máy in
D. Cập nhật driver card màn hình
Đáp án: A

[LOAI:TN] [DIEM:0.5] [KHO:TRUNGBINH] [CHUONG:2]
Một bài thi có 2 mã đề (D01, D02). Hệ thống phân phối mã đề cho sinh viên như thế nào?
A. Sinh viên tự chọn mã đề trên giao diện
B. Chia đều / ngẫu nhiên theo cấu hình, mỗi sinh viên một mã đề
C. Tất cả sinh viên luôn nhận D01
D. Chỉ admin mới thấy mã đề
Đáp án: B

[LOAI:TN] [DIEM:0.5] [KHO:TRUNGBINH] [CHUONG:3]
Câu hỏi tự luận sau khi sinh viên nộp bài thường ở trạng thái chấm nào trước khi có điểm cuối?
A. Tự động chấm ngay, không cần giáo viên
B. Chờ giáo viên chấm tay (pending_manual)
C. Không lưu bài làm
D. Chỉ lưu điểm 0 hoặc 10
Đáp án: B

[LOAI:TN] [DIEM:0.5] [KHO:KHO] [CHUONG:3]
API REST của hệ thống thường xác thực người dùng bằng cơ chế nào?
A. Cookie session thuần HTML
B. JWT (JSON Web Token) trong header Authorization
C. Không xác thực
D. Chỉ xác thực bằng IP
Đáp án: B

[LOAI:TN] [DIEM:0.5] [KHO:KHO] [CHUONG:3]
Trong file Word soạn đề, dòng "Đáp án: C" có vai trò gì?
A. Ghi chú cho sinh viên đọc thêm
B. Khai báo đáp án đúng cho câu trắc nghiệm khi import
C. Đặt tiêu đề bài thi
D. Cấu hình thời gian server
Đáp án: B

[LOAI:TN] [DIEM:0.5] [KHO:DE] [CHUONG:1]
Frontend của đồ án được xây dựng chủ yếu bằng công nghệ nào?
A. React + TypeScript
B. PHP thuần
C. WordPress theme
D. Flutter mobile only
Đáp án: A

PHẦN II — TỰ LUẬN (2 câu, 5 điểm)

[LOAI:TL] [DIEM:2.5] [KHO:TRUNGBINH] [CHUONG:4]
Câu 1 (2.5 điểm): Trình bày luồng hoạt động khi sinh viên làm bài thi trên hệ thống, từ lúc bấm "Bắt đầu" đến khi "Nộp bài". Nêu ít nhất 4 bước và vai trò của REST API / Socket (nếu có).
Gợi ý chấm: Bắt đầu phiên (1đ); tải câu hỏi theo mã đề (0.5đ); làm bài + autosave (0.5đ); nộp bài + cập nhật trạng thái (0.5đ).

[LOAI:TL] [DIEM:2.5] [KHO:KHO] [CHUONG:4]
Câu 2 (2.5 điểm): So sánh ưu và nhược điểm của việc soạn đề bằng file Word có thẻ [LOAI:TN]/[LOAI:TL] so với nhập từng câu trực tiếp trên giao diện web. Đề xuất khi nào nên dùng mỗi cách.
Gợi ý chấm: Nêu được lợi Word (quen thuộc, soạn offline, copy nhiều câu) (1đ); nêu hạn chế (sai format, cần preview) (0.75đ); đề xuất hợp lý (0.75đ).
"""


def main() -> None:
    doc = Document()
    style = doc.styles["Normal"]
    style.font.name = "Times New Roman"
    style.font.size = Pt(13)

    for line in CONTENT.split("\n"):
        if not line.strip():
            continue
        para = doc.add_paragraph(line)
        if line.startswith("PHẦN") or line.startswith("Tiêu đề:"):
            for run in para.runs:
                run.bold = True

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUTPUT)
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
