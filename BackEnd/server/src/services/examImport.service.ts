import mammoth from "mammoth";
import { env } from "~/config/enviroment";
import type { QuestionType } from "~/models/question.model";

export interface MediaInfo {
  type: "image" | "audio" | "video";
  filename: string;
  status: "found" | "missing" | "embedded";
  url?: string;
}

export interface ImportedQuestionDraft {
  content: string;
  question_type: QuestionType;
  points: number;
  options?: Record<string, string> | null;
  correct_answer?: string | string[] | null;
  display_order: number;
  difficulty?: "DE" | "TRUNGBINH" | "KHO";
  chapter?: number;
  media?: MediaInfo | null;
  answer_hint?: string | null;
  ai_confidence?: number;
  needs_review?: boolean;
  review_reason?: string | null;
}

export interface ImportedExamDraft {
  title?: string;
  duration_min?: number;
  description?: string;
  subject?: string;
  subject_code?: string;
  semester?: string;
  teacher?: string;
}

export interface ExamImportPreview {
  exam: ImportedExamDraft;
  questions: ImportedQuestionDraft[];
  errors: string[];
  warnings: string[];
  parse_summary?: {
    total_parsed: number;
    auto_ok: number;
    needs_review: number;
    missing_media: number;
    parse_time_ms: number;
  };
}

interface MutableQuestionDraft {
  index: number;
  question_type: QuestionType;
  points: number;
  contentLines: string[];
  options: Record<string, string>;
  correct_answer: string | string[] | null;
  answer_hint: string | null;
  difficulty: "DE" | "TRUNGBINH" | "KHO";
  chapter: number;
  media: MediaInfo | null;
}

const QUESTION_TYPE_MAP: Record<string, QuestionType> = {
  TN: "mcq",
  TL: "essay",
  "TN-ANH": "mcq",
  "TN-AUDIO": "mcq",
  "TN-VIDEO": "mcq",
};

const DIFFICULTY_MAP: Record<string, "DE" | "TRUNGBINH" | "KHO"> = {
  DE: "DE",
  TRUNGBINH: "TRUNGBINH",
  TB: "TRUNGBINH",
  KHO: "KHO",
};

const HEADER_RE = /\[LOAI:(\w+)\]/i;
const DIEM_RE = /\[DIEM:([\d.]+)\]/i;
const KHO_RE = /\[KHO:(\w+)\]/i;
const CHUONG_RE = /\[CHUONG:(\d+)\]/i;
const ANH_RE = /\[ANH:([^\]]+)\]/i;
const AUDIO_RE = /\[AUDIO:([^\]]+)\]/i;
const VIDEO_RE = /\[VIDEO:([^\]]+)\]/i;
const DAPAN_RE = /\[DAPAN:([^\]]+)\]/i;

const LEGACY_HEADER_RE = /^Q(?:uestion)?\s*(\d+)?\s*\[(mcq|essay)\]\s*\[(\d+(?:\.\d+)?)\]\s*$/i;
const LEGACY_OPTION_RE = /^([A-Z])[\.)]\s+(.+)$/;
const LEGACY_ANSWER_RE = /^(Answer|Đáp án|Dap an)\s*:\s*(.+)$/i;
const LEGACY_TITLE_RE = /^(Title|Tiêu đề|Tieu de)\s*:\s*(.+)$/i;
const LEGACY_DURATION_RE = /^(Duration|Thời gian|Thoi gian)\s*:\s*(\d+)$/i;
const LEGACY_DESCRIPTION_RE = /^(Description|Mô tả|Mo ta)\s*:\s*(.*)$/i;

function normalizeText(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/ /g, " ")
    .replace(/"|"/g, '"')
    .replace(/'|'/g, "'")
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
  errors: string[],
  warnings: string[]
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

  let needs_review = false;
  let review_reason: string | null = null;
  if (current.media?.status === "missing") {
    needs_review = true;
    review_reason = `File ${current.media.type} "${current.media.filename}" không tìm thấy.`;
  }
  if (!content) {
    needs_review = true;
    review_reason = "Thiếu nội dung câu hỏi.";
  }

  questions.push({
    content,
    question_type: current.question_type,
    points: current.points,
    options: current.question_type === "mcq" ? current.options : null,
    correct_answer: current.question_type === "mcq" ? current.correct_answer : null,
    answer_hint: current.question_type === "essay" ? current.answer_hint : null,
    display_order: questions.length + 1,
    difficulty: current.difficulty,
    chapter: current.chapter,
    media: current.media,
    ai_confidence: needs_review ? 60 : 90,
    needs_review,
    review_reason: review_reason,
  });
}

