import {
  getAllExams,
  getExamsByClass,
  getExamById,
  createExam,
  deleteExam,
  Exam,
  ExamDetail,
} from "~/models/exam.model";
import {
  getPublicQuestionsByExam,
  getQuestionsByExam,
  createQuestion,
  deleteQuestion,
  Question,
  PublicQuestion,
  QuestionType,
} from "~/models/question.model";
import {
  getActiveSession,
  createSession,
  getSessionsByStudent,
  getSessionsByExam,
  getSessionById,
  finalizeSessionSubmit,
  getLatestSubmittedSession,
  getSessionWithExam,
  updateSessionGrading,
  ExamSession,
  GradingStatus,
} from "~/models/examsession.model";
import pool from "~/config/db";

export function httpError(status: number, message: string): Error & { status: number } {
  const e = new Error(message) as Error & { status: number };
  e.status = status;
  return e;
}

export const listExams = async (): Promise<ExamDetail[]> => getAllExams();
export const listExamsByClass = async (classId: string): Promise<Exam[]> =>
  getExamsByClass(classId);
export const getExam = async (id: string): Promise<ExamDetail | null> => getExamById(id);

export const createExamService = async (
  title: string,
  classId: string,
  createdBy: string,
  durationMin: number,
  description?: string
): Promise<Exam> => createExam(title, classId, createdBy, durationMin, description);

export const deleteExamService = async (id: string): Promise<boolean> => deleteExam(id);

export const getQuestionsForStudent = async (examId: string): Promise<PublicQuestion[]> =>
  getPublicQuestionsByExam(examId);

export const getQuestionsForTeacher = async (examId: string): Promise<Question[]> =>
  getQuestionsByExam(examId);

export const addQuestion = async (
  examId: string,
  content: string,
  points: number,
  questionType: QuestionType,
  options?: Record<string, string> | null,
  correctAnswer?: string | string[] | null
): Promise<Question> => {
  if (questionType === "mcq") {
    if (!options || Object.keys(options).length === 0) {
      throw httpError(400, "Câu trắc nghiệm cần options");
    }
    if (correctAnswer === undefined || correctAnswer === null) {
      throw httpError(400, "Câu trắc nghiệm cần correct_answer");
    }
  }
  return createQuestion(
    examId,
    content,
    questionType,
    points,
    options ?? null,
    correctAnswer ?? null
  );
};

export const removeQuestion = async (id: string): Promise<boolean> => deleteQuestion(id);

export const startSession = async (examId: string, studentId: string): Promise<ExamSession> => {
  const existing = await getActiveSession(examId, studentId);
  if (existing) return existing;
  return createSession(examId, studentId);
};

export interface StartSessionPayload {
  session: ExamSession;
  deadline_at: string;
  duration_min: number;
}

export const startSessionWithMeta = async (
  examId: string,
  studentId: string
): Promise<StartSessionPayload> => {
  const exam = await getExamById(examId);
  if (!exam) throw httpError(404, "Không tìm thấy bài thi");
  const session = await startSession(examId, studentId);
  const started = new Date(session.started_at).getTime();
  const deadline = started + exam.duration_min * 60 * 1000;
  return {
    session,
    deadline_at: new Date(deadline).toISOString(),
    duration_min: exam.duration_min,
  };
};

export interface GradedDetailRow {
  question_id: string;
  question_type: QuestionType;
  submitted: string | string[] | null;
  correct?: string | string[] | null;
  is_correct: boolean;
  points_earned: number | null;
  max_points: number;
  pending_grading?: boolean;
  teacher_comment?: string | null;
}

export interface SubmitResult {
  session: ExamSession;
  score: number;
  total_points: number;
  correct_count: number;
  total_questions: number;
  grading_status: GradingStatus;
  details: Array<{
    question_id: string;
    question_type: QuestionType;
    submitted: string | string[] | null;
    is_correct: boolean;
    points_earned: number | null;
    max_points: number;
    pending_grading?: boolean;
  }>;
}

