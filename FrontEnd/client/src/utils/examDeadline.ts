import type { Exam, ExamSession } from '@/services/examApi';

function toMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Giờ kết thúc / hạn nộp (ends_at ưu tiên, closes_at legacy). */
export function effectiveExamEndsAt(exam: Pick<Exam, 'ends_at' | 'closes_at'>): string | null {
  return exam.ends_at ?? exam.closes_at ?? null;
}

export function isBeforeExamOpens(
  exam: Pick<Exam, 'opens_at'>,
  nowMs: number = Date.now()
): boolean {
  const t = toMs(exam.opens_at);
  if (t === null) return false;
  return nowMs < t;
}

export function isPastExamEnd(
  exam: Pick<Exam, 'ends_at' | 'closes_at'>,
  latest: Pick<ExamSession, 'status'> | undefined,
  nowMs: number = Date.now()
): boolean {
  if (latest?.status === 'active') return false;
  const end = effectiveExamEndsAt(exam);
  const t = toMs(end);
  if (t === null) return false;
  return nowMs > t;
}

/** @deprecated use isPastExamEnd */
export function isPastExamStartDeadline(
  exam: Pick<Exam, 'closes_at' | 'ends_at'>,
  latest: Pick<ExamSession, 'status'> | undefined,
  nowMs: number = Date.now()
): boolean {
  return isPastExamEnd(exam, latest, nowMs);
}

export function formatExamScheduleRange(exam: Pick<Exam, 'opens_at' | 'ends_at' | 'closes_at'>): string {
  const open = exam.opens_at ? new Date(exam.opens_at).toLocaleString() : null;
  const end = effectiveExamEndsAt(exam);
  const endLabel = end ? new Date(end).toLocaleString() : null;
  if (open && endLabel) return `${open} → ${endLabel}`;
  if (open) return open;
  if (endLabel) return endLabel;
  return '—';
}
