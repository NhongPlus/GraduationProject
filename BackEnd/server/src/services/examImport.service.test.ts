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
    expect(preview.questions).toHaveLength(1);
    expect(preview.questions[0]).toMatchObject({
      question_type: "mcq",
      points: 1,
      options: { A: "3", B: "4", C: "5", D: "6" },
      correct_answer: "B",
      display_order: 1,
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
});
