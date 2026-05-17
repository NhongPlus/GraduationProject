/** Chuẩn hóa đáp án TN về chữ cái A–D (hoặc khớp theo nội dung option). */
export function resolveMcqAnswerKey(
  answer: string | string[] | null | undefined,
  options: Record<string, string> | null | undefined
): string | null {
  if (answer == null) return null;
  const raw = Array.isArray(answer) ? answer[0] : answer;
  if (raw == null || String(raw).trim() === "") return null;
  const t = String(raw).trim();
  if (/^[A-Za-z]$/.test(t)) return t.toUpperCase();
  if (options && typeof options === "object") {
    const normalized = t.replace(/\s+/g, " ");
    for (const [key, label] of Object.entries(options)) {
      const labelNorm = label.trim().replace(/\s+/g, " ");
      if (label.trim() === t || labelNorm === normalized) {
        return key.toUpperCase();
      }
    }
  }
  return null;
}

export function mcqAnswersEqual(
  submitted: unknown,
  correct: string | string[] | null | undefined,
  options?: Record<string, string> | null
): boolean {
  const submittedRaw =
    submitted === null || submitted === undefined
      ? null
      : Array.isArray(submitted)
        ? submitted
        : String(submitted);
  const subKey = resolveMcqAnswerKey(submittedRaw, options ?? null);
  const corKey = resolveMcqAnswerKey(correct, options ?? null);
  if (subKey == null || corKey == null) return false;
  if (subKey === corKey) return true;
  if (options) {
    const a = options[subKey];
    const b = options[corKey];
    if (a && b && a.trim() === b.trim()) return true;
  }
  return false;
}
