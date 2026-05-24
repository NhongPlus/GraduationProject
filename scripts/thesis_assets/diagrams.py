# -*- coding: utf-8 -*-
"""Tạo ảnh PNG minh họa lý thuyết (Chương 2) bằng Pillow — không cần matplotlib."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


W, H = 1280, 720
BG = (255, 255, 255)
FG = (20, 20, 20)
BOX = (214, 234, 255)
BOX2 = (255, 243, 224)
LINE = (60, 90, 150)


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in ("arial.ttf", "arialbd.ttf", "times.ttf", "timesbd.ttf", "c:\\windows\\fonts\\arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _new(title: str) -> tuple[Image.Image, ImageDraw.ImageDraw, ImageFont.FreeTypeFont | ImageFont.ImageFont]:
    im = Image.new("RGB", (W, H), BG)
    dr = ImageDraw.Draw(im)
    ft = _font(22)
    dr.text((40, 24), title, fill=FG, font=ft)
    return im, dr, _font(18)


def _rect(dr: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], text: str, fill: tuple[int, int, int]) -> None:
    dr.rounded_rectangle(xy, radius=12, fill=fill, outline=LINE, width=2)
    x1, y1, x2, y2 = xy
    ft = _font(17)
    tw, th = dr.textbbox((0, 0), text, font=ft)[2:]
    dr.text((x1 + (x2 - x1 - tw) // 2, y1 + (y2 - y1 - th) // 2), text, fill=FG, font=ft)


def _arrow(dr: ImageDraw.ImageDraw, a: tuple[int, int], b: tuple[int, int]) -> None:
    dr.line([a, b], fill=LINE, width=3)
    ang = math.atan2(b[1] - a[1], b[0] - a[0])
    for da in (0.45, -0.45):
        x = b[0] - int(18 * math.cos(ang + da))
        y = b[1] - int(18 * math.sin(ang + da))
        dr.line([b, (x, y)], fill=LINE, width=3)


def _arrow_labeled(
    dr: ImageDraw.ImageDraw,
    a: tuple[int, int],
    b: tuple[int, int],
    *,
    card_a: str = "1",
    card_b: str = "N",
) -> None:
    """Mũi tên quan hệ, ghi cardinality gần hai đầu."""
    dr.line([a, b], fill=LINE, width=3)
    ang = math.atan2(b[1] - a[1], b[0] - a[0])
    for da in (0.45, -0.45):
        x = b[0] - int(16 * math.cos(ang + da))
        y = b[1] - int(16 * math.sin(ang + da))
        dr.line([b, (x, y)], fill=LINE, width=3)
    mx, my = (a[0] + b[0]) // 2, (a[1] + b[1]) // 2
    o = 14
    ax = int(o * math.cos(ang + math.pi / 2))
    ay = int(o * math.sin(ang + math.pi / 2))
    ft = _font(16)
    dr.text((a[0] + ax, a[1] + ay), card_a, fill=(120, 40, 40), font=ft)
    dr.text((b[0] - ax - 10, b[1] - ay - 10), card_b, fill=(120, 40, 40), font=ft)


def _entity_box(dr: ImageDraw.ImageDraw, box: tuple[int, int, int, int], title: str, attrs: list[str]) -> None:
    x1, y1, x2, y2 = box
    dr.rounded_rectangle(box, radius=10, fill=(248, 252, 255), outline=LINE, width=2)
    dr.rectangle((x1, y1, x2, y1 + 34), fill=(220, 235, 255), outline=LINE, width=2)
    tfont = _font(17)
    tw = dr.textbbox((0, 0), title, font=tfont)[2]
    dr.text((x1 + (x2 - x1 - tw) // 2, y1 + 6), title, fill=FG, font=tfont)
    y = y1 + 40
    af = _font(14)
    for line in attrs:
        dr.text((x1 + 10, y), line, fill=FG, font=af)
        y += 22


def build_all(out_dir: Path) -> dict[str, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    paths: dict[str, Path] = {}

    # 2.1 Kiến trúc tổng thể
    im, dr, _ = _new("Hình minh họa: Kiến trúc client — server — cơ sở dữ liệu")
    _rect(dr, (80, 100, 360, 220), "Browser\n(React SPA)", BOX)
    _rect(dr, (480, 100, 800, 220), "API Server\n(Node.js / Express)", BOX2)
    _rect(dr, (900, 100, 1180, 220), "PostgreSQL\n(CSDL quan hệ)", BOX)
    _arrow(dr, (360, 160), (480, 160))
    _arrow(dr, (800, 160), (900, 160))
    _rect(dr, (420, 300, 860, 420), "REST /v1  +  JWT  +  Validation (Joi)", BOX)
    dr.line([(640, 220), (640, 300)], fill=LINE, width=2)
    _rect(dr, (420, 460, 860, 600), "Socket.IO (phòng thi, giám sát thời gian thực)", BOX2)
    dr.line([(640, 420), (640, 460)], fill=LINE, width=2)
    p = out_dir / "h2_01_kien_truc_tong_the.png"
    im.save(p)
    paths["h2_01"] = p

    # 2.2 REST
    im, dr, _ = _new("Hình minh họa: Mô hình REST — tài nguyên và HTTP")
    _rect(dr, (100, 110, 380, 200), "Tài nguyên\n/users, /exams", BOX)
    _rect(dr, (450, 110, 730, 200), "Phương thức\nGET POST PATCH DELETE", BOX2)
    _rect(dr, (800, 110, 1080, 200), "Biểu diễn\nJSON + mã trạng thái", BOX)
    for y in (260, 340, 420, 500):
        dr.text((100, y), "•", fill=FG, font=_font(20))
    lines = [
        "GET /v1/exams — liệt kê đề thi theo quyền",
        "POST /v1/exams — tạo đề (teacher/admin)",
        "POST /v1/exams/:id/autosave — lưu nháp bài làm (student)",
        "Versioning /v1 để mở rộng /v2 sau này",
    ]
    for y, t in zip([260, 340, 420, 500], lines, strict=False):
        dr.text((130, y), t, fill=FG, font=_font(19))
    p = out_dir / "h2_02_rest_http.png"
    im.save(p)
    paths["h2_02"] = p

    # 2.3 JWT
    im, dr, _ = _new("Hình minh họa: Luồng xác thực JWT (đơn giản hóa)")
    _rect(dr, (80, 120, 320, 240), "Client\nĐăng nhập", BOX)
    _rect(dr, (400, 120, 640, 240), "Server\nKiểm tra bcrypt", BOX2)
    _rect(dr, (720, 120, 1120, 240), "Phát JWT\n(header.payload.signature)", BOX)
    _arrow(dr, (320, 180), (400, 180))
    _arrow(dr, (640, 180), (720, 180))
    _rect(dr, (200, 320, 1000, 440), "Các request sau: Header Authorization: Bearer <token>", BOX)
    _rect(dr, (200, 480, 1000, 600), "Middleware: verify signature + exp + role (RBAC)", BOX2)
    p = out_dir / "h2_03_jwt_flow.png"
    im.save(p)
    paths["h2_03"] = p

    # 2.4 Socket
    im, dr, _ = _new("Hình minh họa: Socket.IO — room theo examId")
    _rect(dr, (80, 130, 340, 260), "Giám thị\n(teacher/admin)", BOX)
    _rect(dr, (470, 130, 810, 260), "Server\nSocket.IO hub", BOX2)
    _rect(dr, (940, 130, 1180, 260), "Thí sinh\n(n clients)", BOX)
    _arrow(dr, (340, 200), (470, 200))
    _arrow(dr, (810, 200), (940, 200))
    dr.text((400, 300), "Room: exam_<id>  —  events: start, warn, force-submit, presence", fill=FG, font=_font(19))
    _rect(dr, (150, 380, 1130, 520), "Hạn chế single-node → Redis adapter khi scale ngang", BOX2)
    p = out_dir / "h2_04_socket_io.png"
    im.save(p)
    paths["h2_04"] = p

    # 2.5 PostgreSQL / ER đơn giản
    im, dr, _ = _new("Hình minh họa: Mô hình dữ liệu khái niệm (thi trực tuyến)")
    boxes = [
        (60, 120, 220, 220, "users"),
        (250, 120, 410, 220, "exams"),
        (440, 120, 600, 220, "questions"),
        (630, 120, 790, 220, "sessions"),
        (820, 120, 1180, 220, "submissions"),
    ]
    for x1, y1, x2, y2, t in boxes:
        _rect(dr, (x1, y1, x2, y2), t, BOX)
    my = 170
    for i in range(len(boxes) - 1):
        _arrow(dr, (boxes[i][2], my), (boxes[i + 1][0], my))
    dr.text((80, 260), "Khóa ngoại đảm bảo submission gắn session hợp lệ; migration quản lý schema theo phiên bản.", fill=FG, font=_font(18))
    p = out_dir / "h2_05_er_khai_niem.png"
    im.save(p)
    paths["h2_05"] = p

    # 2.6 React
    im, dr, _ = _new("Hình minh họa: React — component & luồng dữ liệu (mô hình)")
    _rect(dr, (100, 120, 400, 240), "UI Components\n(Mantine + TSX)", BOX)
    _rect(dr, (480, 120, 780, 240), "State\n(Redux Toolkit)", BOX2)
    _rect(dr, (860, 120, 1160, 240), "Side effects\n(Axios / Socket client)", BOX)
    dr.text((100, 280), "Định tuyến React Router — i18next — màn Exam runtime + autosave timer", fill=FG, font=_font(19))
    _rect(dr, (100, 360, 1160, 520), "Virtual DOM: cập nhật UI hiệu quả khi đồng hồ và câu trả lời thay đổi liên tục", BOX2)
    p = out_dir / "h2_06_react_model.png"
    im.save(p)
    paths["h2_06"] = p

    # 2.7 Vòng đời thi
    im, dr, _ = _new("Hình minh họa: Vòng đời phiên thi (runtime)")
    steps = [
        (80, 130, "1. Tạo đề / import"),
        (280, 130, "2. Mở session"),
        (480, 130, "3. SV vào làm"),
        (680, 130, "4. Autosave"),
        (880, 130, "5. Nộp / hết giờ"),
        (1080, 130, "6. Chấm"),
    ]
    x = 80
    for i, (sx, sy, lab) in enumerate(steps):
        _rect(dr, (sx, sy, sx + 160, sy + 90), lab, BOX if i % 2 == 0 else BOX2)
        if i < len(steps) - 1:
            _arrow(dr, (sx + 160, sy + 45), (sx + 200, sy + 45))
    dr.text((80, 260), "Integrity events + Socket giám sát song song với luồng HTTP autosave/submit", fill=FG, font=_font(19))
    _rect(dr, (80, 320, 1200, 480), "Server là nguồn sự thật về thời gian còn lại; client hiển thị và gửi sự kiện phụ trợ", BOX2)
    p = out_dir / "h2_07_exam_lifecycle.png"
    im.save(p)
    paths["h2_07"] = p

    # --- Chương 3: sơ đồ quan hệ ER chi tiết ---
    W3, H3 = 1400, 1000
    im = Image.new("RGB", (W3, H3), BG)
    dr = ImageDraw.Draw(im)
    dr.text((40, 20), "Sơ đồ quan hệ thực thể (ER) — Hệ thống thi trực tuyến (logic nghiệp vụ)", fill=FG, font=_font(24))

    u_box = (70, 70, 340, 240)
    s_box = (520, 70, 780, 210)
    e_box = (70, 290, 440, 500)
    q_box = (500, 300, 820, 490)
    es_box = (70, 550, 440, 760)
    sub_box = (500, 570, 880, 800)
    int_box = (940, 570, 1320, 780)

    _entity_box(
        dr,
        u_box,
        "users",
        ["PK  id", "email (UK)", "password_hash", "role", "created_at"],
    )
    _entity_box(
        dr,
        s_box,
        "subjects",
        ["PK  id", "name", "code"],
    )
    _entity_box(
        dr,
        e_box,
        "exams",
        ["PK  id", "FK author_id → users", "FK subject_id → subjects", "title", "duration_min", "config JSON"],
    )
    _entity_box(
        dr,
        q_box,
        "questions",
        ["PK  id", "FK exam_id → exams", "type (MCQ/essay)", "content", "points", "order_idx"],
    )
    _entity_box(
        dr,
        es_box,
        "exam_sessions",
        ["PK  id", "FK exam_id → exams", "status", "started_at", "runtime JSON"],
    )
    _entity_box(
        dr,
        sub_box,
        "submissions",
        ["PK  id", "FK session_id", "FK user_id → users", "answers JSON", "submitted_at", "score"],
    )
    _entity_box(
        dr,
        int_box,
        "integrity_events",
        ["PK  id", "FK session_id", "FK user_id", "event_type", "payload", "created_at"],
    )

    # Quan hệ (mũi tên + cardinality)
    _arrow_labeled(dr, (250, u_box[3]), (250, e_box[1]), card_a="1", card_b="N")
    dr.text((260, 252), "author_id", fill=LINE, font=_font(13))
    _arrow_labeled(dr, ((s_box[0] + s_box[2]) // 2, s_box[3]), (300, e_box[1]), card_a="1", card_b="N")
    dr.text((340, 248), "subject_id", fill=LINE, font=_font(13))
    _arrow_labeled(dr, (e_box[2], (e_box[1] + e_box[3]) // 2), (q_box[0], (q_box[1] + q_box[3]) // 2), card_a="1", card_b="N")
    dr.text((455, 385), "exam_id", fill=LINE, font=_font(13))
    _arrow_labeled(dr, (255, e_box[3]), (255, es_box[1]), card_a="1", card_b="N")
    dr.text((265, 518), "exam_id", fill=LINE, font=_font(13))
    _arrow_labeled(dr, (es_box[2], (es_box[1] + es_box[3]) // 2), (sub_box[0], (sub_box[1] + sub_box[3]) // 2), card_a="1", card_b="N")
    dr.text((455, 655), "session_id", fill=LINE, font=_font(13))
    _arrow_labeled(dr, (u_box[2], 200), (sub_box[0], 620), card_a="1", card_b="N")
    dr.text((360, 400), "user_id", fill=LINE, font=_font(13))
    _arrow_labeled(dr, (es_box[2] - 40, es_box[3] - 30), (int_box[0] + 40, int_box[1] + 40), card_a="1", card_b="N")
    dr.text((780, 720), "session_id", fill=LINE, font=_font(13))

    dr.text(
        (70, 920),
        "Ghi chú: Tên bảng/thuộc tính mang tính minh họa; chi tiết cột và index xem migration trong repo.",
        fill=FG,
        font=_font(15),
    )
    p = out_dir / "h3_01_er_quan_he.png"
    im.save(p)
    paths["h3_01"] = p

    # Use case tổng quát
    im, dr, _ = _new("Sơ đồ use case tổng thể (khối nghiệp vụ theo tác nhân)")
    _rect(dr, (480, 140, 800, 420), "HỆ THỐNG\nTHI TRỰC TUYẾN\n\n• Auth / JWT\n• Đề thi & câu hỏi\n• Phiên thi & autosave\n• Giám sát Socket\n• Chấm điểm & thống kê", BOX2)
    _rect(dr, (80, 160, 280, 280), "Admin\n(quản trị)", BOX)
    _rect(dr, (80, 320, 280, 440), "Giáo viên\n(teacher)", BOX)
    _rect(dr, (80, 480, 280, 600), "Sinh viên\n(student)", BOX)
    _arrow(dr, (280, 220), (480, 210))
    _arrow(dr, (280, 380), (480, 280))
    _arrow(dr, (280, 540), (480, 350))
    _rect(dr, (1000, 200, 1180, 560), "<<include>>\n• Import Word\n• Export điểm\n• Audit log", BOX)
    _arrow(dr, (800, 280), (1000, 320))
    dr.text((80, 660), "Mỗi tác nhân tương tác qua REST /v1 và (đối với thi) kênh Socket.IO theo examId.", fill=FG, font=_font(17))
    p = out_dir / "h3_02_usecase_tong_the.png"
    im.save(p)
    paths["h3_02"] = p

    return paths


def ensure_diagrams(project_root: Path) -> dict[str, Path]:
    out = project_root / "scripts" / "thesis_assets" / "generated"
    return build_all(out)
