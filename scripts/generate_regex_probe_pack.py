#!/usr/bin/env python3
"""Generate a realistic Word + ZIP pack to probe import regex behavior."""

from __future__ import annotations

import base64
import zipfile
from pathlib import Path

from docx import Document
from docx.shared import Pt

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "BackEnd" / "test-assets"
WORD_PATH = OUT_DIR / "regex_probe_import.docx"
ZIP_PATH = OUT_DIR / "regex_probe_media.zip"

# 1x1 transparent PNG
PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0S8AAAAASUVORK5CYII="
)

DOC_LINES = [
    "ĐỀ KIỂM TRA MẪU — PYTHON CƠ BẢN",
    "45 PHÚT",
    "",
    "CHUONG 1 : Biến",
    "CHUONG 2 : Vòng lặp",
    "CHUONG 3 : Hàm",
    "",
    "CAU 1 [LOAI:TN] [DIEM:0.5] [KHO:DE] [CHUONG:1]",
    "Biến nào sau đây là tên biến hợp lệ trong ngôn ngữ Python?",
    "A. my_var",
    "B. 1variable",
    "C. my-var",
    "D. class",
    "Đáp án: A",
    "",
    "CAU 2 [LOAI:TN] [DIEM:0.5] [KHO:TRUNGBINH] [CHUONG:1]",
    "Kết quả của biểu thức 10 // 3 là bao nhiêu?",
    "A. 3.33",
    "B. 3",
    "C. 4",
    "D. 1",
    "Đáp án: B",
    "",
    "CAU 3 [LOAI:TN-ANH] [DIEM:0.5] [KHO:DE] [CHUONG:2] [ANH:code_python_loop.png]",
    "Quan sát hình minh họa vòng lặp và chọn đáp án đúng.",
    "A. Vòng lặp chạy 1 lần",
    "B. Vòng lặp chạy 2 lần",
    "C. Vòng lặp chạy 3 lần",
    "D. Vòng lặp chạy vô hạn",
    "Đáp án: C",
    "",
    "CAU 4 [LOAI:TL] [DIEM:2] [KHO:TRUNGBINH] [CHUONG:3]",
    "Viết hàm kiểm tra số nguyên tố.",
    "Gợi ý chấm: Đúng logic 1đ, giải thích 1đ.",
]


def build_word() -> None:
    doc = Document()
    style = doc.styles["Normal"]
    style.font.name = "Times New Roman"
    style.font.size = Pt(13)

    for line in DOC_LINES:
      # keep blank lines because Mammoth uses paragraph boundaries heavily
        doc.add_paragraph(line)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    doc.save(WORD_PATH)


def build_zip() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("media/CODE_PYTHON_LOOP.PNG", PNG_BYTES)


def main() -> None:
    build_word()
    build_zip()
    print(f"Wrote {WORD_PATH}")
    print(f"Wrote {ZIP_PATH}")


if __name__ == "__main__":
    main()
