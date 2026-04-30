import {
  getAllExams,
  getExamsByClass,
  getExamById,
  createExam,
  updateExam,
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
  getActiveSessionsByExam,
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
import {
  insertIntegrityEvents,
  IntegrityEventInput,
  IntegrityEventType,
} from "~/models/examIntegrity.model";
import {
  AutosaveAnswers,
  getLatestAutosaveSnapshotBySession,
  upsertAutosaveSnapshot,
} from "~/models/examAutosave.model";
import pool from "~/config/db";
import {
  isMalformedClosesAt,
  isPastClosesAt,
  normalizeClosesAtInput,
} from "~/utils/examStartDeadline";
import type { ImportedQuestionDraft } from "~/services/examImport.service";

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
  description?: string,
  closesAt?: string | null
): Promise<Exam> => {
  if (isMalformedClosesAt(closesAt)) throw httpError(400, "closes_at không hợp lệ");
  const normalized = normalizeClosesAtInput(closesAt);
  return createExam(title, classId, createdBy, durationMin, description, normalized);
};

export const updateExamService = async (
  id: string,
  payload: {
    title?: string;
    description?: string | null;
    duration_min?: number;
    closes_at?: string | null;
  }
): Promise<Exam | null> => {
  const fields: Partial<Pick<Exam, "title" | "description" | "duration_min" | "closes_at">> = {};

  if (payload.title !== undefined) {
    const title = payload.title.trim();
    if (!title) throw httpError(400, "title không hợp lệ");
    fields.title = title;
  }
  if (payload.description !== undefined) {
    fields.description = payload.description;
  }
  if (payload.duration_min !== undefined) {
    const duration = Number(payload.duration_min);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 300) {
      throw httpError(400, "duration_min phải từ 1 đến 300 phút");
    }
    fields.duration_min = Math.floor(duration);
  }
  if (payload.closes_at !== undefined) {
    if (isMalformedClosesAt(payload.closes_at)) throw httpError(400, "closes_at không hợp lệ");
    fields.closes_at = normalizeClosesAtInput(payload.closes_at);
  }

  return updateExam(id, fields);
};

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
  correctAnswer?: string | string[] | null,
  displayOrder?: number
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
    correctAnswer ?? null,
    displayOrder
  );
};

export const removeQuestion = async (id: string): Promise<boolean> => deleteQuestion(id);

export interface CreateExamWithQuestionsPayload {
  title: string;
  class_id: string;
  created_by: string;
  duration_min: number;
  description?: string | null;
  closes_at?: string | null;
  questions: ImportedQuestionDraft[];
}

function validateQuestionDraft(question: ImportedQuestionDraft, index: number) {
  const label = `Câu ${index + 1}`;
  if (!question.content?.trim()) throw httpError(400, `${label}: thiếu nội dung`);
  if (question.question_type !== "mcq" && question.question_type !== "essay") {
    throw httpError(400, `${label}: question_type không hợp lệ`);
  }
  if (!Number.isFinite(question.points) || question.points <= 0) {
    throw httpError(400, `${label}: points phải lớn hơn 0`);
  }
  if (question.question_type === "mcq") {
    if (!question.options || Object.keys(question.options).length < 2) {
      throw httpError(400, `${label}: câu trắc nghiệm cần ít nhất 2 lựa chọn`);
    }
    if (question.correct_answer == null || question.correct_answer === "") {
      throw httpError(400, `${label}: câu trắc nghiệm cần đáp án đúng`);
    }
  }
}

