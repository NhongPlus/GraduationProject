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
  subject: string;
  score: number;
  grade: string;
  session: ExamSession;
};

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
    const grade10 = scoreToGrade10(s.score, s.max_points);
    if (grade10 == null) continue;
    const subject = exam?.subject_name || exam?.title || s.exam_id;
    rows.push({
      subject,
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
  return assessPredictionEligibility(
    targetSubjectId,
    rows.map((r) => r.subject)
  );
}
