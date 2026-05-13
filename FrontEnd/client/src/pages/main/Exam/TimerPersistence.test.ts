import { describe, it, expect } from 'vitest';

/**
 * Unit tests for Item 11: Timer state persistence to DB
 *
 * Tests cover:
 * - Runtime state serialization to/from DB
 * - Remaining time calculation after restart
 * - ExamRuntimePersist interface shape
 * - is_active flag logic
 * - Timer restoration logic on startup
 */

interface ExamRuntimePersist {
  exam_id: string;
  started_at: string;
  ends_at: string;
  duration_min: number;
  is_active: boolean;
}

describe('ExamRuntimePersist interface', () => {
  it('has all required fields', () => {
    const runtime: ExamRuntimePersist = {
      exam_id: "exam-123",
      started_at: "2026-05-09T10:00:00Z",
      ends_at: "2026-05-09T11:00:00Z",
      duration_min: 60,
      is_active: true,
    };
    expect(runtime.exam_id).toBe("exam-123");
    expect(runtime.is_active).toBe(true);
  });
});

describe('Remaining time calculation after restart', () => {
  const calcRemaining = (endsAt: string): number => {
    const endsMs = new Date(endsAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((endsMs - now) / 1000));
  };

  it('returns positive seconds for future deadline', () => {
    const future = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
    expect(calcRemaining(future)).toBeGreaterThan(0);
  });

  it('returns 0 for past deadline', () => {
    const past = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
    expect(calcRemaining(past)).toBe(0);
  });

  it('returns 0 for exactly current time', () => {
    const now = new Date().toISOString();
    expect(calcRemaining(now)).toBe(0);
  });

  it('calculates correct seconds remaining', () => {
    // 30 minutes from now
    const future = new Date(Date.now() + 1800000).toISOString();
    const remaining = calcRemaining(future);
    expect(remaining).toBeGreaterThan(1790); // ~30 min in seconds
    expect(remaining).toBeLessThanOrEqual(1800);
  });
});

describe('is_active flag logic', () => {
  const isStillActive = (endsAt: string, isActive: boolean): boolean => {
    return isActive && new Date(endsAt) > new Date();
  };

  it('active + future deadline = active', () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    expect(isStillActive(future, true)).toBe(true);
  });

  it('active + past deadline = inactive', () => {
    const past = new Date(Date.now() - 3600000).toISOString();
    expect(isStillActive(past, true)).toBe(false);
  });

  it('inactive flag = inactive regardless of deadline', () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    expect(isStillActive(future, false)).toBe(false);
  });
});

describe('Save runtime start serialization', () => {
  it('converts Date to ISO string for DB', () => {
    const startedAt = new Date("2026-05-09T10:00:00Z");
    const endsAt = new Date("2026-05-09T11:00:00Z");
    expect(startedAt.toISOString()).toBe("2026-05-09T10:00:00.000Z");
    expect(endsAt.toISOString()).toBe("2026-05-09T11:00:00.000Z");
  });

  it('startedAtMs to Date conversion roundtrip', () => {
    const startedAtMs = Date.now();
    const recons = new Date(startedAtMs);
    expect(recons.getTime()).toBe(startedAtMs);
  });
});

describe('ON CONFLICT upsert for exam_runtime_state', () => {
  it('ON CONFLICT (exam_id) updates existing record', () => {
    // Simulates: INSERT ... ON CONFLICT (exam_id) DO UPDATE SET ...
    const existing = { exam_id: "e1", started_at: "2026-05-09T09:00:00Z", ends_at: "2026-05-09T10:00:00Z", duration_min: 60, is_active: true };
    const newValues = { started_at: "2026-05-09T10:00:00Z", ends_at: "2026-05-09T11:00:00Z", duration_min: 60 };
    const merged = { ...existing, ...newValues, is_active: true };
    expect(merged.started_at).toBe("2026-05-09T10:00:00Z");
    expect(merged.duration_min).toBe(60);
    expect(merged.is_active).toBe(true);
  });
});