function extractQuestionMetadata(line: string): {
  question_type: QuestionType;
  points: number;
  difficulty: "DE" | "TRUNGBINH" | "KHO";
  chapter: number;
  media: MediaInfo | null;
} {
  const typeMatch = line.match(HEADER_RE);
  const typeRaw = typeMatch?.[1]?.toUpperCase() ?? "TN";
  const question_type = QUESTION_TYPE_MAP[typeRaw] ?? "mcq";

  const diemMatch = line.match(DIEM_RE);
  const points = diemMatch ? parseFloat(diemMatch[1]) : 1;

  const khoMatch = line.match(KHO_RE);
  const difficulty = khoMatch
    ? (DIFFICULTY_MAP[khoMatch[1].toUpperCase()] ?? "DE")
    : "DE";

  const chuongMatch = line.match(CHUONG_RE);
  const chapter = chuongMatch ? parseInt(chuongMatch[1]) : 1;

  const anhMatch = line.match(ANH_RE);
  const audioMatch = line.match(AUDIO_RE);
  const videoMatch = line.match(VIDEO_RE);

  let media: MediaInfo | null = null;
  if (anhMatch) {
    media = { type: "image", filename: anhMatch[1], status: "missing" };
  } else if (audioMatch) {
    media = { type: "audio", filename: audioMatch[1], status: "missing" };
  } else if (videoMatch) {
    media = { type: "video", filename: videoMatch[1], status: "missing" };
  }

  return { question_type, points, difficulty, chapter, media };
}

function extractAnswer(line: string): { answer: string | string[] | null; isHint: boolean } {
  const match = line.match(DAPAN_RE);
  if (!match) return { answer: null, isHint: false };
  const raw = match[1].trim();
  const isHint =
    raw.toUpperCase() === "GOI_Y" ||
    raw.toUpperCase() === "HINT" ||
    raw.toUpperCase() === "DA";
  return { answer: isHint ? null : normalizeAnswer(raw), isHint };
}

function parseOptions(lines: string[]): {
  options: Record<string, string>;
  answerLine: string | null;
  contentLines: string[];
} {
  const options: Record<string, string> = {};
  const contentLines: string[] = [];
  let answerLine: string | null = null;

  for (const line of lines) {
    const optionMatch = line.match(/^([A-Z])[\.)]\s+(.+)$/);
    if (optionMatch) {
      options[optionMatch[1].toUpperCase()] = optionMatch[2].trim();
      continue;
    }
    if (line.match(DAPAN_RE)) {
      answerLine = line;
      continue;
    }
    contentLines.push(line);
  }

  return { options, answerLine, contentLines };
}

