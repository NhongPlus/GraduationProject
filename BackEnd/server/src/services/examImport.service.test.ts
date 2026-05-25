import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  normalizeMediaLookupKey,
  parseExamImportText,
  resolveMediaArchiveInPreview,
} from "~/services/examImport.service";
import { uploadMediaBuffer } from "~/services/cloudinary.service";

vi.mock("~/services/cloudinary.service", async () => {
  const actual = await vi.importActual<typeof import("~/services/cloudinary.service")>(
    "~/services/cloudinary.service"
  );
  return {
    ...actual,
    uploadMediaBuffer: vi.fn(async ({ filename }: { filename: string }) => ({
      url: `http://example.com/${filename}`,
      secure_url: `https://example.com/${filename}`,
      public_id: `exam-media/${filename}`,
      resource_type: "image" as const,
      bytes: 123,
      format: filename.split(".").pop(),
    })),
  };
});

describe("parseExamImportText", () => {
  beforeEach(() => {
    vi.mocked(uploadMediaBuffer).mockClear();
    vi.mocked(uploadMediaBuffer).mockImplementation(async ({ filename }: { filename: string }) => ({
      url: `http://example.com/${filename}`,
      secure_url: `https://example.com/${filename}`,
      public_id: `exam-media/${filename}`,
      resource_type: "image" as const,
      bytes: 123,
      format: filename.split(".").pop(),
    }));
  });

  it("normalizes media lookup keys by basename, lowercase and separator equivalence", () => {
    expect(normalizeMediaLookupKey("folder/TEN ANH.PNG")).toBe("ten_anh.png");
    expect(normalizeMediaLookupKey("folder\\ten-anh.png")).toBe("ten_anh.png");
    expect(normalizeMediaLookupKey(" ten_anh.PNG ")).toBe("ten_anh.png");
  });

  it("parses mixed MCQ and essay questions in order", () => {
    const preview = parseExamImportText(`
Title: Midterm Test
Duration: 60
Description: Mixed exam

CHUONG 1 : Đại số
CHUONG 2 : Tự luận

[LOAI:TN] [DIEM:1] [KHO:DE] [CHUONG:1]
What is 2 + 2?
A. 3
B. 4
C. 5
D. 6
Answer: B

[LOAI:TL] [DIEM:5] [KHO:TRUNGBINH] [CHUONG:2]
Explain why automated testing matters.
Gợi ý chấm: Nêu lợi ích chính.
`);

    expect(preview.errors).toEqual([]);
    expect(preview.exam).toMatchObject({
      title: "Midterm Test",
      duration_min: 60,
      description: "Mixed exam",
    });
    expect(preview.questions).toHaveLength(2);
    expect(preview.questions[0]).toMatchObject({
      question_type: "mcq",
      points: 1,
      options: { A: "3", B: "4", C: "5", D: "6" },
      correct_answer: "B",
      display_order: 1,
    });
    expect(preview.questions[1]).toMatchObject({
      question_type: "essay",
      points: 5,
      display_order: 2,
      chapter: 2,
    });
  });

  it("reports invalid MCQ without an answer", () => {
    const preview = parseExamImportText(`
CHUONG 1 : Logic
[LOAI:TN] [DIEM:1] [KHO:DE] [CHUONG:1]
Missing answer example
A. One
B. Two
`);

    expect(preview.errors).toContain("Câu 1: câu trắc nghiệm thiếu đáp án đúng.");
  });

  it("accepts Vietnamese answer label", () => {
    const preview = parseExamImportText(`
CHUONG 1 : Logic
[LOAI:TN] [DIEM:2] [KHO:DE] [CHUONG:1]
Chọn đáp án đúng
A. Sai
B. Đúng
Đáp án: B
`);

    expect(preview.errors).toEqual([]);
    expect(preview.questions[0].correct_answer).toBe("B");
  });

  it("parses simplified tag format with plain Đáp án line", () => {
    const preview = parseExamImportText(`
Tiêu đề: Đề mẫu
Thời gian: 45

CHUONG 1 : Biến
CHUONG 2 : Hàm

[LOAI:TN] [DIEM:0.5] [KHO:DE] [CHUONG:1]
Biến nào hợp lệ trong Python?
A. my_var
B. 1variable
C. my-var
D. class
Đáp án: A

[LOAI:TL] [DIEM:2] [CHUONG:2]
Viết hàm kiểm tra số nguyên tố.
Gợi ý chấm: Hàm đúng 1đ, giải thích 1đ.
`);

    expect(preview.errors).toEqual([]);
    expect(preview.exam).toMatchObject({ title: "Đề mẫu", duration_min: 45 });
    expect(preview.questions).toHaveLength(2);
    expect(preview.questions[0]).toMatchObject({
      question_type: "mcq",
      points: 0.5,
      correct_answer: "A",
      difficulty: "DE",
      chapter: 1,
    });
    expect(preview.questions[1]).toMatchObject({
      question_type: "essay",
      points: 2,
      answer_hint: "Hàm đúng 1đ, giải thích 1đ.",
    });
  });

  it("ignores decorative section headers from old template", () => {
    const preview = parseExamImportText(`
CHUONG 1 : Trắc nghiệm
PHẦN A — TRẮC NGHIỆM THƯỜNG
Chọn 1 đáp án đúng cho mỗi câu

C1
TN
Loại: [LOAI:TN] | Điểm: [DIEM:0.5] | Độ khó: [KHO:DE] | Chương: [CHUONG:1]
Câu hỏi mẫu?
A. Một
B. Hai
Đáp án: A
`);

    expect(preview.errors).toEqual([]);
    expect(preview.questions).toHaveLength(1);
    expect(preview.questions[0].points).toBe(0.5);
  });

  it("defaults points when DIEM placeholder is unfilled", () => {
    const preview = parseExamImportText(`
CHUONG 1 : Biến
[LOAI:TN] [DIEM:___] [CHUONG:1]
Câu hỏi?
A. A
B. B
Đáp án: A
`);

    expect(preview.errors).toEqual([]);
    expect(preview.questions[0].points).toBe(1);
  });

  it("resolves media from zip and marks the question as auto-mapped", async () => {
    const preview = parseExamImportText(`
CHUONG 1 : Cấu trúc lặp
CAU 1 [LOAI:TN-ANH] [DIEM:0.5] [KHO:DE] [CHUONG:1] [ANH:code python loop.png]
Quan sát ảnh và chọn đáp án đúng.
A. A
B. B
C. C
D. D
Đáp án: A
`);

    const zip = new JSZip();
    zip.file("media/CODE_PYTHON_LOOP.PNG", Buffer.from("fake-image"));
    const buffer = await zip.generateAsync({ type: "nodebuffer" });

    const resolved = await resolveMediaArchiveInPreview(preview, buffer, Date.now());

    expect(vi.mocked(uploadMediaBuffer)).toHaveBeenCalledTimes(1);
    expect(resolved.questions[0].media).toMatchObject({
      filename: "code python loop.png",
      status: "found",
      source: "archive",
      url: "https://example.com/CODE_PYTHON_LOOP.PNG",
    });
    expect(resolved.questions[0].needs_review).toBe(false);
    expect(resolved.parse_summary?.missing_media).toBe(0);
  });

  it("keeps manual review when zip contains duplicate media basenames", async () => {
    const preview = parseExamImportText(`
CHUONG 1 : Cấu trúc lặp
CAU 1 [LOAI:TN-ANH] [DIEM:0.5] [KHO:DE] [CHUONG:1] [ANH:loop.png]
Quan sát ảnh và chọn đáp án đúng.
A. A
B. B
C. C
D. D
Đáp án: A
`);

    const zip = new JSZip();
    zip.file("set-a/loop.png", Buffer.from("a"));
    zip.file("set-b/loop.png", Buffer.from("b"));
    const buffer = await zip.generateAsync({ type: "nodebuffer" });

    const resolved = await resolveMediaArchiveInPreview(preview, buffer, Date.now());

    expect(vi.mocked(uploadMediaBuffer)).not.toHaveBeenCalled();
    expect(resolved.questions[0].media?.status).toBe("missing");
    expect(resolved.questions[0].needs_review).toBe(true);
    expect(resolved.warnings.some((item) => item.includes("loop.png"))).toBe(true);
  });

  it("continues preview with warnings when one media upload fails", async () => {
    vi.mocked(uploadMediaBuffer).mockImplementationOnce(
      async ({ filename }: { filename: string }) => {
        if (filename === "bad.png") {
          throw new Error("rate limit");
        }
        return {
          url: `http://example.com/${filename}`,
          secure_url: `https://example.com/${filename}`,
          public_id: `exam-media/${filename}`,
          resource_type: "image" as const,
          bytes: 123,
          format: filename.split(".").pop(),
        };
      }
    );

    const preview = parseExamImportText(`
CHUONG 1 : Hình ảnh
CAU 1 [LOAI:TN-ANH] [DIEM:0.5] [KHO:DE] [CHUONG:1] [ANH:bad.png]
Q1
A. A
B. B
Đáp án: A

CAU 2 [LOAI:TN-ANH] [DIEM:0.5] [KHO:DE] [CHUONG:1] [ANH:good.png]
Q2
A. A
B. B
Đáp án: A
`);

    const zip = new JSZip();
    zip.file("bad.png", Buffer.from("bad"));
    zip.file("good.png", Buffer.from("good"));
    const buffer = await zip.generateAsync({ type: "nodebuffer" });

    const resolved = await resolveMediaArchiveInPreview(preview, buffer, Date.now());

    expect(resolved.questions[0].media?.status).toBe("missing");
    expect(resolved.questions[0].needs_review).toBe(true);
    expect(resolved.questions[1].media).toMatchObject({
      status: "found",
      source: "archive",
      url: "https://example.com/good.png",
    });
    expect(resolved.warnings.some((item) => item.includes('bad.png'))).toBe(true);
    expect(resolved.warnings.some((item) => item.includes('upload thất bại'))).toBe(true);
  });
});