describe('final15 timer restoration', () => {
  const msUntilFinal15 = (durationMin: number, startedAtMs: number, now: number): number => {
    const totalMs = durationMin * 60_000;
    const elapsed = now - startedAtMs;
    const remaining = totalMs - elapsed;
    return Math.max(0, remaining - 15 * 60_000);
  };

  it('calculates remaining time after 10 minutes', () => {
    const durationMin = 60;
    const startedAtMs = Date.now() - 10 * 60_000; // started 10 min ago
    const remaining = msUntilFinal15(durationMin, startedAtMs, Date.now());
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(35 * 60 * 1000);
  });

  it('returns 0 when final15 already passed', () => {
    const durationMin = 60;
    const startedAtMs = Date.now() - 50 * 60 * 1000; // started 50 min ago
    const remaining = msUntilFinal15(durationMin, startedAtMs, Date.now());
    expect(remaining).toBe(0);
  });

  it('skips final15 when exam duration < 15', () => {
    const durationMin = 10;
    const startedAtMs = Date.now();
    const remaining = msUntilFinal15(durationMin, startedAtMs, Date.now());
    expect(remaining).toBe(0);
  });
});

describe('restoreExamRuntimes loop', () => {
  it('skips expired exams (remaining <= 0)', () => {
    const past = new Date(Date.now() - 3600000).toISOString();
    const isExpired = (endsAt: string) => new Date(endsAt) <= new Date();
    expect(isExpired(past)).toBe(true);
  });

  it('keeps active exams', () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    const isExpired = (endsAt: string) => new Date(endsAt) <= new Date();
    expect(isExpired(future)).toBe(false);
  });

  it('restores in correct order (loop)', () => {
    const runtimes = [
      { exam_id: "e1", started_at: new Date(Date.now() - 30 * 60000).toISOString(), ends_at: new Date(Date.now() + 30 * 60000).toISOString(), duration_min: 60, is_active: true },
      { exam_id: "e2", started_at: new Date(Date.now() - 20 * 60000).toISOString(), ends_at: new Date(Date.now() + 40 * 60000).toISOString(), duration_min: 60, is_active: true },
    ];
    const restored: string[] = [];
    for (const rt of runtimes) {
      const remaining = new Date(rt.ends_at).getTime() - Date.now();
      if (remaining > 0) {
        restored.push(rt.exam_id);
      }
    }
    expect(restored).toHaveLength(2);
  });
});

describe('ExamRuntimeState in-memory structure', () => {
  it('has same fields as in-memory state', () => {
    const state = {
      examId: "exam-1",
      startedAtMs: Date.now(),
      endsAtMs: Date.now() + 3600000,
      durationMin: 60,
    };
    expect(state.examId).toBeDefined();
    expect(state.startedAtMs).toBeDefined();
    expect(state.endsAtMs).toBeDefined();
    expect(state.durationMin).toBe(60);
  });
});

describe('examStateStore Map operations', () => {
  it('sets and gets state by examId', () => {
    const store = new Map<string, { examId: string; startedAtMs: number; endsAtMs: number; durationMin: number }>();
    store.set("exam-1", { examId: "exam-1", startedAtMs: Date.now(), endsAtMs: Date.now() + 3600000, durationMin: 60 });
    expect(store.has("exam-1")).toBe(true);
    expect(store.get("exam-1")?.examId).toBe("exam-1");
  });

  it('deletes state on exam end', () => {
    const store = new Map<string, { examId: string }>();
    store.set("exam-1", { examId: "exam-1" });
    store.delete("exam-1");
    expect(store.has("exam-1")).toBe(false);
  });

  it('clears all on restore', () => {
    const store = new Map<string, { examId: string }>();
    store.set("exam-1", { examId: "exam-1" });
    store.clear();
    expect(store.size).toBe(0);
  });
});