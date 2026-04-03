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
} from "~/models/question.model";
import {
  getActiveSession,
  createSession,
  submitSession,
  expireSession,
  getSessionsByStudent,
  getSessionsByExam,
  ExamSession,
} from "~/models/examsession.model";

// --- Exam CRUD ---

export const listExams = async (): Promise<ExamDetail[]> => {
  return getAllExams();
};

export const listExamsByClass = async (classId: string): Promise<Exam[]> => {
  return getExamsByClass(classId);
};

export const getExam = async (id: string): Promise<ExamDetail | null> => {
  return getExamById(id);
};

export const createExamService = async (
  title: string,
  classId: string,
  createdBy: string,
  durationMin: number,
  description?: string
): Promise<Exam> => {
  return createExam(title, classId, createdBy, durationMin, description);
};

export const deleteExamService = async (id: string): Promise<boolean> => {
  return deleteExam(id);
};

// --- Questions ---

export const getQuestionsForStudent = async (
  examId: string
): Promise<PublicQuestion[]> => {
  return getPublicQuestionsByExam(examId);
};

export const getQuestionsForLecturer = async (
  examId: string
): Promise<Question[]> => {
  return getQuestionsByExam(examId);
};

export const addQuestion = async (
  examId: string,
  content: string,
  options: Record<string, string>,
  correctAnswer: string | string[],
  points: number
): Promise<Question> => {
  return createQuestion(examId, content, options, correctAnswer, points);
};

export const removeQuestion = async (id: string): Promise<boolean> => {
  return deleteQuestion(id);
};

// --- Exam Sessions ---

export const startSession = async (
  examId: string,
  studentId: string
): Promise<ExamSession> => {
  const existing = await getActiveSession(examId, studentId);
  if (existing) return existing;
  return createSession(examId, studentId);
};

export interface SubmitResult {
  session: ExamSession;
  score: number;
  total_points: number;
  correct_count: number;
  total_questions: number;
  details: Array<{
    question_id: string;
    submitted: string | string[];
    correct: string | string[];
    is_correct: boolean;
    points_earned: number;
  }>;
}

export const submitSessionService = async (
  sessionId: string,
  studentId: string,
  answers: Record<string, string | string[]>
): Promise<SubmitResult> => {
  const session = await import("~/models/examsession.model").then((m) =>
    m.getSessionById(sessionId)
  );
  if (!session) throw new Error("Phiên thi không tồn tại");
  if (session.student_id !== studentId) throw new Error("Không có quyền nộp bài");
  if (session.status !== "active") throw new Error("Phiên thi đã kết thúc");

  const questions = await getQuestionsByExam(session.exam_id);

  let score = 0;
  let totalPoints = 0;
  let correctCount = 0;

  const details = questions.map((q) => {
    totalPoints += Number(q.points);
    const submitted = answers[q.id];
    const correct = q.correct_answer;

    const isCorrect = submitted !== undefined &&
      JSON.stringify(submitted) === JSON.stringify(correct);

    const pointsEarned = isCorrect ? Number(q.points) : 0;
    score += pointsEarned;
    if (isCorrect) correctCount++;

    return {
      question_id: q.id,
      submitted: submitted ?? null,
      correct,
      is_correct: isCorrect,
      points_earned: pointsEarned,
    };
  });

  const updatedSession = await submitSession(sessionId);

  return {
    session: updatedSession!,
    score,
    total_points: totalPoints,
    correct_count: correctCount,
    total_questions: questions.length,
    details,
  };
};

export const getStudentSessions = async (
  studentId: string
): Promise<ExamSession[]> => {
  return getSessionsByStudent(studentId);
};

export const getExamSessions = async (examId: string): Promise<ExamSession[]> => {
  return getSessionsByExam(examId);
};