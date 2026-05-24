import { describe, expect, it } from 'vitest';
import {
  effectiveExamEndsAt,
  formatExamScheduleRange,
  isBeforeExamOpens,
  isPastExamEnd,
  isPastExamStartDeadline,
  canStudentEnterExam,
  scheduleDurationMin,
  canTeacherManualOpenExam,
} from './examDeadline';

const t0 = new Date('2026-05-24T10:00:00.000Z').getTime();

describe('examDeadline schedule', () => {
  it('isBeforeExamOpens when now before opens_at', () => {
    expect(isBeforeExamOpens({ opens_at: '2026-05-24T12:00:00.000Z' }, t0)).toBe(true);
  });

  it('isPastExamEnd uses ends_at', () => {
    expect(isPastExamEnd({ ends_at: '2026-05-24T09:00:00.000Z', closes_at: null }, undefined, t0)).toBe(true);
  });

  it('active session bypasses past end', () => {
    expect(
      isPastExamEnd({ ends_at: '2026-05-24T09:00:00.000Z' }, { status: 'active' }, t0)
    ).toBe(false);
  });

  it('effectiveExamEndsAt prefers ends_at', () => {
    expect(effectiveExamEndsAt({ ends_at: 'a', closes_at: 'b' })).toBe('a');
    expect(effectiveExamEndsAt({ ends_at: null, closes_at: 'b' })).toBe('b');
  });

  it('formatExamScheduleRange', () => {
    const s = formatExamScheduleRange({
      opens_at: '2026-05-24T08:00:00.000Z',
      ends_at: '2026-05-24T10:00:00.000Z',
      closes_at: null,
    });
    expect(s).toContain('→');
  });

  it('scheduleDurationMin from start/end', () => {
    expect(
      scheduleDurationMin('2026-05-24T09:26:00.000Z', '2026-05-24T09:46:00.000Z')
    ).toBe(20);
  });

  it('canTeacherManualOpenExam only before opens_at', () => {
    const exam = {
      opens_at: '2026-05-24T12:00:00.000Z',
      ends_at: '2026-05-24T12:20:00.000Z',
      closes_at: null,
      runtime_is_active: false,
    };
    expect(canTeacherManualOpenExam(exam, t0)).toBe(true);
    expect(canTeacherManualOpenExam(exam, new Date('2026-05-24T12:00:01.000Z').getTime())).toBe(false);
  });

  it('canStudentEnterExam before opens when runtime active', () => {
    expect(
      canStudentEnterExam(
        { opens_at: '2026-05-24T12:00:00.000Z', ends_at: null, closes_at: null, runtime_is_active: true },
        undefined,
        t0
      )
    ).toBe(true);
    expect(
      canStudentEnterExam(
        { opens_at: '2026-05-24T12:00:00.000Z', ends_at: null, closes_at: null, runtime_is_active: false },
        undefined,
        t0
      )
    ).toBe(false);
  });
});
