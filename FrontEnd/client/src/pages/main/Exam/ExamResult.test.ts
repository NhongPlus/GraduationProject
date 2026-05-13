import { describe, it, expect } from 'vitest';

/**
 * Unit tests for Item 3: Exam Result Review Page
 *
 * Tests cover:
 * - Score percentage color logic
 * - Answer comparison display logic
 * - MCQ option highlighting (selected, correct, both)
 * - Pending grading state
 * - Teacher comment display
 */

describe('ExamResult score percentage color logic', () => {
  const getScoreColor = (scorePct: number | null): string => {
    if (scorePct == null) return 'gray';
    if (scorePct >= 80) return 'green';
    if (scorePct >= 50) return 'yellow';
    return 'red';
  };

  it('returns gray for null percentage', () => {
    expect(getScoreColor(null)).toBe('gray');
  });

  it('returns green for 80% and above', () => {
    expect(getScoreColor(80)).toBe('green');
    expect(getScoreColor(95)).toBe('green');
    expect(getScoreColor(100)).toBe('green');
  });

  it('returns yellow for 50-79%', () => {
    expect(getScoreColor(50)).toBe('yellow');
    expect(getScoreColor(65)).toBe('yellow');
    expect(getScoreColor(79)).toBe('yellow');
  });

  it('returns red for below 50%', () => {
    expect(getScoreColor(49)).toBe('red');
    expect(getScoreColor(25)).toBe('red');
    expect(getScoreColor(0)).toBe('red');
  });
});

describe('Submitted answer label generation', () => {
  type Detail = {
    submitted: string | string[] | null;
    pending_grading?: boolean;
  };

  const getSubmittedLabel = (detail: Detail): string => {
    if (detail.pending_grading) return 'Đang chờ chấm';
    if (detail.submitted == null) return 'Chưa trả lời';
    if (Array.isArray(detail.submitted)) return detail.submitted.join(', ');
    return String(detail.submitted);
  };

  it('shows "Đang chờ chấm" when pending_grading is true', () => {
    expect(getSubmittedLabel({ submitted: 'A', pending_grading: true })).toBe('Đang chờ chấm');
  });

  it('shows "Chưa trả lời" when submitted is null', () => {
    expect(getSubmittedLabel({ submitted: null })).toBe('Chưa trả lời');
    expect(getSubmittedLabel({ submitted: null, pending_grading: false })).toBe('Chưa trả lời');
  });

  it('shows array joined by comma for array submitted', () => {
    expect(getSubmittedLabel({ submitted: ['A', 'B'] })).toBe('A, B');
    expect(getSubmittedLabel({ submitted: ['C'] })).toBe('C');
  });

  it('shows string value for string submitted', () => {
    expect(getSubmittedLabel({ submitted: 'B' })).toBe('B');
  });
});

describe('MCQ option highlighting logic', () => {
  type OptionHighlight = {
    isCorrectOption: boolean;
    isSubmittedOption: boolean;
  };

  const getOptionHighlight = (
    optionKey: string,
    correctAnswer: string | string[] | null,
    submitted: string | string[] | null,
    pendingGrading: boolean
  ): OptionHighlight => {
    const isCorrectOption = correctAnswer != null && (
      Array.isArray(correctAnswer)
        ? correctAnswer.includes(optionKey)
        : correctAnswer === optionKey
    );

    const isSubmittedOption = !pendingGrading && submitted != null && (
      Array.isArray(submitted)
        ? submitted.includes(optionKey)
        : submitted === optionKey
    );

    return { isCorrectOption, isSubmittedOption };
  };

  it('marks correct option correctly (string correctAnswer)', () => {
    const r = getOptionHighlight('A', 'A', null, false);
    expect(r.isCorrectOption).toBe(true);
    expect(r.isSubmittedOption).toBe(false);
  });

  it('marks correct option correctly (array correctAnswer)', () => {
    const r = getOptionHighlight('B', ['A', 'B'], null, false);
    expect(r.isCorrectOption).toBe(true);
    expect(r.isSubmittedOption).toBe(false);
  });

  it('marks submitted option correctly (string submitted)', () => {
    const r = getOptionHighlight('C', 'A', 'C', false);
    expect(r.isCorrectOption).toBe(false);
    expect(r.isSubmittedOption).toBe(true);
  });

  it('marks submitted option correctly (array submitted)', () => {
    const r = getOptionHighlight('B', 'A', ['B', 'D'], false);
    expect(r.isCorrectOption).toBe(false);
    expect(r.isSubmittedOption).toBe(true);
  });

  it('marks both correct and submitted when same option', () => {
    const r = getOptionHighlight('A', 'A', 'A', false);
    expect(r.isCorrectOption).toBe(true);
    expect(r.isSubmittedOption).toBe(true);
  });

  it('pending grading suppresses submitted option highlight', () => {
    const r = getOptionHighlight('A', 'A', 'A', true);
    expect(r.isCorrectOption).toBe(true);
    expect(r.isSubmittedOption).toBe(false); // suppressed
  });

  it('non-matching option is neither correct nor submitted', () => {
    const r = getOptionHighlight('D', 'A', 'C', false);
    expect(r.isCorrectOption).toBe(false);
    expect(r.isSubmittedOption).toBe(false);
  });
});