function parseGradedDetails(raw: unknown): GradedDetailRow[] {
  if (raw == null) return [];
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as GradedDetailRow[];
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) return raw as GradedDetailRow[];
  return [];
}

export const submitSessionService = async (
  sessionId: string,
  studentId: string,
  answers: Record<string, string | string[]>
): Promise<SubmitResult> => {
  const session = await getSessionById(sessionId);
  if (!session) throw httpError(404, "Phiên thi không tồn tại");
  if (session.student_id !== studentId) throw httpError(403, "Không có quyền nộp bài");
  if (session.status !== "active") throw httpError(400, "Phiên thi đã kết thúc");

  const exam = await getExamById(session.exam_id);
  if (!exam) throw httpError(404, "Không tìm thấy bài thi");

  const deadline = new Date(session.started_at).getTime() + exam.duration_min * 60 * 1000;
  if (Date.now() > deadline) throw httpError(400, "Đã hết thời gian làm bài");

  const questions = await getQuestionsByExam(session.exam_id);
  let score = 0;
  let totalPoints = 0;
  let correctCount = 0;
  let hasEssay = false;

  const gradedRows: GradedDetailRow[] = questions.map((q) => {
    totalPoints += Number(q.points);
    const submitted = answers[q.id] ?? null;

    if (q.question_type === "essay") {
      hasEssay = true;
      const text =
        submitted === null || submitted === undefined
          ? ""
          : Array.isArray(submitted)
            ? submitted.join("\n")
            : String(submitted);
      return {
        question_id: q.id,
        question_type: "essay",
        submitted: text,
        is_correct: false,
        points_earned: null,
        max_points: Number(q.points),
        pending_grading: true,
        teacher_comment: null,
      };
    }

    const correct = q.correct_answer;
    const isCorrect =
      submitted !== undefined &&
      submitted !== null &&
      JSON.stringify(submitted) === JSON.stringify(correct);
    const pointsEarned = isCorrect ? Number(q.points) : 0;
    score += pointsEarned;
    if (isCorrect) correctCount++;

    return {
      question_id: q.id,
      question_type: "mcq",
      submitted,
      correct,
      is_correct: isCorrect,
      points_earned: pointsEarned,
      max_points: Number(q.points),
      pending_grading: false,
    };
  });

  const gradingStatus: GradingStatus = hasEssay ? "pending_manual" : "complete";

  const updated = await finalizeSessionSubmit(sessionId, {
    score,
    max_points: totalPoints,
    student_answers: answers,
    graded_details: gradedRows,
    grading_status: gradingStatus,
  });

  if (!updated) throw httpError(409, "Không thể nộp bài (phiên không còn active)");

  const studentDetails = gradedRows.map((d) => ({
    question_id: d.question_id,
    question_type: d.question_type,
    submitted: d.submitted,
    is_correct: d.is_correct,
    points_earned: d.points_earned,
    max_points: d.max_points,
    pending_grading: d.pending_grading,
  }));

  return {
    session: updated,
    score,
    total_points: totalPoints,
    correct_count: correctCount,
    total_questions: questions.length,
    grading_status: gradingStatus,
    details: studentDetails,
  };
};

export interface MySubmissionView {
  session: ExamSession;
  score: number | null;
  max_points: number | null;
  grading_status: GradingStatus | null;
  details: SubmitResult["details"];
}

export const getMySubmissionForExam = async (
  examId: string,
  studentId: string
): Promise<MySubmissionView | null> => {
  const row = await getLatestSubmittedSession(examId, studentId);
  if (!row) return null;
  const details = parseGradedDetails(row.graded_details).map((d) => ({
    question_id: d.question_id,
    question_type: d.question_type,
    submitted: d.submitted,
    is_correct: d.is_correct,
    points_earned: d.points_earned,
    max_points: d.max_points,
    pending_grading: d.pending_grading,
  }));
  return {
    session: row,
    score: row.score != null ? Number(row.score) : null,
    max_points: row.max_points != null ? Number(row.max_points) : null,
    grading_status: row.grading_status,
    details,
  };
};

