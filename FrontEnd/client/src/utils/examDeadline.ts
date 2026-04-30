import type { Exam, ExamSession } from '@/services/examApi';

/**
 * Sinh viên không được bắt đầu phiên mới sau `closes_at` (trừ khi đang có phiên active).
 */
export function isPastExamStartDeadline(
  exam: Pick<Exam, 'closes_at'>,
  latest: Pick<ExamSession, 'status'> | undefined,
  nowMs: number = Date.now()
): boolean {
  if (latest?.status === 'active') return false;
  if (!exam.closes_at) return false;
  const t = new Date(exam.closes_at).getTime();
  if (!Number.isFinite(t)) return false;
  return nowMs > t;
}