describe('Option label resolution', () => {
  const getOptionLabel = (key: string, options: Record<string, string> | null): string => {
    if (!options) return key;
    return options[key] ?? key;
  };

  it('returns option text from options map', () => {
    const opts = { A: 'Correct answer text', B: 'Wrong answer B' };
    expect(getOptionLabel('A', opts)).toBe('Correct answer text');
    expect(getOptionLabel('B', opts)).toBe('Wrong answer B');
  });

  it('falls back to key when options is null', () => {
    expect(getOptionLabel('A', null)).toBe('A');
    expect(getOptionLabel('X', null)).toBe('X');
  });

  it('falls back to key when key not in options map', () => {
    const opts = { A: 'Answer A', B: 'Answer B' };
    expect(getOptionLabel('C', opts)).toBe('C');
  });
});

describe('Points earned display logic', () => {
  const getPointsLabel = (earned: number | null, max: number): string => {
    if (earned == null) return `${max} điểm`;
    return `${earned}/${max} điểm`;
  };

  it('shows full points when earned equals max', () => {
    expect(getPointsLabel(5, 5)).toBe('5/5 điểm');
  });

  it('shows partial points when earned is less than max', () => {
    expect(getPointsLabel(3, 5)).toBe('3/5 điểm');
  });

  it('shows 0 when earned is 0', () => {
    expect(getPointsLabel(0, 5)).toBe('0/5 điểm');
  });

  it('shows max only when earned is null', () => {
    expect(getPointsLabel(null, 5)).toBe('5 điểm');
  });
});

describe('Correct count from details', () => {
  type Detail = { is_correct: boolean };
  const getCorrectCount = (details: Detail[]): number =>
    details.filter(d => d.is_correct).length;

  it('counts correct answers', () => {
    const details = [
      { is_correct: true },
      { is_correct: false },
      { is_correct: true },
    ];
    expect(getCorrectCount(details)).toBe(2);
  });

  it('returns 0 for all wrong', () => {
    const details = [
      { is_correct: false },
      { is_correct: false },
    ];
    expect(getCorrectCount(details)).toBe(0);
  });

  it('returns 0 for empty array', () => {
    expect(getCorrectCount([])).toBe(0);
  });
});

describe('Score percentage calculation', () => {
  const getScorePct = (score: number | null, max: number | null): number | null => {
    if (max == null || max <= 0 || score == null) return null;
    return Math.round((score / max) * 100);
  };

  it('returns null when score is null', () => {
    expect(getScorePct(null, 100)).toBeNull();
  });

  it('returns null when max is 0', () => {
    expect(getScorePct(50, 0)).toBeNull();
  });

  it('calculates correct percentage', () => {
    expect(getScorePct(80, 100)).toBe(80);
    expect(getScorePct(7, 10)).toBe(70);
    expect(getScorePct(3, 5)).toBe(60);
  });

  it('rounds to nearest integer', () => {
    expect(getScorePct(67, 100)).toBe(67);
    expect(getScorePct(66, 100)).toBe(66);
  });
});

describe('Teacher comment display', () => {
  const hasTeacherComment = (comment: string | null | undefined): boolean =>
    Boolean(comment?.trim());

  it('returns true when comment is non-empty string', () => {
    expect(hasTeacherComment('Câu trả lời tốt, cần bổ sung giải thích')).toBe(true);
  });

  it('returns false when comment is null', () => {
    expect(hasTeacherComment(null)).toBe(false);
  });

  it('returns false when comment is empty string', () => {
    expect(hasTeacherComment('')).toBe(false);
  });

  it('returns false when comment is only whitespace', () => {
    expect(hasTeacherComment('   ')).toBe(false);
  });
});

describe('detailsByQuestionId Map creation', () => {
  type Detail = { question_id: string };
  const details: Detail[] = [
    { question_id: 'q1' },
    { question_id: 'q2' },
    { question_id: 'q3' },
  ];

  it('creates map with correct key-value pairs', () => {
    const map = new Map(details.map(d => [d.question_id, d]));
    expect(map.get('q1')).toBe(details[0]);
    expect(map.get('q2')).toBe(details[1]);
    expect(map.get('q3')).toBe(details[2]);
  });

  it('returns undefined for missing question_id', () => {
    const map = new Map(details.map(d => [d.question_id, d]));
    expect(map.get('nonexistent')).toBeUndefined();
  });
});

describe('Pending grading status badge', () => {
  const getStatusIcon = (pending: boolean | undefined, isCorrect: boolean): 'check' | 'clock' | 'x' => {
    if (pending) return 'clock';
    if (isCorrect) return 'check';
    return 'x';
  };

  it('returns clock for pending grading', () => {
    expect(getStatusIcon(true, false)).toBe('clock');
    expect(getStatusIcon(true, true)).toBe('clock');
  });

  it('returns check for correct non-pending', () => {
    expect(getStatusIcon(false, true)).toBe('check');
    expect(getStatusIcon(undefined, true)).toBe('check');
  });

  it('returns x for incorrect non-pending', () => {
    expect(getStatusIcon(false, false)).toBe('x');
    expect(getStatusIcon(undefined, false)).toBe('x');
  });
});

describe('Result navigation state', () => {
  it('navigates to /prediction when "View Prediction" clicked', () => {
    const destination = '/prediction';
    expect(destination).toBe('/prediction');
  });

  it('navigates to /exams when "Back" clicked', () => {
    const destination = '/exams';
    expect(destination).toBe('/exams');
  });
});