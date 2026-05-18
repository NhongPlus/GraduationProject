/** Quy đổi điểm thang 10 → thang 4 và điểm chữ (theo quy chế phổ biến VN). */

export function scoreToGrade10(score: number | null, maxPoints: number | null): number | null {
  if (score == null || maxPoints == null || maxPoints <= 0) return null;
  const g = (Number(score) / Number(maxPoints)) * 10;
  return Math.round(g * 10) / 10;
}

export function grade10ToGrade4(grade10: number): number {
  if (grade10 < 4) return 0;
  if (grade10 >= 9) return 4;
  if (grade10 >= 8.5) return 3.7;
  if (grade10 >= 8) return 3.4;
  if (grade10 >= 7) return 3;
  if (grade10 >= 6.5) return 2.7;
  if (grade10 >= 5.5) return 2.3;
  if (grade10 >= 5) return 2;
  if (grade10 >= 4) return 1.5;
  return 0;
}

export function grade10ToLetter(grade10: number): string {
  if (grade10 >= 9) return "A+";
  if (grade10 >= 8.5) return "A";
  if (grade10 >= 8) return "B+";
  if (grade10 >= 7) return "B";
  if (grade10 >= 6.5) return "C+";
  if (grade10 >= 5.5) return "C";
  if (grade10 >= 5) return "D+";
  if (grade10 >= 4) return "D";
  return "F";
}

export function classifyGpa4(gpa4: number): string {
  if (gpa4 >= 3.6) return "Xuất sắc";
  if (gpa4 >= 3.2) return "Giỏi";
  if (gpa4 >= 2.5) return "Khá";
  if (gpa4 >= 2.0) return "Trung bình";
  if (gpa4 >= 1.0) return "Yếu";
  return "Kém";
}

export interface TranscriptCourseRow {
  subject_name: string;
  subject_code: string | null;
  credits: number;
  grade10: number;
  grade4: number;
  letter: string;
  exam_title: string;
  submitted_at: string | null;
}

export function buildTranscriptCourses(
  rows: Array<{
    subject_name: string | null;
    subject_code: string | null;
    credits: number | null;
    exam_title: string;
    score: number | null;
    max_points: number | null;
    submitted_at: string | null;
  }>
): TranscriptCourseRow[] {
  const out: TranscriptCourseRow[] = [];
  for (const r of rows) {
    const g10 = scoreToGrade10(r.score, r.max_points);
    if (g10 == null) continue;
    const credits = Number(r.credits) > 0 ? Number(r.credits) : 3;
    out.push({
      subject_name: r.subject_name || r.exam_title,
      subject_code: r.subject_code,
      credits,
      grade10: g10,
      grade4: grade10ToGrade4(g10),
      letter: grade10ToLetter(g10),
      exam_title: r.exam_title,
      submitted_at: r.submitted_at,
    });
  }
  return out;
}

export function calcCumulativeGpa(courses: TranscriptCourseRow[]): {
  gpa10: number;
  gpa4: number;
  totalCredits: number;
  classification: string;
} {
  if (courses.length === 0) {
    return { gpa10: 0, gpa4: 0, totalCredits: 0, classification: "—" };
  }
  let sumCred = 0;
  let sum10 = 0;
  let sum4 = 0;
  for (const c of courses) {
    sumCred += c.credits;
    sum10 += c.grade10 * c.credits;
    sum4 += c.grade4 * c.credits;
  }
  const gpa10 = Math.round((sum10 / sumCred) * 100) / 100;
  const gpa4 = Math.round((sum4 / sumCred) * 100) / 100;
  return {
    gpa10,
    gpa4,
    totalCredits: sumCred,
    classification: classifyGpa4(gpa4),
  };
}
