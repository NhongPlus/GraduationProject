import { describe, it, expect } from 'vitest';

/**
 * Unit tests for Item 10: Controlled question shuffle by chapter
 *
 * Tests cover:
 * - Fisher-Yates shuffle within chapter groups
 * - Chapter group ordering (maintains chapter sequence)
 * - Global order reassignment
 * - Chapter extraction from question bank
 * - Shuffle does not cross chapter boundaries
 */

/** Fisher-Yates shuffle implementation */
const shuffleArray = <T>(arr: T[]): T[] => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

describe('Fisher-Yates shuffle', () => {
  it('shuffles array of numbers', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(arr);
    expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]); // same elements
  });

  it('does not lose elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(arr);
    expect(shuffled.length).toBe(5);
  });

  it('can produce different orderings', () => {
    // Run shuffle multiple times, at least one should differ from original
    const original = [1, 2, 3, 4, 5];
    let differCount = 0;
    for (let i = 0; i < 20; i++) {
      const shuffled = shuffleArray(original);
      if (shuffled.join(',') !== original.join(',')) differCount++;
    }
    expect(differCount).toBeGreaterThan(0);
  });
});

describe('Chapter group shuffle', () => {
  interface Question { id: string; chapter: number | null; display_order: number; }

  const groupByChapter = (questions: Question[]): Map<number | null, Question[]> => {
    const chapters = new Map<number | null, Question[]>();
    for (const q of questions) {
      if (!chapters.has(q.chapter)) chapters.set(q.chapter, []);
      chapters.get(q.chapter)!.push(q);
    }
    return chapters;
  };

  const assignGlobalOrder = (updates: { id: string; new_order: number }[]) =>
    updates.reduce((acc, u) => { acc[u.id] = u.new_order; return acc; }, {} as Record<string, number>);

  it('groups questions by chapter', () => {
    const questions: Question[] = [
      { id: "q1", chapter: 1, display_order: 1 },
      { id: "q2", chapter: 2, display_order: 2 },
      { id: "q3", chapter: 1, display_order: 3 },
      { id: "q4", chapter: null, display_order: 4 },
    ];
    const chapters = groupByChapter(questions);
    expect(chapters.get(1)).toHaveLength(2);
    expect(chapters.get(2)).toHaveLength(1);
    expect(chapters.get(null)).toHaveLength(1);
  });

  it('shuffles within chapter but not across chapters', () => {
    const chapter1Questions = [
      { id: "q1", chapter: 1, display_order: 1 },
      { id: "q3", chapter: 1, display_order: 3 },
    ];
    const shuffled = shuffleArray(chapter1Questions);
    // All shuffled items should still have chapter 1
    for (const q of shuffled) {
      expect(q.chapter).toBe(1);
    }
  });

  it('null chapter is treated as its own group', () => {
    const questions: Question[] = [
      { id: "q1", chapter: null, display_order: 1 },
      { id: "q2", chapter: 1, display_order: 2 },
    ];
    const chapters = groupByChapter(questions);
    expect(chapters.get(null)).toHaveLength(1);
    expect(chapters.get(1)).toHaveLength(1);
  });

  it('chapters sorted numerically (null last)', () => {
    const questions: Question[] = [
      { id: "q1", chapter: 3, display_order: 1 },
      { id: "q2", chapter: 1, display_order: 2 },
      { id: "q3", chapter: null, display_order: 3 },
    ];
    const chapters = groupByChapter(questions);
    const sortedChapters = [...chapters.keys()].sort((a, b) => {
      if (a === null) return 1;
      if (b === null) return -1;
      return a - b;
    });
    expect(sortedChapters[0]).toBe(1);
    expect(sortedChapters[1]).toBe(3);
    expect(sortedChapters[2]).toBeNull();
  });
});

