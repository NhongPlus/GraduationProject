#!/usr/bin/env python3
"""Generate the downloadable Word import sample pack."""

from __future__ import annotations

import math
import struct
import tempfile
import wave
import zipfile
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw
from docx import Document
from docx.shared import Pt

ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "BackEnd"

DOCX_OUTPUT = BACKEND_DIR / "exam_template_GiaoVien.docx"
MEDIA_ZIP_OUTPUT = BACKEND_DIR / "exam_template_media_samples.zip"
PACK_OUTPUT = BACKEND_DIR / "exam_import_sample_pack.zip"

IMAGE_NAME = "code_python_loop.png"
AUDIO_NAME = "python_question_01.wav"
VIDEO_NAME = "python_demo_01.mp4"
README_NAME = "README_MAU_IMPORT.txt"


def build_content() -> str:
    return f"""Tiêu đề: Đề kiểm tra mẫu — Python cơ bản
Thời gian: 45
Mô tả: File mẫu sạch để import trực tiếp.

CHUONG 1 : Biến và kiểu dữ liệu
CHUONG 2 : Cấu trúc điều kiện và vòng lặp
CHUONG 3 : Hàm

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

CAU 3 [LOAI:TN-ANH] [DIEM:0.5] [KHO:DE] [CHUONG:2] [ANH:{IMAGE_NAME}]
Quan sát hình minh họa vòng lặp và chọn đáp án đúng.
A. Vòng lặp chạy 1 lần
B. Vòng lặp chạy 2 lần
C. Vòng lặp chạy 3 lần
D. Vòng lặp chạy vô hạn
Đáp án: C

CAU 4 [LOAI:TN-AUDIO] [DIEM:0.5] [KHO:TRUNGBINH] [CHUONG:2] [AUDIO:{AUDIO_NAME}]
Nghe đoạn âm thanh mẫu và chọn từ khóa được nhắc đến trong ví dụ.
A. list
B. tuple
C. dictionary
D. set
Đáp án: C

CAU 5 [LOAI:TN-VIDEO] [DIEM:0.5] [KHO:DE] [CHUONG:3] [VIDEO:{VIDEO_NAME}]
Xem video minh họa và cho biết hàm nào được gọi trong ví dụ.
A. print()
B. len()
C. range()
D. input()
Đáp án: A

CAU 6 [LOAI:TL] [DIEM:2] [KHO:KHO] [CHUONG:3]
Viết hàm Python kiểm tra số nguyên dương n có phải số nguyên tố không. Giải thích độ phức tạp thời gian.
Gợi ý chấm: Hàm đúng 1đ; giải thích O(√n) 1đ.
"""


def write_docx(content: str) -> None:
    doc = Document()
    style = doc.styles["Normal"]
    style.font.name = "Times New Roman"
    style.font.size = Pt(13)

    for line in content.split("\n"):
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

    DOCX_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(DOCX_OUTPUT)


def build_image(path: Path) -> None:
    image = Image.new("RGB", (960, 540), color=(245, 247, 250))
    draw = ImageDraw.Draw(image)
    draw.rectangle((80, 80, 880, 460), outline=(37, 99, 235), width=5)
    draw.text((120, 140), "for i in range(3):", fill=(17, 24, 39))
    draw.text((120, 220), "    print(i)", fill=(17, 24, 39))
    draw.text((120, 330), "Output: 0 1 2", fill=(16, 185, 129))
    image.save(path)


def build_audio(path: Path) -> None:
    sample_rate = 22050
    duration_s = 1.0
    frequency = 440.0
    amplitude = 12000
    total_samples = int(sample_rate * duration_s)

    with wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        frames = bytearray()
        for idx in range(total_samples):
            value = int(amplitude * math.sin(2 * math.pi * frequency * idx / sample_rate))
            frames.extend(struct.pack("<h", value))
        wav_file.writeframes(bytes(frames))


def build_video(path: Path) -> None:
    width, height = 960, 540
    fps = 12
    writer = cv2.VideoWriter(
        str(path),
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (width, height),
    )
    if not writer.isOpened():
        raise RuntimeError("Không thể tạo video mẫu .mp4 bằng OpenCV trên máy hiện tại.")

    for frame_index in range(24):
        frame = np.full((height, width, 3), (240, 244, 248), dtype=np.uint8)
        cv2.rectangle(frame, (80, 80), (880, 460), (59, 130, 246), 4)
        cv2.putText(frame, "Video sample for [VIDEO:python_demo_01.mp4]", (110, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (31, 41, 55), 2)
        cv2.putText(frame, "Frame {}".format(frame_index + 1), (110, 260), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (5, 150, 105), 2)
        cv2.putText(frame, "Use this file to test ZIP matching.", (110, 340), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (31, 41, 55), 2)
        writer.write(frame)
    writer.release()


def build_media_zip() -> None:
    with tempfile.TemporaryDirectory() as temp_dir_str:
        temp_dir = Path(temp_dir_str)
        image_path = temp_dir / IMAGE_NAME
        audio_path = temp_dir / AUDIO_NAME
        video_path = temp_dir / VIDEO_NAME

        build_image(image_path)
        build_audio(audio_path)
        build_video(video_path)

        with zipfile.ZipFile(MEDIA_ZIP_OUTPUT, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            archive.write(image_path, arcname=IMAGE_NAME)
            archive.write(audio_path, arcname=AUDIO_NAME)
            archive.write(video_path, arcname=VIDEO_NAME)


def build_readme() -> str:
    return f"""BỘ MẪU IMPORT ĐỀ THI

File đính kèm:
1. exam_template_GiaoVien.docx
2. exam_template_media_samples.zip

Cách test nhanh:
- Mở file Word mẫu và import lên hệ thống
- Nếu có media, chọn thêm file ZIP media mẫu đi kèm
- Hệ thống sẽ tự đối chiếu:
  * [ANH:{IMAGE_NAME}]
  * [AUDIO:{AUDIO_NAME}]
  * [VIDEO:{VIDEO_NAME}]

Lưu ý:
- Tên file trong ZIP phải khớp với thẻ trong Word
- Hệ thống không phân biệt hoa/thường và bỏ qua thư mục con
- Space / "-" / "_" được coi là tương đương khi đối chiếu
"""


def build_outer_pack() -> None:
    with zipfile.ZipFile(PACK_OUTPUT, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.write(DOCX_OUTPUT, arcname=DOCX_OUTPUT.name)
        archive.write(MEDIA_ZIP_OUTPUT, arcname=MEDIA_ZIP_OUTPUT.name)
        archive.writestr(README_NAME, build_readme())


def main() -> None:
    content = build_content()
    write_docx(content)
    build_media_zip()
    build_outer_pack()
    print(f"Wrote {DOCX_OUTPUT}")
    print(f"Wrote {MEDIA_ZIP_OUTPUT}")
    print(f"Wrote {PACK_OUTPUT}")


if __name__ == "__main__":
    main()