export function parseExamImportText(text: string): ExamImportPreview {
  const startTime = Date.now();
  const lines = normalizeText(text);
  const exam: ImportedExamDraft = {};
  const questions: ImportedQuestionDraft[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  let current: MutableQuestionDraft | null = null;
  let descriptionLines: string[] = [];
  let isLegacyMode = false;

  for (const line of lines) {
    const headerMatch = line.match(HEADER_RE);
    if (headerMatch) {
      if (current) finalizeQuestion(current, questions, errors, warnings);

      const meta = extractQuestionMetadata(line);
      const { answer, isHint } = extractAnswer(line);

      current = {
        index: questions.length + 1,
        question_type: meta.question_type,
        points: meta.points,
        contentLines: [],
        options: {},
        correct_answer: isHint ? null : (answer as string | string[] | null),
        answer_hint: isHint ? line.replace(DAPAN_RE, "").trim() : null,
        difficulty: meta.difficulty,
        chapter: meta.chapter,
        media: meta.media,
      };
      continue;
    }

    if (!current && !isLegacyMode) {
      const legacyHeaderMatch = line.match(LEGACY_HEADER_RE);
      if (legacyHeaderMatch) {
        isLegacyMode = true;
        if (current) finalizeQuestion(current, questions, errors, warnings);
        const parsedPoints = Number(legacyHeaderMatch[3]);
        current = {
          index: questions.length + 1,
          question_type: legacyHeaderMatch[2].toLowerCase() as QuestionType,
          points: Number.isFinite(parsedPoints) && parsedPoints > 0 ? parsedPoints : 1,
          contentLines: [],
          options: {},
          correct_answer: null,
          answer_hint: null,
          difficulty: "DE",
          chapter: 1,
          media: null,
        };
        continue;
      }
    }

    if (!current) {
      const titleMatch = line.match(LEGACY_TITLE_RE);
      const durationMatch = line.match(LEGACY_DURATION_RE);
      const descriptionMatch = line.match(LEGACY_DESCRIPTION_RE);
      if (titleMatch) {
        exam.title = titleMatch[2].trim();
      } else if (durationMatch) {
        exam.duration_min = Number(durationMatch[2]);
      } else if (descriptionMatch) {
        descriptionLines = [descriptionMatch[2].trim()].filter(Boolean);
      } else if (descriptionLines.length) {
        descriptionLines.push(line);
      } else if (line.length > 3) {
        warnings.push(`Bỏ qua dòng ngoài câu hỏi: ${line.slice(0, 50)}`);
      }
      continue;
    }

    if (isLegacyMode) {
      const answerMatch = line.match(LEGACY_ANSWER_RE);
      if (answerMatch) {
        current.correct_answer = normalizeAnswer(answerMatch[2]);
        continue;
      }

      const optionMatch = line.match(LEGACY_OPTION_RE);
      if (optionMatch) {
        current.options[optionMatch[1].toUpperCase()] = optionMatch[2].trim();
        continue;
      }

      current.contentLines.push(line);
    } else {
      if (line.match(DAPAN_RE)) {
        const { answer, isHint } = extractAnswer(line);
        if (isHint) {
          current.answer_hint = line
            .replace(DAPAN_RE, "")
            .replace(/\[DAPAN:[^\]]*\]/g, "")
            .trim();
        } else {
          current.correct_answer = answer as string | string[] | null;
        }
        continue;
      }

      const { options } = parseOptions([line]);
      if (Object.keys(options).length > 0) {
        Object.assign(current.options, options);
      } else {
        current.contentLines.push(line);
      }
    }
  }

  finalizeQuestion(current, questions, errors, warnings);
  if (descriptionLines.length) exam.description = descriptionLines.join("\n");
  if (!questions.length && errors.length === 0) {
    errors.push(
      "Không tìm thấy câu hỏi nào trong file. Hãy dùng format TAG: [LOAI:TN] [DIEM:1] [KHO:DE]"
    );
  }
  if (
    exam.duration_min !== undefined &&
    (!Number.isFinite(exam.duration_min) || exam.duration_min <= 0)
  ) {
    errors.push("Duration phải là số phút lớn hơn 0.");
  }

  const totalParsed = questions.length;
  const needsReview = questions.filter((q) => q.needs_review).length;
  const missingMedia = questions.filter((q) => q.media?.status === "missing").length;

  return {
    exam,
    questions,
    errors,
    warnings,
    parse_summary: {
      total_parsed: totalParsed,
      auto_ok: totalParsed - needsReview,
      needs_review: needsReview,
      missing_media: missingMedia,
      parse_time_ms: Date.now() - startTime,
    },
  };
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function parseExamImportDocx(buffer: Buffer): Promise<ExamImportPreview> {
  const result = await mammoth.extractRawText({ buffer });
  return parseExamImportText(result.value);
}

// ─── AI Recompose via MiniMax ────────────────────────────────────────────────

const AI_SYSTEM_PROMPT = `Bạn là trợ lý phân tích và sửa lỗi đề thi tiếng Việt.
Nhận một danh sách câu hỏi đã được parse từ file Word, có thể bị lỗi hoặc thiếu thông tin.
Sửa các lỗi sau:
- Thiếu đáp án đúng (guess nếu rõ ràng, ngược lại đánh dấu needs_review: true)
- Thiếu điểm số hoặc điểm = 0
- Content quá ngắn hoặc trống
- Câu trắc nghiệm thiếu đáp án
- Điền thông tin mặc định hợp lý (difficulty: DE, chapter: 1)

Trả về JSON theo schema:
{
  "questions": [{
    "content": "nội dung câu hỏi",
    "question_type": "mcq" | "essay",
    "points": số,
    "options": {"A": "đáp án A", "B": "...", "C": "...", "D": "..."} | null,
    "correct_answer": "A" | ["A","C"] | null,
    "display_order": số,
    "difficulty": "DE" | "TRUNGBINH" | "KHO",
    "chapter": số,
    "media": null | {type, filename, status},
    "answer_hint": null | "gợi ý",
    "ai_confidence": 0-100,
    "needs_review": boolean,
    "review_reason": null | "lý do cần review"
  }],
  "summary": {
    "total": số,
    "fixed": số câu đã sửa,
    "needs_review": số câu còn lỗi
  }
}
CHỉ trả về JSON, không thêm giải thích gì khác.`;

/**
 * Trích content từ MiniMax response.
 * API v2 có thể trả content dạng string hoặc array of content blocks.
 */
function extractContentFromMessage(message: any): string {
  const content = message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.find((c: any) => c.type === "text")?.text ?? "";
  }
  return "";
}

