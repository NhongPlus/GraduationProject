import { reverseAnswer } from "~/models/examVersion.model";

/** Chữ cái A–D (happy path: chỉ dùng key, không so text option). */
export function normalizeLetterKey(val: unknown): string | null {
  if (val == null) return null;
  const raw = Array.isArray(val) ? val[0] : val;
  const t = String(raw).trim().toUpperCase();
  if (/^[A-D]$/.test(t)) return t;
  return null;
}

/** Đáp án đúng trong question bank — luôn là chữ cái gốc. */
export function resolveCorrectAnswerKey(
  correct: string | string[] | null | undefined
): string | null {
  return normalizeLetterKey(correct);
}

/** display_key (ô SV bấm) → original_key qua option_map. */
export function resolveOriginalKeyFromDisplay(
  displayKey: string,
  optionMap: Record<string, string>,
  originalOptions?: Record<string, string> | null
): string | null {
  const pick = normalizeLetterKey(displayKey);
  if (!pick) return null;
  const resolved = reverseAnswer(pick, optionMap, originalOptions);
  return normalizeLetterKey(resolved);
}

export interface McqGradeResult {
  isCorrect: boolean;
  originalKey: string | null;
  correctKey: string | null;
  displayKey: string | null;
}

/**
 * Chấm TN: selected display key → option_map → original_key === correct_answer.
 * Không so sánh nội dung text của đáp án.
 */
export function gradeMcq(
  displayOrOriginalKey: unknown,
  correctAnswer: string | string[] | null | undefined,
  optionMap?: Record<string, string> | null,
  originalOptions?: Record<string, string> | null
): McqGradeResult {
  const correctKey = resolveCorrectAnswerKey(correctAnswer);
  const displayKey = normalizeLetterKey(displayOrOriginalKey);

  if (!correctKey || !displayKey) {
    return { isCorrect: false, originalKey: displayKey, correctKey, displayKey };
  }

  let originalKey = displayKey;
  if (optionMap && Object.keys(optionMap).length > 0) {
    const mapped = resolveOriginalKeyFromDisplay(displayKey, optionMap, originalOptions);
    if (mapped) originalKey = mapped;
  }

  return {
    isCorrect: originalKey === correctKey,
    originalKey,
    correctKey,
    displayKey,
  };
}

/** Nguồn đáp án khi recompute — tránh map option_map hai lần. */
export type RecomputeMcqInput =
  | { kind: "display"; key: string }
  | { kind: "original"; key: string };

export type PickRecomputeMcqOptions = {
  /**
   * true = phiên đã nộp: ưu tiên student_answers / graded_details (original, khớp submit).
   * false = chỉ có autosave (force-submit, sửa option_maps cũ): ưu tiên display từ autosave.
   */
  preferSubmittedSource?: boolean;
};

function pickDisplayByIndex(
  displayIdx: number,
  displayByIndex: Record<string, string>
): RecomputeMcqInput | null {
  const fromAutosave = displayByIndex[String(displayIdx)]?.trim();
  if (fromAutosave && /^[A-D]$/i.test(fromAutosave)) {
    return { kind: "display", key: fromAutosave.toUpperCase() };
  }
  return null;
}

function pickOriginalByQuestion(
  questionId: string,
  originalByQuestionId: Record<string, string>,
  gradedDetailSubmitted?: unknown
): RecomputeMcqInput | null {
  const fromStudent = originalByQuestionId[questionId]?.trim();
  if (fromStudent && /^[A-D]$/i.test(fromStudent)) {
    return { kind: "original", key: fromStudent.toUpperCase() };
  }
  const fromGraded = normalizeLetterKey(gradedDetailSubmitted);
  if (fromGraded) return { kind: "original", key: fromGraded };
  return null;
}

/**
 * Chọn nguồn recompute theo ngữ cảnh — tránh autosave stale ghi đè kết quả submit.
 */
export function pickRecomputeMcqInput(
  displayIdx: number,
  questionId: string,
  displayByIndex: Record<string, string>,
  originalByQuestionId: Record<string, string>,
  gradedDetailSubmitted?: unknown,
  options?: PickRecomputeMcqOptions
): RecomputeMcqInput | null {
  const preferSubmitted = options?.preferSubmittedSource === true;
  const fromOriginal = pickOriginalByQuestion(
    questionId,
    originalByQuestionId,
    gradedDetailSubmitted
  );
  const fromDisplay = pickDisplayByIndex(displayIdx, displayByIndex);

  if (preferSubmitted) {
    return fromOriginal ?? fromDisplay;
  }
  return fromDisplay ?? fromOriginal;
}

/** Chấm TN khi recompute: display → gradeMcq; original → chỉ so chữ (không option_map). */
export function gradeMcqRecompute(
  input: RecomputeMcqInput | null,
  correctAnswer: string | string[] | null | undefined,
  optionMap?: Record<string, string> | null,
  originalOptions?: Record<string, string> | null
): McqGradeResult {
  if (!input) {
    return gradeMcq(null, correctAnswer, optionMap, originalOptions);
  }
  if (input.kind === "display") {
    return gradeMcq(input.key, correctAnswer, optionMap, originalOptions);
  }
  const correctKey = resolveCorrectAnswerKey(correctAnswer);
  const originalKey = normalizeLetterKey(input.key);
  return {
    isCorrect: Boolean(originalKey && correctKey && originalKey === correctKey),
    originalKey,
    correctKey,
    displayKey: null,
  };
}

/** Sau unshuffle: submitted đã là original_key — chỉ so chữ cái. */
export function mcqAnswersEqual(
  submittedOriginalKey: unknown,
  correctAnswer: string | string[] | null | undefined
): boolean {
  const sub = normalizeLetterKey(submittedOriginalKey);
  const cor = resolveCorrectAnswerKey(correctAnswer);
  if (!sub || !cor) return false;
  return sub === cor;
}

/** @deprecated Chỉ dùng để hiển thị UI — không dùng khi chấm điểm. */
export function resolveMcqAnswerKey(
  answer: string | string[] | null | undefined,
  _options?: Record<string, string> | null
): string | null {
  return normalizeLetterKey(answer) ?? resolveCorrectAnswerKey(answer);
}
