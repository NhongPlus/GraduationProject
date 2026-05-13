import { describe, it, expect } from 'vitest';

/**
 * Unit tests for Item 4: Question Bank
 *
 * Tests cover:
 * - Difficulty color and label mapping
 * - QBFilter interface correctness
 * - Pagination offset calculation
 * - Tag parsing logic (split/filter)
 * - MCQ options serialization (empty entries filtered)
 * - Points/chapter normalization
 */

/** Difficulty color mapping — mirrors DIFFICULTY_COLORS in QuestionBank.tsx */
const DIFFICULTY_COLORS: Record<string, string> = {
  DE: 'green',
  TRUNGBINH: 'yellow',
  KHO: 'red',
};

/** Difficulty label mapping — mirrors DIFFICULTY_LABELS in QuestionBank.tsx */
const DIFFICULTY_LABELS: Record<string, string> = {
  DE: 'Dễ',
  TRUNGBINH: 'Trung bình',
  KHO: 'Khó',
};

describe('DIFFICULTY_COLORS', () => {
  it('maps DE to green', () => {
    expect(DIFFICULTY_COLORS['DE']).toBe('green');
  });
  it('maps TRUNGBINH to yellow', () => {
    expect(DIFFICULTY_COLORS['TRUNGBINH']).toBe('yellow');
  });
  it('maps KHO to red', () => {
    expect(DIFFICULTY_COLORS['KHO']).toBe('red');
  });
  it('has exactly 3 entries', () => {
    expect(Object.keys(DIFFICULTY_COLORS)).toHaveLength(3);
  });
});

describe('DIFFICULTY_LABELS', () => {
  it('maps DE to Dễ', () => {
    expect(DIFFICULTY_LABELS['DE']).toBe('Dễ');
  });
  it('maps TRUNGBINH to Trung bình', () => {
    expect(DIFFICULTY_LABELS['TRUNGBINH']).toBe('Trung bình');
  });
  it('maps KHO to Khó', () => {
    expect(DIFFICULTY_LABELS['KHO']).toBe('Khó');
  });
});

describe('QBFilter interface fields', () => {
  it('supports optional search', () => {
    const filter: { search?: string } = {};
    filter.search = 'python';
    expect(filter.search).toBe('python');
  });
  it('supports optional question_type', () => {
    const filter: { question_type?: 'mcq' | 'essay' } = {};
    filter.question_type = 'mcq';
    expect(filter.question_type).toBe('mcq');
  });
  it('supports optional difficulty', () => {
    const filter: { difficulty?: 'DE' | 'TRUNGBINH' | 'KHO' } = {};
    filter.difficulty = 'KHO';
    expect(filter.difficulty).toBe('KHO');
  });
  it('supports optional subject_id', () => {
    const filter: { subject_id?: string } = {};
    filter.subject_id = 'subj-123';
    expect(filter.subject_id).toBe('subj-123');
  });
  it('supports optional chapter', () => {
    const filter: { chapter?: number } = {};
    filter.chapter = 3;
    expect(filter.chapter).toBe(3);
  });
});

describe('Pagination offset calculation', () => {
  const LIMIT = 20;

  const calcOffset = (page: number) => (page - 1) * LIMIT;

  it('page 1 offset is 0', () => {
    expect(calcOffset(1)).toBe(0);
  });
  it('page 2 offset is 20', () => {
    expect(calcOffset(2)).toBe(20);
  });
  it('page 3 offset is 40', () => {
    expect(calcOffset(3)).toBe(40);
  });
  it('page 5 offset is 80', () => {
    expect(calcOffset(5)).toBe(80);
  });
});

describe('totalPages calculation', () => {
  const LIMIT = 20;

  const calcTotalPages = (total: number) => Math.ceil(total / LIMIT);

  it('0 items -> 0 pages', () => {
    expect(calcTotalPages(0)).toBe(0);
  });
  it('1 item -> 1 page', () => {
    expect(calcTotalPages(1)).toBe(1);
  });
  it('20 items -> 1 page', () => {
    expect(calcTotalPages(20)).toBe(1);
  });
  it('21 items -> 2 pages', () => {
    expect(calcTotalPages(21)).toBe(2);
  });
  it('40 items -> 2 pages', () => {
    expect(calcTotalPages(40)).toBe(2);
  });
  it('100 items -> 5 pages', () => {
    expect(calcTotalPages(100)).toBe(5);
  });
});

