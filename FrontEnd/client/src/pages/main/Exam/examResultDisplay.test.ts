import { describe, it, expect } from 'vitest';
import {
  countFullyCorrectQuestions,
  getEssayGradeState,
  getFullyCorrectPercent,
  getQuestionStatusIcon,
  getSummaryResultTone,
  hasPartialCreditEssay,
  isQuestionFullyCorrect,
  sumEssayScore,
} from './examResultDisplay';

describe('essay grade state', () => {
  it('pending when not graded', () => {
    expect(
      getEssayGradeState({
        question_type: 'essay',
        is_correct: false,
        points_earned: null,
        max_points: 2.5,
        pending_grading: true,
        submitted: 'answer',
      })
    ).toBe('pending');
  });

  it('partial when teacher awarded partial points', () => {
    expect(
      getEssayGradeState({
        question_type: 'essay',
        is_correct: false,
        points_earned: 1.4,
        max_points: 2.5,
        pending_grading: false,
        submitted: 'answer',
      })
    ).toBe('partial');
  });

  it('uses partial icon not x for partial essay', () => {
    const q = {
      question_type: 'essay' as const,
      is_correct: false,
      points_earned: 1.4,
      max_points: 2.5,
      pending_grading: false,
      submitted: 'answer',
    };
    expect(getQuestionStatusIcon(q)).toBe('partial');
  });
});

describe('fully correct count (all question types)', () => {
  const buildTenQuestions = () => {
    const mcq = Array.from({ length: 9 }, () => ({
      question_type: 'mcq' as const,
      is_correct: true,
      points_earned: 0.5,
      max_points: 0.5,
    }));
    const essay = {
      question_type: 'essay' as const,
      is_correct: false,
      points_earned: 1.4,
      max_points: 2.5,
      pending_grading: false,
      submitted: 'text',
    };
    return [...mcq, essay];
  };

  it('essay partial does not count as correct', () => {
    const questions = buildTenQuestions();
    expect(countFullyCorrectQuestions(questions)).toBe(9);
    expect(getFullyCorrectPercent(questions)).toBe(90);
    expect(isQuestionFullyCorrect(questions[9])).toBe(false);
  });

  it('essay counts only at max points', () => {
    const q = {
      question_type: 'essay' as const,
      is_correct: true,
      points_earned: 2.5,
      max_points: 2.5,
      pending_grading: false,
      submitted: 'text',
    };
    expect(isQuestionFullyCorrect(q)).toBe(true);
  });

  it('sums essay score when all graded', () => {
    const questions = buildTenQuestions();
    expect(sumEssayScore(questions)).toEqual({ earned: 1.4, max: 2.5, pendingCount: 0 });
  });

  it('summary tone is mixed when essay has partial credit', () => {
    const questions = buildTenQuestions();
    expect(hasPartialCreditEssay(questions)).toBe(true);
    expect(getSummaryResultTone(questions)).toBe('mixed');
  });
});
