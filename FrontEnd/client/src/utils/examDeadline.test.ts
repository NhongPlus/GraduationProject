import { describe, it, expect } from 'vitest';
import { isPastExamStartDeadline } from './examDeadline';

describe('isPastExamStartDeadline', () => {
  const t0 = Date.UTC(2026, 3, 18, 12, 0, 0);

  it('returns false when no closes_at', () => {
    expect(isPastExamStartDeadline({ closes_at: null }, undefined, t0)).toBe(false);
    expect(isPastExamStartDeadline({ closes_at: undefined }, undefined, t0)).toBe(false);
  });

  it('returns false when deadline is in the future', () => {
    const future = new Date(t0 + 60_000).toISOString();
    expect(isPastExamStartDeadline({ closes_at: future }, undefined, t0)).toBe(false);
  });

  it('returns true when deadline is in the past and no active session', () => {
    const past = new Date(t0 - 60_000).toISOString();
    expect(isPastExamStartDeadline({ closes_at: past }, undefined, t0)).toBe(true);
    expect(
      isPastExamStartDeadline({ closes_at: past }, { status: 'submitted' }, t0)
    ).toBe(true);
  });

  it('returns false when session is active even if closes_at passed', () => {
    const past = new Date(t0 - 60_000).toISOString();
    expect(isPastExamStartDeadline({ closes_at: past }, { status: 'active' }, t0)).toBe(false);
  });

  it('treats invalid closes_at as not past (no block)', () => {
    expect(isPastExamStartDeadline({ closes_at: 'not-a-date' }, undefined, t0)).toBe(false);
  });
});