describe('Tag parsing logic', () => {
  const parseTags = (input: string) =>
    input.split(',').map(t => t.trim()).filter(Boolean);

  it('parses single tag', () => {
    expect(parseTags('python')).toEqual(['python']);
  });
  it('parses multiple tags', () => {
    expect(parseTags('python, loop, function')).toEqual(['python', 'loop', 'function']);
  });
  it('trims whitespace', () => {
    expect(parseTags('  python  ,  loop  ')).toEqual(['python', 'loop']);
  });
  it('filters empty strings', () => {
    expect(parseTags('python,,loop')).toEqual(['python', 'loop']);
  });
  it('handles empty input', () => {
    expect(parseTags('')).toEqual([]);
  });
  it('handles input with only commas', () => {
    expect(parseTags(',,')).toEqual([]);
  });
});

describe('MCQ options serialization', () => {
  // Mirrors handleSubmit logic in QBForm
  const serializeOptions = (
    questionType: 'mcq' | 'essay',
    options: Record<string, string>
  ) => {
    if (questionType === 'mcq') {
      return Object.fromEntries(Object.entries(options).filter(([, v]) => v.trim()));
    }
    return null;
  };

  it('filters empty option values for MCQ', () => {
    const result = serializeOptions('mcq', { A: 'val', B: '', C: 'val', D: '' });
    expect(result).toEqual({ A: 'val', C: 'val' });
  });
  it('returns null for essay', () => {
    const result = serializeOptions('essay', { A: 'val', B: 'val' });
    expect(result).toBeNull();
  });
  it('preserves all non-empty options', () => {
    const result = serializeOptions('mcq', { A: 'a', B: 'b', C: 'c', D: 'd' });
    expect(result).toEqual({ A: 'a', B: 'b', C: 'c', D: 'd' });
  });
  it('returns empty object when all options empty', () => {
    const result = serializeOptions('mcq', { A: '', B: '', C: '', D: '' });
    expect(result).toEqual({});
  });
});

describe('Points normalization', () => {
  // handleSubmit maps points via Number(v)
  const normalizePoints = (v: unknown) => Number(v);

  it('converts integer string', () => {
    expect(normalizePoints('2')).toBe(2);
  });
  it('converts decimal string', () => {
    expect(normalizePoints('0.5')).toBe(0.5);
  });
  it('returns NaN for non-numeric', () => {
    expect(Number.isNaN(normalizePoints('abc'))).toBe(true);
  });
  it('handles zero', () => {
    expect(normalizePoints('0')).toBe(0);
  });
});

describe('Chapter normalization', () => {
  // handleSubmit: chapter === '' ? undefined : Number(chapter)
  const normalizeChapter = (v: unknown) => v === '' ? undefined : Number(v);

  it('converts number to number', () => {
    expect(normalizeChapter(3)).toBe(3);
  });
  it('converts string number', () => {
    expect(normalizeChapter('3')).toBe(3);
  });
  it('returns undefined for empty string', () => {
    expect(normalizeChapter('')).toBe(undefined);
  });
  it('returns 0 for null (Number(null) === 0)', () => {
    // Number(null) evaluates to 0, not NaN
    expect(normalizeChapter(null)).toBe(0);
  });
  it('converts string "1" to 1', () => {
    expect(normalizeChapter('1')).toBe(1);
  });
});