/**
 * Parse JSON từ raw string của AI — handle markdown code block, trailing text, v.v.
 */
function parseAIJsonResponse(raw: string): {
  questions: ImportedQuestionDraft[];
  summary: { total: number; fixed: number; needs_review: number };
} {
  let jsonStr = raw.trim();

  // Ưu tiên lấy từ ```json ... ``` block
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  } else {
    // Tìm JSON object đầu tiên/cuối cùng trong response
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (objMatch) jsonStr = objMatch[0].trim();
  }

  // Thử parse thẳng
  try {
    return JSON.parse(jsonStr);
  } catch {
    // Fallback: strip control chars và trailing commas
    const cleaned = jsonStr
      .replace(/[\x00-\x1F\x7F]/g, "")
      .replace(/,(\s*[}\]])/g, "$1");
    return JSON.parse(cleaned); // throw nếu vẫn lỗi — caller sẽ handle
  }
}

export async function aiRecomposeExam(
  fileBuffer: Buffer,
  examInfo: ImportedExamDraft
): Promise<ExamImportPreview> {
  const startTime = Date.now();
  console.log("[aiRecompose] API Key (first 20 chars):", env.MINIMAX_API_KEY?.slice(0, 20));
console.log("[aiRecompose] API Key length:", env.MINIMAX_API_KEY?.length);
  if (!env.MINIMAX_API_KEY) {
    throw new Error(
      "MINIMAX_API_KEY chưa được cấu hình. Vui lòng set biến môi trường MINIMAX_API_KEY."
    );
  }

  // 1. Parse file docx → structured questions + raw text
  const [preview, textFromDocx] = await Promise.all([
    parseExamImportDocx(fileBuffer),
    extractTextFromDocx(fileBuffer),
  ]);

  console.log("[aiRecompose] File buffer size:", fileBuffer.length, "bytes");
  console.log(
    "[aiRecompose] Text extracted:",
    textFromDocx.length,
    "chars | questions parsed:",
    preview.questions.length
  );

  // 2. Build input payload cho AI
  const inputPayload = {
    exam: examInfo,
    questions: preview.questions,
    raw_docx_text: textFromDocx.slice(0, 5000), // context backup, không vượt token limit
    note: "Ưu tiên sửa dựa trên questions. Chỉ dùng raw_docx_text khi thiếu dữ liệu.",
  };
  const inputText = JSON.stringify(inputPayload, null, 2);

  console.log("[aiRecompose] Input payload length:", inputText.length, "chars");
  console.log("[aiRecompose] MiniMax model:", env.MINIMAX_MODEL);
  console.log("[aiRecompose] MiniMax URL:", env.MINIMAX_BASE_URL);

  // 3. Gọi MiniMax API
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  let response: Response;
  try {
    response = await fetch(`${env.MINIMAX_BASE_URL}/text/chatcompletion_v2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.MINIMAX_MODEL,
        messages: [
          { role: "system", content: AI_SYSTEM_PROMPT },
          { role: "user", content: `Sửa đề thi sau:\n${inputText}` },
        ],
        temperature: 0.3,
        max_tokens: 16000,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  console.log("[aiRecompose] MiniMax HTTP status:", response.status);

  // 4. HTTP-level error
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("[aiRecompose] HTTP error:", response.status, errorText);
    throw new Error(`MiniMax API HTTP error ${response.status}: ${errorText}`);
  }

  // 5. Parse response JSON
  const json = await response.json() as any;

  console.log(
    "[aiRecompose] Full response JSON (first 2000 chars):",
    JSON.stringify(json, null, 2).slice(0, 2000)
  );
  console.log("[aiRecompose] base_resp:", json.base_resp);
  console.log(
    "[aiRecompose] choices count:",
    Array.isArray(json.choices) ? json.choices.length : "N/A"
  );
  console.log("[aiRecompose] finish_reason:", json.choices?.[0]?.finish_reason);

  // 6. Application-level error từ MiniMax
  // status_code: 0=OK, 1000=auth, 1002=rate limit, 1013=content policy, 1039=quota
  if (json.base_resp && json.base_resp.status_code !== 0) {
    console.error(
      "[aiRecompose] MiniMax app-level error:",
      json.base_resp.status_code,
      json.base_resp.status_msg
    );
    throw new Error(
      `MiniMax error [${json.base_resp.status_code}]: ${json.base_resp.status_msg}`
    );
  }

  // 7. Extract content — handle cả string lẫn array (API v2 behavior)
  const rawContent = extractContentFromMessage(json.choices?.[0]?.message);

  console.log(
    "[aiRecompose] rawContent length:",
    rawContent.length,
    "| first 300 chars:",
    rawContent.slice(0, 300)
  );

  if (!rawContent) {
    console.error(
      "[aiRecompose] Empty content. Full JSON dump:",
      JSON.stringify(json)
    );
    throw new Error(
      "MiniMax trả về content rỗng. Kiểm tra model name, quota, và base_resp ở log trên."
    );
  }

  // 8. Parse JSON từ AI response
  let parsed: {
    questions: ImportedQuestionDraft[];
    summary: { total: number; fixed: number; needs_review: number };
  };

  try {
    parsed = parseAIJsonResponse(rawContent);
  } catch (parseErr) {
    console.error("[aiRecompose] JSON parse failed:", parseErr);
    console.error("[aiRecompose] Raw content (first 1000):", rawContent.slice(0, 1000));
    throw new Error(
      `AI trả về không đúng định dạng JSON. Parse error: ${String(parseErr)}. Content: ${rawContent.slice(0, 300)}`
    );
  }

  // 9. Validate parsed structure
  if (!Array.isArray(parsed.questions)) {
    throw new Error(
      `AI response thiếu field "questions" hoặc không phải array. Received: ${JSON.stringify(parsed).slice(0, 200)}`
    );
  }

  const summary = parsed.summary ?? {
    total: parsed.questions.length,
    fixed: 0,
    needs_review: parsed.questions.filter((q) => q.needs_review).length,
  };

  console.log(
    "[aiRecompose] Done. Questions:",
    parsed.questions.length,
    "| Fixed:",
    summary.fixed,
    "| Needs review:",
    summary.needs_review,
    "| Time:",
    Date.now() - startTime,
    "ms"
  );

  return {
    exam: examInfo,
    questions: parsed.questions,
    errors: [],
    warnings: [
      `AI đã xử lý ${summary.fixed} câu. ${summary.needs_review} câu cần xem lại.`,
    ],
    parse_summary: {
      total_parsed: summary.total,
      auto_ok: summary.total - summary.needs_review,
      needs_review: summary.needs_review,
      missing_media: parsed.questions.filter((q) => q.media?.status === "missing").length,
      parse_time_ms: Date.now() - startTime,
    },
  };
}