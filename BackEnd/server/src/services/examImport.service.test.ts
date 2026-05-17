import { describe, expect, it } from "vitest";
import { parseExamImportText } from "~/services/examImport.service";

describe("parseExamImportText", () => {
  it("parses mixed MCQ and essay questions in order", () => {
    const preview = parseExamImportText(`
Title: Midterm Test
Duration: 60
Description: Mixed exam

Q1 [mcq] [1]
What is 2 + 2?
A. 3
B. 4
C. 5
D. 6
Answer: B

Q2 [essay] [5]
Explain why automated testing matters.
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
    });
  });

  it("reports invalid MCQ without an answer", () => {
    const preview = parseExamImportText(`
Q1 [mcq] [1]
Missing answer example
A. One
B. Two
`);

    expect(preview.errors).toContain("Câu 1: câu trắc nghiệm thiếu đáp án đúng.");
  });

  it("accepts Vietnamese answer label", () => {
    const preview = parseExamImportText(`
Q1 [mcq] [2]
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

[LOAI:TN] [DIEM:0.5] [KHO:DE] [CHUONG:1]
Biến nào hợp lệ trong Python?
A. my_var
B. 1variable
C. my-var
D. class
Đáp án: A

[LOAI:TL] [DIEM:2]
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
[LOAI:TN] [DIEM:___]
Câu hỏi?
A. A
B. B
Đáp án: A
`);

    expect(preview.errors).toEqual([]);
    expect(preview.questions[0].points).toBe(1);
  });
});
