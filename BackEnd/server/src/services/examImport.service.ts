import mammoth from "mammoth";
import type { QuestionType } from "~/models/question.model";

export interface ImportedQuestionDraft {
  content: string;
  question_type: QuestionType;
  points: number;
  options?: Record<string, string> | null;
  correct_answer?: string | string[] | null;
  display_order: number;
}

export interface ImportedExamDraft {
  title?: string;
  duration_min?: number;
  description?: string;
}

export interface ExamImportPreview {
  exam: ImportedExamDraft;
  questions: ImportedQuestionDraft[];
  errors: string[];
  warnings: string[];
}

interface MutableQuestionDraft {
  index: number;
  question_type: QuestionType;
  points: number;
  contentLines: string[];
  options: Record<string, string>;
  correct_answer: string | string[] | null;
}

const HEADER_RE = /^Q(?:uestion)?\s*(\d+)?\s*\[(mcq|essay)\]\s*\[(\d+(?:\.\d+)?)\]\s*$/i;
const OPTION_RE = /^([A-Z])[\.)]\s+(.+)$/;
const ANSWER_RE = /^(Answer|Đáp án|Dap an)\s*:\s*(.+)$/i;
const TITLE_RE = /^(Title|Tiêu đề|Tieu de)\s*:\s*(.+)$/i;
const DURATION_RE = /^(Duration|Thời gian|Thoi gian)\s*:\s*(\d+)$/i;
const DESCRIPTION_RE = /^(Description|Mô tả|Mo ta)\s*:\s*(.*)$/i;

function normalizeText(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeAnswer(raw: string): string | string[] {
  const parts = raw
    .split(/[,;]/)
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean);
  return parts.length > 1 ? parts : parts[0] ?? "";
}

function finalizeQuestion(
  current: MutableQuestionDraft | null,
  questions: ImportedQuestionDraft[],
  errors: string[]
) {
  if (!current) return;

  const content = current.contentLines.join("\n").trim();
  if (!content) {
    errors.push(`Câu ${current.index}: thiếu nội dung câu hỏi.`);
  }

  if (current.question_type === "mcq") {
    if (Object.keys(current.options).length < 2) {
      errors.push(`Câu ${current.index}: câu trắc nghiệm cần ít nhất 2 lựa chọn.`);
    }
    if (!current.correct_answer) {
      errors.push(`Câu ${current.index}: câu trắc nghiệm thiếu đáp án đúng.`);
    }
  }

  questions.push({
    content,
    question_type: current.question_type,
    points: current.points,
    options: current.question_type === "mcq" ? current.options : null,
    correct_answer: current.question_type === "mcq" ? current.correct_answer : null,
    display_order: questions.length + 1,
  });
}

export function parseExamImportText(text: string): ExamImportPreview {
  const lines = normalizeText(text);
  const exam: ImportedExamDraft = {};
  const questions: ImportedQuestionDraft[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let current: MutableQuestionDraft | null = null;
  let descriptionLines: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(HEADER_RE);
    if (headerMatch) {
      finalizeQuestion(current, questions, errors);
      const parsedPoints = Number(headerMatch[3]);
      current = {
        index: questions.length + 1,
        question_type: headerMatch[2].toLowerCase() as QuestionType,
        points: Number.isFinite(parsedPoints) && parsedPoints > 0 ? parsedPoints : 1,
        contentLines: [],
        options: {},
        correct_answer: null,
      };
      continue;
    }

    if (!current) {
      const titleMatch = line.match(TITLE_RE);
      const durationMatch = line.match(DURATION_RE);
      const descriptionMatch = line.match(DESCRIPTION_RE);
      if (titleMatch) {
        exam.title = titleMatch[2].trim();
      } else if (durationMatch) {
        exam.duration_min = Number(durationMatch[2]);
      } else if (descriptionMatch) {
        descriptionLines = [descriptionMatch[2].trim()].filter(Boolean);
      } else if (descriptionLines.length) {
        descriptionLines.push(line);
      } else {
        warnings.push(`Bỏ qua dòng ngoài câu hỏi: ${line}`);
      }
      continue;
    }

    const answerMatch = line.match(ANSWER_RE);
    if (answerMatch) {
      current.correct_answer = normalizeAnswer(answerMatch[2]);
      continue;
    }

    const optionMatch = line.match(OPTION_RE);
    if (current.question_type === "mcq" && optionMatch) {
      current.options[optionMatch[1].toUpperCase()] = optionMatch[2].trim();
      continue;
    }

    current.contentLines.push(line);
  }

  finalizeQuestion(current, questions, errors);
  if (descriptionLines.length) exam.description = descriptionLines.join("\n");
  if (!questions.length) errors.push("Không tìm thấy câu hỏi nào trong file.");
  if (exam.duration_min !== undefined && (!Number.isFinite(exam.duration_min) || exam.duration_min <= 0)) {
    errors.push("Duration phải là số phút lớn hơn 0.");
  }

  return { exam, questions, errors, warnings };
}

export async function parseExamImportDocx(buffer: Buffer): Promise<ExamImportPreview> {
  const result = await mammoth.extractRawText({ buffer });
  return parseExamImportText(result.value);
}