export const createExamWithQuestionsService = async (
  payload: CreateExamWithQuestionsPayload
): Promise<{ exam: Exam; questions: Question[] }> => {
  if (!payload.title?.trim()) throw httpError(400, "title không hợp lệ");
  if (!payload.class_id) throw httpError(400, "class_id là bắt buộc");
  if (!Number.isFinite(payload.duration_min) || payload.duration_min <= 0 || payload.duration_min > 300) {
    throw httpError(400, "duration_min phải từ 1 đến 300 phút");
  }
  if (isMalformedClosesAt(payload.closes_at)) throw httpError(400, "closes_at không hợp lệ");
  if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
    throw httpError(400, "questions là mảng bắt buộc");
  }
  payload.questions.forEach(validateQuestionDraft);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const examResult = await client.query(
      `INSERT INTO exams (title, description, class_id, created_by, duration_min, closes_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        payload.title.trim(),
        payload.description ?? null,
        payload.class_id,
        payload.created_by,
        Math.floor(payload.duration_min),
        normalizeClosesAtInput(payload.closes_at),
      ]
    );
    const exam = examResult.rows[0] as Exam;
    const insertedQuestions: Question[] = [];

    for (let i = 0; i < payload.questions.length; i += 1) {
      const q = payload.questions[i];
      const opts = q.question_type === "essay" ? null : JSON.stringify(q.options ?? {});
      const correct =
        q.question_type === "essay" || q.correct_answer == null
          ? null
          : JSON.stringify(q.correct_answer);
      const questionResult = await client.query(
        `INSERT INTO questions (exam_id, content, question_type, options, correct_answer, points, display_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          exam.id,
          q.content.trim(),
          q.question_type,
          opts,
          correct,
          q.points,
          q.display_order || i + 1,
        ]
      );
      const row = questionResult.rows[0];
      insertedQuestions.push({
        id: row.id,
        exam_id: row.exam_id,
        content: row.content,
        question_type: row.question_type === "essay" ? "essay" : "mcq",
        options: row.options ?? null,
        correct_answer: row.correct_answer ?? null,
        points: Number(row.points),
        display_order: Number(row.display_order ?? i + 1),
        created_at: row.created_at,
      });
    }

    await client.query("COMMIT");
    return { exam, questions: insertedQuestions };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

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
  if (exam.closes_at && isPastClosesAt(exam.closes_at, Date.now())) {
    throw httpError(400, "Đã quá hạn bắt đầu bài thi");
  }
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

const MAX_INTEGRITY_BATCH = 200;
const MAX_INTEGRITY_DETAILS_BYTES = 8 * 1024;
const MAX_AUTOSAVE_BYTES = 2 * 1024 * 1024;

const INTEGRITY_TYPES: Set<IntegrityEventType> = new Set([
  "exam_opened",
  "fullscreen_enter",
  "fullscreen_exit",
  "fullscreen_error",
  "visibility_hidden",
  "window_blur",
  "window_focus",
  "copy_attempt",
  "paste_attempt",
  "context_menu",
  "before_unload",
]);

function isRecordObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isValidIsoDate(value: string): boolean {
  const t = Date.parse(value);
  if (Number.isNaN(t)) return false;
  return new Date(t).toISOString() === value;
}

export function normalizeIntegrityEvents(events: unknown): IntegrityEventInput[] {
  if (!Array.isArray(events) || events.length === 0) {
    throw httpError(400, "events là mảng bắt buộc");
  }
  if (events.length > MAX_INTEGRITY_BATCH) {
    throw httpError(400, `events vượt quá giới hạn ${MAX_INTEGRITY_BATCH}`);
  }

  const normalized: IntegrityEventInput[] = [];
  for (const rawEvent of events) {
    if (!isRecordObject(rawEvent)) {
      throw httpError(400, "event không hợp lệ");
    }

    const type = rawEvent.type;
    const at = rawEvent.at;

    if (typeof type !== "string" || !INTEGRITY_TYPES.has(type as IntegrityEventType)) {
      throw httpError(400, "event.type không hợp lệ");
    }
    if (typeof at !== "string" || !isValidIsoDate(at)) {
      throw httpError(400, "event.at phải là ISO datetime hợp lệ");
    }

    const details = rawEvent.details;
    if (details !== undefined && !isRecordObject(details)) {
      throw httpError(400, "event.details phải là object");
    }
    if (details) {
      const size = Buffer.byteLength(JSON.stringify(details), "utf8");
      if (size > MAX_INTEGRITY_DETAILS_BYTES) {
        throw httpError(413, "event.details vượt quá 8KB");
      }
    }

    normalized.push({
      type: type as IntegrityEventType,
      at,
      details,
    });
  }

  return normalized;
}

export interface IntegrityPersistResult {
  accepted: number;
  rejected: number;
}

export const persistIntegrityEventsService = async (
  examId: string,
  studentId: string,
  events: IntegrityEventInput[]
): Promise<IntegrityPersistResult> => {
  if (!examId) throw httpError(400, "exam_id là bắt buộc");

  const session = await getActiveSession(examId, studentId);
  if (!session) {
    throw httpError(403, "Không tìm thấy phiên thi active hợp lệ");
  }

  const accepted = await insertIntegrityEvents(examId, session.id, studentId, events);
  return {
    accepted,
    rejected: Math.max(0, events.length - accepted),
  };
};

