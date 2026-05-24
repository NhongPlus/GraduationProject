#!/usr/bin/env python3
"""Generate plain-text style exam template for teachers (no colored boxes)."""

from pathlib import Path

from docx import Document
from docx.shared import Pt

OUTPUT = Path(__file__).resolve().parents[1] / "BackEnd" / "exam_template_GiaoVien.docx"

CONTENT = """HƯỚNG DẪN SOẠN ĐỀ (đọc trước khi làm)

GHI CHÚ QUAN TRỌNG CHO GIẢNG VIÊN
• Chỉ cần gõ chữ trong Word — KHÔNG cần tô màu, vẽ khung, banner hay bố cục phức tạp.
• Mỗi câu hỏi bắt đầu bằng MỘT DÒNG THẺ (xem mẫu bên dưới), sau đó gõ nội dung câu hỏi.
• Sau khi soạn xong: vào hệ thống → Soạn đề → Import file Word → kiểm tra lại → Lưu.

────────────────────────────────────────
BẢNG 1 — LOẠI CÂU HỎI (chọn một trong các mã sau)

TN hoặc mcq  =  TRẮC NGHIỆM (sinh viên chọn A, B, C, D…)
TL hoặc essay =  TỰ LUẬN (sinh viên tự viết câu trả lời dài)
TN-ANH        =  Trắc nghiệm kèm ảnh (ghi thêm tên file ảnh)
TN-AUDIO      =  Trắc nghiệm kèm file nghe (MP3, WAV…)
TN-VIDEO      =  Trắc nghiệm kèm video (MP4…)

Giải thích mcq và essay (cú pháp cũ, vẫn dùng được):
→ mcq   = Multiple Choice Question = câu trắc nghiệm (giống TN)
→ essay = câu tự luận, chấm tay (giống TL)

Ví dụ so sánh hai cách viết CÙNG MỘT Ý:
→ Cách mới:  dòng đầu ghi [LOAI:TN] [DIEM:1]
→ Cách cũ:   dòng đầu ghi Q1 [mcq] [1]   (Q1 chỉ là nhãn, số thứ tự tự đếm khi import)

────────────────────────────────────────
BẢNG 2 — CÁC THẺ (TAG) TRONG NGOẶC VUÔNG

Thẻ LOAI:TN     — Bắt buộc, loại câu (TN, TL, TN-ANH, TN-AUDIO, TN-VIDEO)
Thẻ DIEM:0.5    — Điểm câu hỏi (VD: 0.5, 1, 2). Bỏ thẻ thì mặc định 1 điểm
Thẻ KHO:DE      — Độ khó: DE (dễ), TRUNGBINH (trung bình), KHO (khó)
Thẻ CHUONG:1    — Chương / chủ đề (số nguyên)
Thẻ ANH:ten.png — Tên file ảnh (upload kèm ZIP khi import)
Thẻ AUDIO:ten.mp3 — File âm thanh
Thẻ VIDEO:ten.mp4 — File video
Thẻ DAPAN:A     — Đáp án đúng (hoặc viết dòng Đáp án: A)

Lưu ý khi gõ thẻ:
→ Mỗi câu: dòng THẺ phải đứng MỘT MÌNH, bắt đầu bằng [LOAI:...]
→ Trắc nghiệm: bắt buộc có A. B. C. D. và dòng Đáp án: X
→ Tự luận: không cần A/B/C/D; có thể thêm dòng Gợi ý chấm: ...

────────────────────────────────────────
THÔNG TIN ĐỀ THI (đặt trước các câu hỏi, tùy chọn)

Tiêu đề: Đề kiểm tra mẫu — Python cơ bản
Thời gian: 45
Mô tả: (có thể ghi thêm yêu cầu chung của đề)

────────────────────────────────────────
PHẦN MẪU — CÁC CÂU HỎI (xóa nội dung mẫu, thay bằng đề của bạn)

(Mẫu câu 1 — Trắc nghiệm thường)
[LOAI:TN] [DIEM:0.5] [KHO:DE] [CHUONG:1]
Biến nào sau đây là tên biến hợp lệ trong ngôn ngữ Python?
A. my_var
B. 1variable
C. my-var
D. class
Đáp án: A

(Mẫu câu 2 — Trắc nghiệm, độ khó trung bình)
[LOAI:TN] [DIEM:0.5] [KHO:TRUNGBINH] [CHUONG:1]
Kết quả của biểu thức 10 // 3 là bao nhiêu?
A. 3.33
B. 3
C. 1
D. Lỗi cú pháp
Đáp án: B

(Mẫu câu 3 — Trắc nghiệm có ảnh: đặt file code_python_loop.png vào ZIP cùng lúc import)
[LOAI:TN-ANH] [DIEM:0.5] [ANH:code_python_loop.png]
Quan sát đoạn code trong ảnh. Kết quả in ra là gì?
A. 0 1 2 3 4
B. 1 2 3 4 5
C. 0 1 2 3
D. 1 2 3 4
Đáp án: A

(Mẫu câu 4 — Tự luận: không cần A/B/C/D, giáo viên chấm tay trên hệ thống)
[LOAI:TL] [DIEM:2] [KHO:KHO] [CHUONG:2]
Viết hàm Python kiểm tra số nguyên dương n có phải số nguyên tố không. Giải thích độ phức tạp thời gian.
Gợi ý chấm: Hàm đúng 1đ; giải thích O(√n) 1đ.

────────────────────────────────────────
PHỤ LỤC — CÚ PHÁP CŨ (Q1 [mcq] [1] — vẫn import được)

Ghi chú:
→ [mcq]   = trắc nghiệm (tương đương [LOAI:TN])
→ [essay] = tự luận (tương đương [LOAI:TL])
→ Số trong [1] hoặc [3] là ĐIỂM của câu đó

Q1 [mcq] [1]
Nội dung câu hỏi trắc nghiệm?
A. Đáp án A
B. Đáp án B
Đáp án: B

Q2 [essay] [3]
Nội dung câu tự luận — sinh viên viết đoạn văn hoặc code, không chọn A/B/C/D.
Gợi ý chấm: (tùy chọn) Mô tả tiêu chí chấm điểm cho giáo viên.

────────────────────────────────────────
CHECKLIST TRƯỚC KHI NỘP

1. Mỗi câu trắc nghiệm đã có đủ đáp án A/B/C/D và dòng Đáp án: ...
2. Đã điền điểm [DIEM:...] (hoặc [số] nếu dùng cú pháp Q1 [mcq] [1])
3. File ảnh/audio/video (nếu có) đã đóng ZIP, tên file khớp với thẻ [ANH:...] / [AUDIO:...] / [VIDEO:...]
4. Import trên hệ thống → xem trước → sửa nếu có cảnh báo → Lưu đề
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
            or line.startswith("PHỤ LỤC")
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
