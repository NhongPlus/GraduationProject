import { describe, expect, it } from 'vitest';
import {
  effectiveExamEndsAt,
  formatExamScheduleRange,
  isBeforeExamOpens,
  isPastExamEnd,
  isPastExamStartDeadline,
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

  it('legacy isPastExamStartDeadline alias', () => {
    expect(isPastExamStartDeadline({ closes_at: '2026-05-24T09:00:00.000Z' }, undefined, t0)).toBe(true);
  });
});
