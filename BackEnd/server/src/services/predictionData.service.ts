import { getExamById } from "~/models/exam.model";
import type { ExamSession } from "~/models/examsession.model";
import { getStudentSessions } from "~/services/exam.service";
import type { PredictionRequest } from "~/services/prediction.service";
import { grade10ToLetter, scoreToGrade10 } from "~/utils/gradeScale";
import { getSubjectById } from "~/models/subject.model";
import { assessPredictionEligibility } from "~/services/predictionPrerequisite.service";
import { resolveSubjectId, subjectInSameGroupAsTarget } from "~/utils/subjectGroups.util";

export type StudentPredictionBuild = {
  request: PredictionRequest;
  contextSession: ExamSession;
  target_subject: string;
};

export type CompletedExamRow = {
  subject_id: string | null;
  subject: string;
  semester: number | null;
  score: number;
  grade: string;
  session: ExamSession;
};

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isSameSubject(row: CompletedExamRow, target: { id: string; name: string }): boolean {
  return (
    row.subject_id === target.id ||
    normalizeName(row.subject) === normalizeName(target.name)
  );
}

function assessTargetWindow(
  rows: CompletedExamRow[],
  target: { id: string; name: string; semester: number }
): { allowed: boolean; message?: string } {
  if (rows.some((row) => isSameSubject(row, target))) {
    return {
      allowed: false,
      message:
        "Môn này đã hoàn thành. Hệ thống chỉ dự báo cho các môn ở học kỳ sau chưa học.",
    };
  }

  const maxCompletedSemester = rows.reduce(
    (max, row) => (row.semester != null && row.semester > max ? row.semester : max),
    0
  );
  if (
    target.semester > 0 &&
    maxCompletedSemester > 0 &&
    target.semester <= maxCompletedSemester
  ) {
    return {
      allowed: false,
      message:
        "Chỉ dự báo cho các môn ở học kỳ sau chưa học. Môn đã chọn không còn thuộc học kỳ tương lai.",
    };
  }

  return { allowed: true };
}

export async function loadStudentCompletedExams(
  studentId: string
): Promise<CompletedExamRow[]> {
  const sessions = await getStudentSessions(studentId);
  const completed = sessions.filter(
    (s) =>
      s.status !== "active" &&
      s.score != null &&
      s.max_points != null &&
      Number(s.max_points) > 0
  );
  const newestFirst = completed.slice(0, 20);
  const chronological = newestFirst.slice().reverse();
  const rows: CompletedExamRow[] = [];

  for (const s of chronological) {
    const exam = await getExamById(s.exam_id);
    const subjectId = exam?.subject_id ?? null;
    const subjectMeta = subjectId ? await getSubjectById(subjectId) : null;
    const grade10 = scoreToGrade10(s.score, s.max_points);
    if (grade10 == null) continue;
    const subject = subjectMeta?.name || exam?.subject_name || exam?.title || s.exam_id;
    rows.push({
      subject_id: subjectId,
      subject,
      semester: subjectMeta?.semester ?? null,
      score: grade10,
      grade: grade10ToLetter(grade10),
      session: s,
    });
  }
  return rows;
}

function pickContextSession(
  rows: CompletedExamRow[],
  targetSubjectName: string
): ExamSession | null {
  const targetId = resolveSubjectId(targetSubjectName);
  if (!targetId) return rows.length ? rows[rows.length - 1].session : null;

  const inGroup = rows.filter((r) =>
    subjectInSameGroupAsTarget(r.subject, targetId)
  );
  if (inGroup.length > 0) return inGroup[inGroup.length - 1].session;
  return rows.length ? rows[rows.length - 1].session : null;
}

export async function buildStudentPredictionInput(
  studentId: string,
  fullName: string | null,
  targetSubjectId: string
): Promise<StudentPredictionBuild | null> {
  const rows = await loadStudentCompletedExams(studentId);
  if (rows.length === 0) return null;

  const targetSubject = await getSubjectById(targetSubjectId);
  if (!targetSubject) {
    const err = new Error("Không tìm thấy môn cần dự đoán") as Error & { status: number };
    err.status = 404;
    throw err;
  }

  const targetWindow = assessTargetWindow(rows, {
    id: targetSubject.id,
    name: targetSubject.name,
    semester: targetSubject.semester,
  });
  if (!targetWindow.allowed) {
    const err = new Error(
      targetWindow.message ?? "Môn này không còn phù hợp để dự báo."
    ) as Error & { status: number };
    err.status = 400;
    throw err;
  }

  const eligibility = await assessPredictionEligibility(
    targetSubjectId,
    rows.map((r) => r.subject)
  );
  if (!eligibility.eligible) {
    const err = new Error(eligibility.message) as Error & { status: number };
    err.status = 400;
    throw err;
  }

  const contextSession = pickContextSession(rows, targetSubject.name);
  if (!contextSession) return null;

  const contextRow =
    rows.find((r) => r.session.id === contextSession.id) ??
    rows[rows.length - 1];
  const history = rows
    .filter((r) => r.session.id !== contextRow.session.id)
    .map((r) => ({
      subject: r.subject,
      score: r.score,
      grade: r.grade,
    }));

  const groupLabels = eligibility.group_labels;

  return {
    target_subject: targetSubject.name,
    contextSession,
    request: {
      student_id: studentId,
      student_name: fullName ?? undefined,
      just_completed: {
        subject: contextRow.subject,
        score: contextRow.score,
        grade: contextRow.grade,
      },
      history,
      target_subjects: [targetSubject.name],
    },
  };
}

export async function getStudentEligibility(
  studentId: string,
  targetSubjectId: string
) {
  const subject = await getSubjectById(targetSubjectId);
  const rows = await loadStudentCompletedExams(studentId);
  if (rows.length === 0) {
    return {
      eligible: false,
      target_subject: subject?.name ?? "",
      target_id: subject ? resolveSubjectId(subject.name) : null,
      group_labels: [] as string[],
      missing_prerequisites: [] as string[],
      scored_in_group: [] as string[],
      message: "Chưa có bài thi hoàn thành nào.",
    };
  }
  if (subject) {
    const targetWindow = assessTargetWindow(rows, {
      id: subject.id,
      name: subject.name,
      semester: subject.semester,
    });
    if (!targetWindow.allowed) {
      return {
        eligible: false,
        target_subject: subject.name,
        target_id: resolveSubjectId(subject.name),
        group_labels: [] as string[],
        missing_prerequisites: [] as string[],
        scored_in_group: [] as string[],
        message: targetWindow.message ?? "Môn này không còn phù hợp để dự báo.",
      };
    }
  }
  return assessPredictionEligibility(
    targetSubjectId,
    rows.map((r) => r.subject)
  );
}
