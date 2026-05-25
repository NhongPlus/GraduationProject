#!/usr/bin/env python3
"""Generate plain-text style exam template for teachers (no colored boxes)."""

from pathlib import Path

from docx import Document
from docx.shared import Pt

OUTPUT = Path(__file__).resolve().parents[1] / "BackEnd" / "exam_template_GiaoVien.docx"

CONTENT = """HƯỚNG DẪN SOẠN ĐỀ THI BẰNG WORD (FORMAT MỚI)

GHI CHÚ QUAN TRỌNG CHO GIẢNG VIÊN
• Chỉ cần gõ chữ trong Word — KHÔNG cần tô màu, vẽ khung, banner hay bố cục phức tạp.
• Hệ thống hiện dùng format mới có CHƯƠNG bắt buộc.
• Nếu thiếu block khai báo CHƯƠNG ở đầu file hoặc thiếu [CHUONG:x] ở từng câu, hệ thống sẽ không cho import hoàn chỉnh.
• Sau khi đã hiểu cách soạn, khi tạo đề thật nên xóa phần hướng dẫn của file mẫu và chỉ giữ lại block CHUONG cùng các câu hỏi thật.
• Nếu quên xóa, hệ thống sẽ cố gắng tự bỏ qua các dòng hướng dẫn phổ biến và hiển thị cảnh báo khi xem trước.
• Sau khi soạn xong: vào hệ thống → Soạn đề → chọn file Word (.docx) → nếu có media thì gửi kèm 1 file ZIP → kiểm tra lại → Lưu.

────────────────────────────────────────
BƯỚC 1 — KHAI BÁO DANH SÁCH CHƯƠNG Ở ĐẦU FILE (BẮT BUỘC)

CHUONG 1 : Biến và kiểu dữ liệu
CHUONG 2 : Cấu trúc điều kiện và vòng lặp
CHUONG 3 : Hàm

Lưu ý:
→ Mỗi chương viết trên một dòng riêng
→ Số chương phải là số nguyên dương
→ Tên chương là nội dung giáo viên tự đặt theo môn học

────────────────────────────────────────
BƯỚC 2 — CÁC THẺ (TAG) DÙNG CHO MỖI CÂU HỎI

Thẻ LOAI:TN         — Bắt buộc, loại câu (TN, TL, TN-ANH, TN-AUDIO, TN-VIDEO)
Thẻ DIEM:0.5        — Điểm câu hỏi (ví dụ: 0.5, 1, 2)
Thẻ KHO:DE          — Độ khó: DE, TRUNGBINH, KHO
Thẻ CHUONG:1        — Bắt buộc, phải khớp với danh sách CHUONG đã khai báo ở đầu file
Thẻ ANH:ten.png     — Tên file ảnh (nếu có), ví dụ: [ANH:code_python_loop.png]
Thẻ AUDIO:ten.mp3   — Tên file audio (nếu có), ví dụ: [AUDIO:python_question_01.mp3]
Thẻ VIDEO:ten.mp4   — Tên file video (nếu có), ví dụ: [VIDEO:python_demo_01.mp4]
Thẻ DAPAN:A         — Đáp án đúng (hoặc có thể viết dòng “Đáp án: A” bên dưới)

Ví dụ dòng thẻ chuẩn:
CAU 1 [LOAI:TN] [DIEM:0.5] [KHO:DE] [CHUONG:1]

Lưu ý khi gõ thẻ:
→ Mỗi câu phải bắt đầu bằng MỘT dòng thẻ riêng
→ Dòng thẻ nên bắt đầu bằng CAU 1 [LOAI:...] hoặc trực tiếp [LOAI:...]
→ [CHUONG:x] là bắt buộc cho mọi câu
→ Nếu là câu trắc nghiệm thì cần đáp án A/B/C/D và dòng Đáp án
→ Nếu là câu tự luận thì không cần A/B/C/D, có thể thêm dòng Gợi ý chấm
→ Khi đối chiếu media từ ZIP: hệ thống so theo tên file gốc, không phân biệt hoa/thường, bỏ qua thư mục con, và coi khoảng trắng / dấu gạch ngang / dấu gạch dưới là tương đương

────────────────────────────────────────
THÔNG TIN ĐỀ THI (TÙY CHỌN)

Tiêu đề: Đề kiểm tra mẫu — Python cơ bản
Thời gian: 45
Mô tả: (có thể ghi thêm yêu cầu chung của đề)

────────────────────────────────────────
PHẦN MẪU — CÁC CÂU HỎI

CAU 1 [LOAI:TN] [DIEM:0.5] [KHO:DE] [CHUONG:1]
Biến nào sau đây là tên biến hợp lệ trong ngôn ngữ Python?
A. my_var
B. 1variable
C. my-var
D. class
Đáp án: A

CAU 2 [LOAI:TN] [DIEM:0.5] [KHO:TRUNGBINH] [CHUONG:2]
Kết quả của đoạn mã sau là gì?
for i in range(3):
    print(i)
A. 1 2 3
B. 0 1 2
C. 0 1 2 3
D. Lỗi cú pháp
Đáp án: B

CAU 3 [LOAI:TN-ANH] [DIEM:0.5] [KHO:DE] [CHUONG:2] [ANH:code_python_loop.png]
Quan sát đoạn code trong ảnh. Kết quả in ra là gì?
A. 0 1 2 3 4
B. 1 2 3 4 5
C. 0 1 2 3
D. 1 2 3 4
Đáp án: A

CAU 4 [LOAI:TN-AUDIO] [DIEM:0.5] [KHO:TRUNGBINH] [CHUONG:2] [AUDIO:python_question_01.mp3]
Nghe đoạn âm thanh và chọn từ khóa được nhắc đến trong ví dụ.
A. list
B. tuple
C. dictionary
D. set
Đáp án: C

CAU 5 [LOAI:TN-VIDEO] [DIEM:0.5] [KHO:DE] [CHUONG:3] [VIDEO:python_demo_01.mp4]
Xem video minh họa và cho biết hàm nào được gọi trong ví dụ.
A. print()
B. len()
C. range()
D. input()
Đáp án: A

CAU 6 [LOAI:TL] [DIEM:2] [KHO:KHO] [CHUONG:3]
Viết hàm Python kiểm tra số nguyên dương n có phải số nguyên tố không. Giải thích độ phức tạp thời gian.
Gợi ý chấm: Hàm đúng 1đ; giải thích O(√n) 1đ.

────────────────────────────────────────
MẪU KHUNG SOẠN NHANH CHO GIẢNG VIÊN

CHUONG 1 : ................................
CHUONG 2 : ................................
CHUONG 3 : ................................

CAU 1 [LOAI:TN] [DIEM:0.5] [KHO:DE] [CHUONG:1]
Nội dung câu hỏi...
A. ...
B. ...
C. ...
D. ...
Đáp án: A

CAU 2 [LOAI:TN-ANH] [DIEM:0.5] [KHO:DE] [CHUONG:2] [ANH:ten_anh.png]
Nội dung câu hỏi dùng ảnh...
A. ...
B. ...
C. ...
D. ...
Đáp án: A

CAU 3 [LOAI:TN-AUDIO] [DIEM:0.5] [KHO:TRUNGBINH] [CHUONG:2] [AUDIO:ten_audio.mp3]
Nội dung câu hỏi dùng audio...
A. ...
B. ...
C. ...
D. ...
Đáp án: B

CAU 4 [LOAI:TN-VIDEO] [DIEM:0.5] [KHO:DE] [CHUONG:3] [VIDEO:ten_video.mp4]
Nội dung câu hỏi dùng video...
A. ...
B. ...
C. ...
D. ...
Đáp án: C

CAU 5 [LOAI:TL] [DIEM:2] [KHO:TRUNGBINH] [CHUONG:2]
Nội dung câu tự luận...
Gợi ý chấm: ...

────────────────────────────────────────
CHECKLIST TRƯỚC KHI NỘP

1. Đã khai báo danh sách CHUONG ở đầu file
2. Mỗi câu đều có [CHUONG:x] hợp lệ
3. Mỗi câu trắc nghiệm có đủ A/B/C/D và dòng Đáp án: ...
4. Đã điền [DIEM:...] và [KHO:...]
5. Nếu có ảnh/audio/video, nên nộp kèm 1 file ZIP chứa toàn bộ media; hệ thống đối chiếu không phân biệt hoa/thường, bỏ qua thư mục con, và coi space / "-" / "_" là tương đương
   Ví dụ: [ANH:code_python_loop.png], [AUDIO:python_question_01.mp3], [VIDEO:python_demo_01.mp4]
6. Nếu ZIP thiếu file hoặc tên không khớp, hệ thống sẽ báo để tải tay từng media còn thiếu ngay trên màn hình xem trước
7. Đã xem trước, sửa cảnh báo nếu có rồi mới lưu đề
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
        if (
            line.startswith("HƯỚNG DẪN")
            or line.startswith("GHI CHÚ")
            or line.startswith("BẢNG")
            or line.startswith("CHECKLIST")
            or line.startswith("PHẦN MẪU")
            or line.startswith("THÔNG TIN")
        ):
            for run in para.runs:
                run.bold = True
        if line.startswith("•") or line.startswith("─") or line.startswith("→"):
            for run in para.runs:
                run.font.size = Pt(12)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUTPUT)
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
