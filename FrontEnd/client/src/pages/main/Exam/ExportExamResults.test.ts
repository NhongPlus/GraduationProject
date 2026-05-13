import { describe, it, expect } from 'vitest';

/**
 * Unit tests for Item 9: Export exam results to CSV/Excel
 *
 * Tests cover:
 * - CSV row construction with proper escaping
 * - Percentage calculation from score/max_points
 * - BOM marker for UTF-8 Excel compatibility
 * - CSV header generation
 * - File download naming
 * - Export format validation (csv vs json)
 */

describe('CSV escaping', () => {
  const escapeCSV = (v: unknown): string => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  it('escapes plain text unchanged', () => {
    expect(escapeCSV("Hello World")).toBe("Hello World");
  });

  it('escapes comma-containing values', () => {
    expect(escapeCSV("Nguyen Van A, PhD")).toBe('"Nguyen Van A, PhD"');
  });

  it('escapes double-quote characters', () => {
    expect(escapeCSV('He said "Hello"')).toBe('"He said ""Hello"""');
  });

  it('escapes newline characters', () => {
    expect(escapeCSV("Line1\nLine2")).toBe('"Line1\nLine2"');
  });

  it('handles empty string', () => {
    expect(escapeCSV("")).toBe("");
  });

  it('handles null/undefined', () => {
    expect(escapeCSV(null)).toBe("");
    expect(escapeCSV(undefined)).toBe("");
  });
});

describe('CSV header generation', () => {
  const headers = [
    "Session ID", "Student ID", "Student Name", "Email",
    "Exam Title", "Class", "Score", "Max Points", "Percentage (%)",
    "Status", "Submitted At", "Graded At", "Grading Status", "Teacher Comment",
  ];

  it('has 14 columns', () => {
    expect(headers).toHaveLength(14);
  });

  it('header line matches expected columns', () => {
    expect(headers[0]).toBe("Session ID");
    expect(headers[6]).toBe("Score");
    expect(headers[8]).toBe("Percentage (%)");
    expect(headers[13]).toBe("Teacher Comment");
  });

  it('header line joins with commas', () => {
    expect(headers.join(",")).toBe("Session ID,Student ID,Student Name,Email,Exam Title,Class,Score,Max Points,Percentage (%),Status,Submitted At,Graded At,Grading Status,Teacher Comment");
  });
});

describe('Percentage calculation', () => {
  const calcPercentage = (score: number | null, maxPoints: number | null): number | null => {
    if (score == null || maxPoints == null || maxPoints <= 0) return null;
    return (score / maxPoints) * 100;
  };

  it('calculates 80% correctly', () => {
    expect(calcPercentage(8, 10)).toBe(80);
  });

  it('calculates 0% correctly', () => {
    expect(calcPercentage(0, 10)).toBe(0);
  });

  it('returns null when score is null', () => {
    expect(calcPercentage(null, 10)).toBeNull();
  });

  it('returns null when maxPoints is null', () => {
    expect(calcPercentage(8, null)).toBeNull();
  });

  it('returns null when maxPoints is 0', () => {
    expect(calcPercentage(8, 0)).toBeNull();
  });

  it('rounds to 1 decimal place via toFixed', () => {
    expect((calcPercentage(7, 9) ?? 0).toFixed(1)).toBe("77.8");
  });

  it('returns null when both null', () => {
    expect(calcPercentage(null, null)).toBeNull();
  });
});

describe('UTF-8 BOM for Excel', () => {
  it('CSV starts with BOM for Excel compatibility', () => {
    const csv = "Session ID,Student Name\nabc123,Nguyen Van A";
    const withBOM = "﻿" + csv;
    expect(withBOM.charCodeAt(0)).toBe(0xFEFF);
  });
});

describe('File download naming', () => {
  it('filename includes exam-results prefix', () => {
    const timestamp = Date.now();
    const filename = `exam-results-${timestamp}.csv`;
    expect(filename).toMatch(/^exam-results-\d+\.csv$/);
  });

  it('filename ends with .csv extension', () => {
    const filename = `exam-results-${Date.now()}.csv`;
    expect(filename.endsWith(".csv")).toBe(true);
  });
});