function normalizeAutosaveAnswers(rawAnswers: unknown): AutosaveAnswers {
  if (!isRecordObject(rawAnswers)) {
    throw httpError(400, "answers phải là object");
  }

  const out: AutosaveAnswers = {};
  for (const [k, v] of Object.entries(rawAnswers)) {
    if (typeof v !== "string") {
      throw httpError(400, "answers chỉ chấp nhận giá trị string");
    }
    out[k] = v;
  }

  const payloadSize = Buffer.byteLength(JSON.stringify(out), "utf8");
  if (payloadSize > MAX_AUTOSAVE_BYTES) {
    throw httpError(413, "answers vượt quá giới hạn 2MB");
  }

  return out;
}

export interface AutosavePersistResult {
  saved: true;
  server_time: string;
}

export const persistAutosaveSnapshotService = async (payload: {
  examId: string;
  studentId: string;
  savedAt: string;
  answers: unknown;
}): Promise<AutosavePersistResult> => {
  if (!payload.examId) throw httpError(400, "exam_id là bắt buộc");
  if (!payload.savedAt || !isValidIsoDate(payload.savedAt)) {
    throw httpError(400, "saved_at phải là ISO datetime hợp lệ");
  }

  const session = await getActiveSession(payload.examId, payload.studentId);
  if (!session) {
    throw httpError(409, "Phiên thi không còn active");
  }

  const answers = normalizeAutosaveAnswers(payload.answers);

  const snapshot = await upsertAutosaveSnapshot({
    examId: payload.examId,
    sessionId: session.id,
    studentId: payload.studentId,
    savedAt: payload.savedAt,
    answers,
  });

  return {
    saved: true,
    server_time: snapshot.server_at,
  };
};

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
  answers: Record<string, string | string[]>,
  options?: { allowPastDeadline?: boolean }
): Promise<SubmitResult> => {
  const session = await getSessionById(sessionId);
  if (!session) throw httpError(404, "Phiên thi không tồn tại");
  if (session.student_id !== studentId) throw httpError(403, "Không có quyền nộp bài");
  if (session.status !== "active") throw httpError(400, "Phiên thi đã kết thúc");

  const exam = await getExamById(session.exam_id);
  if (!exam) throw httpError(404, "Không tìm thấy bài thi");

  const deadline = new Date(session.started_at).getTime() + exam.duration_min * 60 * 1000;
  const allowPastDeadline = options?.allowPastDeadline === true;
  if (!allowPastDeadline && Date.now() > deadline) {
    throw httpError(400, "Đã hết thời gian làm bài");
  }

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

export function normalizeAutosaveToSubmitAnswers(
  raw: AutosaveAnswers,
  orderedQuestionIds: string[]
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  if (!orderedQuestionIds.length) return out;

  const idSet = new Set(orderedQuestionIds);

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== "string") continue;

    if (idSet.has(key)) {
      out[key] = value;
      continue;
    }

    const match = /^q(\d+)$/.exec(key);
    if (!match) continue;

    const oneBasedIndex = Number(match[1]);
    if (!Number.isInteger(oneBasedIndex) || oneBasedIndex < 1) continue;

    const questionId = orderedQuestionIds[oneBasedIndex - 1];
    if (questionId) {
      out[questionId] = value;
    }
  }

  return out;
}

export interface ForceSubmitSummary {
  exam_id: string;
  active_sessions: number;
  submitted_sessions: number;
  failed_sessions: number;
}

export const forceSubmitActiveSessionsByExamService = async (
  examId: string
): Promise<ForceSubmitSummary> => {
  if (!examId) throw httpError(400, "exam_id là bắt buộc");

  const activeSessions = await getActiveSessionsByExam(examId);
  if (activeSessions.length === 0) {
    return {
      exam_id: examId,
      active_sessions: 0,
      submitted_sessions: 0,
      failed_sessions: 0,
    };
  }

  const questions = await getQuestionsByExam(examId);
  const orderedQuestionIds = questions.map((q) => q.id);

  let submittedSessions = 0;
  let failedSessions = 0;

  for (const session of activeSessions) {
    try {
      const snapshot = await getLatestAutosaveSnapshotBySession(session.id);
      const submitAnswers = normalizeAutosaveToSubmitAnswers(
        snapshot?.answers ?? {},
        orderedQuestionIds
      );

      await submitSessionService(session.id, session.student_id, submitAnswers, {
        allowPastDeadline: true,
      });
      submittedSessions += 1;
    } catch (error) {
      failedSessions += 1;
      console.error(
        `[exam] force-submit failed exam=${examId} session=${session.id}`,
        error
      );
    }
  }

  return {
    exam_id: examId,
    active_sessions: activeSessions.length,
    submitted_sessions: submittedSessions,
    failed_sessions: failedSessions,
  };
};