export interface GradingViewPayload {
  session: ExamSession;
  exam: ExamDetail;
  student: { full_name: string | null; email: string | null };
  questions: Question[];
  graded_details: GradedDetailRow[];
}

export const getSessionGradingView = async (
  sessionId: string,
  actorId: string,
  actorRole: string
): Promise<GradingViewPayload> => {
  const meta = await getSessionWithExam(sessionId);
  if (!meta) throw httpError(404, "Không tìm thấy phiên thi");
  if (meta.status !== "submitted") throw httpError(400, "Chỉ chấm bài đã nộp");

  const canGrade =
    actorRole === "admin" ||
    (actorRole === "teacher" && meta.exam_created_by === actorId);
  if (!canGrade) throw httpError(403, "Không có quyền chấm bài này");

  const exam = await getExamById(meta.exam_id);
  if (!exam) throw httpError(404, "Không tìm thấy đề");

  const questions = await getQuestionsByExam(meta.exam_id);
  const acc = await pool.query("SELECT full_name, email FROM accounts WHERE id = $1", [
    meta.student_id,
  ]);
  const studentRow = acc.rows[0] ?? {};

  return {
    session: meta,
    exam,
    student: { full_name: studentRow.full_name ?? null, email: studentRow.email ?? null },
    questions,
    graded_details: parseGradedDetails(meta.graded_details),
  };
};

export const gradeEssaySessionService = async (
  sessionId: string,
  actorId: string,
  actorRole: string,
  grades: Record<string, { points_awarded: number; comment?: string }>
): Promise<ExamSession> => {
  const meta = await getSessionWithExam(sessionId);
  if (!meta) throw httpError(404, "Không tìm thấy phiên thi");
  if (meta.status !== "submitted") throw httpError(400, "Phiên không hợp lệ");

  const canGrade =
    actorRole === "admin" ||
    (actorRole === "teacher" && meta.exam_created_by === actorId);
  if (!canGrade) throw httpError(403, "Không có quyền chấm bài này");

  const questions = await getQuestionsByExam(meta.exam_id);
  const qMap = new Map(questions.map((q) => [q.id, q]));
  const details = [...parseGradedDetails(meta.graded_details)];
  if (details.length === 0) throw httpError(400, "Không có dữ liệu chấm");

  for (const [qid, g] of Object.entries(grades)) {
    const q = qMap.get(qid);
    if (!q || q.question_type !== "essay") {
      throw httpError(400, "Câu không phải tự luận hoặc không tồn tại");
    }
    if (typeof g.points_awarded !== "number" || Number.isNaN(g.points_awarded)) {
      throw httpError(400, "points_awarded không hợp lệ");
    }
    if (g.points_awarded < 0 || g.points_awarded > Number(q.points)) {
      throw httpError(400, "Điểm vượt quá max cho câu");
    }
    const idx = details.findIndex((d) => d.question_id === qid);
    if (idx < 0) throw httpError(400, "Không tìm thấy câu trong bài nộp");
    details[idx] = {
      ...details[idx],
      points_earned: g.points_awarded,
      pending_grading: false,
      teacher_comment: g.comment ?? null,
    };
  }

  const score = details.reduce(
    (s, d) => s + (d.points_earned != null ? Number(d.points_earned) : 0),
    0
  );
  const pendingEssay = details.some(
    (d) => d.question_type === "essay" && d.pending_grading
  );
  const gradingStatus: GradingStatus = pendingEssay ? "pending_manual" : "complete";

  const updated = await updateSessionGrading(sessionId, {
    score,
    graded_details: details,
    grading_status: gradingStatus,
  });
  if (!updated) throw httpError(500, "Cập nhật chấm thất bại");
  return updated;
};

export const getStudentSessions = async (studentId: string): Promise<ExamSession[]> =>
  getSessionsByStudent(studentId);

export const getExamSessions = async (examId: string): Promise<ExamSession[]> =>
  getSessionsByExam(examId);