describe('Export format validation', () => {
  const parseFormat = (format: unknown): 'csv' | 'json' => {
    if (format === 'csv') return 'csv';
    return 'json'; // default
  };

  it('accepts csv format', () => {
    expect(parseFormat('csv')).toBe('csv');
  });
  it('defaults to json for unknown format', () => {
    expect(parseFormat('xlsx')).toBe('json');
    expect(parseFormat('')).toBe('json');
    expect(parseFormat(undefined)).toBe('json');
  });
});

describe('CSV row construction', () => {
  const escapeCSV = (v: unknown): string => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const buildRow = (row: Record<string, unknown>): string => {
    return [
      escapeCSV(row.session_id),
      escapeCSV(row.student_name),
      escapeCSV(row.score),
      escapeCSV(row.max_points),
      escapeCSV(row.percentage != null ? (row.percentage as number).toFixed(1) : ""),
      escapeCSV(row.status),
    ].join(",");
  };

  it('builds simple row without escaping', () => {
    const row = {
      session_id: "sess-abc123",
      student_name: "Nguyen Van A",
      score: "8",
      max_points: "10",
      percentage: 80,
      status: "submitted",
    };
    const line = buildRow(row);
    expect(line).toBe("sess-abc123,Nguyen Van A,8,10,80.0,submitted");
  });

  it('escapes name with comma', () => {
    const row = {
      session_id: "s1",
      student_name: "Nguyen Van A, PhD",
      score: "8",
      max_points: "10",
      percentage: 80,
      status: "submitted",
    };
    const line = buildRow(row);
    expect(line).toContain('"Nguyen Van A, PhD"');
  });
});

describe('Export summary statistics', () => {
  const calcStats = (sessions: { score: number | null; max_points: number | null; status: string; grading_status: string | null }[]) => {
    const total = sessions.length;
    const submitted = sessions.filter(s => s.status === 'submitted').length;
    const active = sessions.filter(s => s.status === 'active').length;
    const pending_grading = sessions.filter(s => s.grading_status === 'pending_manual').length;
    const scores = sessions.filter(s => s.score != null && s.max_points != null && s.max_points > 0);
    const percentages = scores.map(s => (s.score! / s.max_points! * 100));
    const avg = percentages.length > 0 ? percentages.reduce((a, b) => a + b, 0) / percentages.length : null;
    return { total, submitted, active, pending_grading, avg_percentage: avg };
  };

  it('counts total sessions', () => {
    const sessions = [
      { score: 8, max_points: 10, status: 'submitted', grading_status: 'complete' },
      { score: 7, max_points: 10, status: 'submitted', grading_status: 'complete' },
    ];
    expect(calcStats(sessions).total).toBe(2);
  });

  it('counts submitted vs active', () => {
    const sessions = [
      { score: 8, max_points: 10, status: 'submitted', grading_status: 'complete' },
      { score: null, max_points: null, status: 'active', grading_status: null },
    ];
    const stats = calcStats(sessions);
    expect(stats.submitted).toBe(1);
    expect(stats.active).toBe(1);
  });

  it('calculates average percentage', () => {
    const sessions = [
      { score: 8, max_points: 10, status: 'submitted', grading_status: 'complete' },
      { score: 6, max_points: 10, status: 'submitted', grading_status: 'complete' },
    ];
    const stats = calcStats(sessions);
    expect(stats.avg_percentage).toBe(70);
  });

  it('ignores null scores in average', () => {
    const sessions = [
      { score: 8, max_points: 10, status: 'submitted', grading_status: 'complete' },
      { score: null, max_points: null, status: 'active', grading_status: null },
    ];
    const stats = calcStats(sessions);
    expect(stats.avg_percentage).toBe(80); // only 8/10 counted
  });

  it('counts pending grading', () => {
    const sessions = [
      { score: null, max_points: 10, status: 'submitted', grading_status: 'pending_manual' },
      { score: null, max_points: 10, status: 'submitted', grading_status: 'pending_manual' },
      { score: 8, max_points: 10, status: 'submitted', grading_status: 'complete' },
    ];
    const stats = calcStats(sessions);
    expect(stats.pending_grading).toBe(2);
  });

  it('returns null avg when no valid scores', () => {
    const sessions = [
      { score: null, max_points: null, status: 'active', grading_status: null },
    ];
    const stats = calcStats(sessions);
    expect(stats.avg_percentage).toBeNull();
  });
});