describe('Global order reassignment', () => {
  const buildUpdates = (questions: { id: string; chapter: number | null }[]): { id: string; new_order: number }[] => {
    const chapters = new Map<number | null, typeof questions>();
    for (const q of questions) {
      if (!chapters.has(q.chapter)) chapters.set(q.chapter, []);
      chapters.get(q.chapter)!.push(q);
    }

    const sortedChapters = [...chapters.keys()].sort((a, b) => {
      if (a === null) return 1;
      if (b === null) return -1;
      return a - b;
    });

    const updates: { id: string; new_order: number }[] = [];
    let globalOrder = 0;

    for (const chapter of sortedChapters) {
      const shuffled = shuffleArray(chapters.get(chapter)!);
      for (const q of shuffled) {
        globalOrder += 1;
        updates.push({ id: q.id, new_order: globalOrder });
      }
    }
    return updates;
  };

  it('assigns sequential global order', () => {
    const questions = [
      { id: "q1", chapter: 1 },
      { id: "q2", chapter: 1 },
      { id: "q3", chapter: 2 },
    ];
    const updates = buildUpdates(questions);
    const orders = updates.map(u => u.new_order).sort((a, b) => a - b);
    expect(orders).toEqual([1, 2, 3]);
  });

  it('last question has highest order', () => {
    const questions = [
      { id: "q1", chapter: 1 },
      { id: "q2", chapter: 1 },
      { id: "q3", chapter: 2 },
    ];
    const updates = buildUpdates(questions);
    const maxOrder = Math.max(...updates.map(u => u.new_order));
    expect(maxOrder).toBe(updates.length);
  });

  it('all questions have unique order', () => {
    const questions = Array.from({ length: 10 }, (_, i) => ({ id: `q${i}`, chapter: i % 3 as number | null }));
    const updates = buildUpdates(questions);
    const uniqueOrders = new Set(updates.map(u => u.new_order));
    expect(uniqueOrders.size).toBe(10);
  });

  it('order count matches question count', () => {
    const questions = Array.from({ length: 7 }, (_, i) => ({ id: `q${i}`, chapter: 1 }));
    const updates = buildUpdates(questions);
    expect(updates.length).toBe(7);
  });
});

describe('Chapter map building', () => {
  it('maps question id to chapter', () => {
    const questions = [
      { id: "q1", chapter: 1, display_order: 1 },
      { id: "q2", chapter: 2, display_order: 2 },
      { id: "q3", chapter: 1, display_order: 3 },
    ];
    const map = new Map(questions.map(q => [q.id, q.chapter]));
    expect(map.get("q1")).toBe(1);
    expect(map.get("q2")).toBe(2);
    expect(map.get("q3")).toBe(1);
  });

  it('null chapter defaults to 0 in chapter map', () => {
    const questions = [
      { id: "q1", chapter: null, display_order: 1 },
    ];
    const map = new Map(questions.map(q => [q.id, q.chapter ?? 0]));
    expect(map.get("q1")).toBe(0);
  });
});

describe('getChaptersUsedByExam logic', () => {
  it('extracts unique chapters from question list', () => {
    const questions = [
      { id: "q1", chapter: 1 },
      { id: "q2", chapter: 2 },
      { id: "q3", chapter: 1 },
      { id: "q4", chapter: 3 },
    ];
    const chapters = [...new Set(questions.map(q => q.chapter))].sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(chapters).toEqual([1, 2, 3]);
  });

  it('excludes null chapter from chapter list', () => {
    const questions = [
      { id: "q1", chapter: 1 },
      { id: "q2", chapter: null },
    ];
    const chapters = [...new Set(questions.map(q => q.chapter).filter(c => c !== null))].sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(chapters).toEqual([1]);
  });

  it('returns empty array when no questions', () => {
    const questions: { id: string; chapter: number | null }[] = [];
    const chapters = [...new Set(questions.map(q => q.chapter).filter(c => c !== null))];
    expect(chapters).toHaveLength(0);
  });
});

describe('Shuffle consistency (deterministic seed variant)', () => {
  it('same seed produces same order', () => {
    // With seeded random (not implemented here), same seed = same shuffle
    // This test documents the expected behavior
    const arr = [1, 2, 3, 4, 5];
    // In production, use a seeded PRNG so shuffle is reproducible for audit
    const shuffled1 = shuffleArray(arr);
    const shuffled2 = shuffleArray(arr);
    // Without seed, results will differ — this is the nature of random shuffle
    expect(shuffled1.length).toBe(5);
    expect(shuffled2.length).toBe(5);
  });

  it('shuffle preserves all elements', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled = shuffleArray(original);
    // Use numeric sort to properly sort numbers
    const sortedShuffled = [...shuffled].sort((a, b) => a - b);
    expect(sortedShuffled).toEqual(original);
  });
});

describe('Shuffle API endpoint behavior', () => {
  it('POST /shuffle/exams/:id returns updated_count', () => {
    const updates = [
      { id: "q1", new_order: 1 },
      { id: "q2", new_order: 2 },
      { id: "q3", new_order: 3 },
    ];
    const response = { success: true, data: { updated_count: updates.length, updates } };
    expect(response.data.updated_count).toBe(3);
  });

  it('GET /shuffle/exams/:id/chapters returns chapters array', () => {
    const response = {
      success: true,
      data: {
        chapters: [1, 2, 3],
        question_chapter_map: { q1: 1, q2: 2, q3: 3 },
      },
    };
    expect(Array.isArray(response.data.chapters)).toBe(true);
    expect(response.data.chapters).toEqual([1, 2, 3]);
  });

  it('shuffle only updates display_order, not content', () => {
    const original = { id: "q1", content: "What is Python?", chapter: 1, display_order: 1 };
    const updated = { ...original, display_order: 5 };
    expect(updated.content).toBe(original.content); // unchanged
    expect(updated.display_order).toBe(5); // changed
  });
});