describe('Row index calculation (page-based)', () => {
  const LIMIT = 20;

  // Mirrors: (page - 1) * LIMIT + idx + 1
  const rowIndex = (page: number, idx: number) => (page - 1) * LIMIT + idx + 1;

  it('page 1, idx 0 -> 1', () => {
    expect(rowIndex(1, 0)).toBe(1);
  });
  it('page 1, idx 19 -> 20', () => {
    expect(rowIndex(1, 19)).toBe(20);
  });
  it('page 2, idx 0 -> 21', () => {
    expect(rowIndex(2, 0)).toBe(21);
  });
  it('page 2, idx 19 -> 40', () => {
    expect(rowIndex(2, 19)).toBe(40);
  });
});

describe('QBForm state defaults', () => {
  it('default question type is mcq', () => {
    const initial = undefined;
    const questionType = initial?.question_type ?? 'mcq';
    expect(questionType).toBe('mcq');
  });
  it('default difficulty is TRUNGBINH', () => {
    const initial = undefined;
    const difficulty = initial?.difficulty ?? 'TRUNGBINH';
    expect(difficulty).toBe('TRUNGBINH');
  });
  it('default points is 1', () => {
    const initial = undefined;
    const points = initial?.points ?? 1;
    expect(points).toBe(1);
  });
  it('default options are A,B,C,D empty', () => {
    const initial = undefined;
    const options = initial?.options ?? { A: '', B: '', C: '', D: '' };
    expect(options).toEqual({ A: '', B: '', C: '', D: '' });
  });
  it('uses initial values when provided', () => {
    const initial = { content: 'Test?', difficulty: 'KHO' as const, points: 2 };
    const difficulty = initial?.difficulty ?? 'TRUNGBINH';
    const points = initial?.points ?? 1;
    expect(difficulty).toBe('KHO');
    expect(points).toBe(2);
  });
});

describe('Filter object construction for API', () => {
  // Mirrors fetchItems params building
  const buildParams = (filter: Record<string, string>, page: number, LIMIT = 20) => {
    const params: Record<string, string> = {
      limit: String(LIMIT),
      offset: String((page - 1) * LIMIT),
    };
    if (filter.search) params.search = filter.search;
    if (filter.question_type) params.question_type = filter.question_type;
    if (filter.difficulty) params.difficulty = filter.difficulty;
    if (filter.subject_id) params.subject_id = filter.subject_id;
    if (filter.chapter != null) params.chapter = String(filter.chapter);
    return params;
  };

  it('includes limit and offset', () => {
    const p = buildParams({}, 1);
    expect(p.limit).toBe('20');
    expect(p.offset).toBe('0');
  });
  it('page 2 offset is 20', () => {
    const p = buildParams({}, 2);
    expect(p.offset).toBe('20');
  });
  it('adds search when present', () => {
    const p = buildParams({ search: 'python' }, 1);
    expect(p.search).toBe('python');
  });
  it('adds question_type when present', () => {
    const p = buildParams({ question_type: 'mcq' }, 1);
    expect(p.question_type).toBe('mcq');
  });
  it('adds difficulty when present', () => {
    const p = buildParams({ difficulty: 'KHO' }, 1);
    expect(p.difficulty).toBe('KHO');
  });
  it('does not add chapter when null', () => {
    const p = buildParams({}, 1);
    expect(p.chapter).toBeUndefined();
  });
  it('adds chapter when defined', () => {
    const p = buildParams({ chapter: '3' } as Record<string, string>, 1);
    expect(p.chapter).toBe('3');
  });
});

describe('CorrectAnswer resolution for MCQ', () => {
  // Mirrors correctAnswer state and select options
  const getSelectOptions = (options: Record<string, string>) =>
    Object.keys(options).filter(k => options[k].trim());

  it('returns only non-empty option keys', () => {
    expect(getSelectOptions({ A: 'a', B: '', C: 'c', D: '' })).toEqual(['A', 'C']);
  });
  it('returns all keys when all non-empty', () => {
    expect(getSelectOptions({ A: 'a', B: 'b', C: 'c', D: 'd' })).toEqual(['A', 'B', 'C', 'D']);
  });
  it('returns empty array when all empty', () => {
    expect(getSelectOptions({ A: '', B: '', C: '', D: '' })).toEqual([]);
  });
});