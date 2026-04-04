import { Request, Response, NextFunction } from "express";
import {
  listExams,
  listExamsByClass,
  getExam,
  createExamService,
  deleteExamService,
  getQuestionsForStudent,
  getQuestionsForTeacher,
  addQuestion,
  removeQuestion,
  startSessionWithMeta,
  submitSessionService,
  getStudentSessions,
  getExamSessions,
  getMySubmissionForExam,
  getSessionGradingView,
  gradeEssaySessionService,
} from "~/services/exam.service";
import type { QuestionType } from "~/models/question.model";

export const getExamListController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { class_id } = req.query;
    const data = class_id
      ? await listExamsByClass(String(class_id))
      : await listExams();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getExamController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const exam = await getExam(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: "Không tìm thấy bài thi" });
    res.json({ success: true, data: exam });
  } catch (err) {
    next(err);
  }
};

export const createExamController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, class_id, duration_min, description } = req.body;
    if (!title || !class_id || !duration_min) {
      return res.status(400).json({ success: false, message: "title/class_id/duration_min là bắt buộc" });
    }
    const user = (req as any).user;
    const exam = await createExamService(title, class_id, user.userId, Number(duration_min), description);
    res.status(201).json({ success: true, data: exam });
  } catch (err) {
    next(err);
  }
};

export const deleteExamController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ok = await deleteExamService(req.params.id);
    if (!ok) return res.status(404).json({ success: false, message: "Không tìm thấy bài thi" });
    res.json({ success: true, message: "Đã xóa bài thi" });
  } catch (err) {
    next(err);
  }
};

export const getQuestionsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const isTeacherOrAdmin = user.role === "teacher" || user.role === "admin";
    const data = isTeacherOrAdmin
      ? await getQuestionsForTeacher(req.params.examId)
      : await getQuestionsForStudent(req.params.examId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const addQuestionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content, options, correct_answer, points, question_type } = req.body;
    if (!content || points === undefined || points === null) {
      return res.status(400).json({ success: false, message: "content và points là bắt buộc" });
    }
    const qt = (question_type || "mcq") as QuestionType;
    if (qt !== "mcq" && qt !== "essay") {
      return res.status(400).json({ success: false, message: "question_type phải là mcq hoặc essay" });
    }
    const q = await addQuestion(
      req.params.examId,
      content,
      Number(points),
      qt,
      options ?? null,
      correct_answer ?? null
    );
    res.status(201).json({ success: true, data: q });
  } catch (err) {
    next(err);
  }
};

export const deleteQuestionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ok = await removeQuestion(req.params.questionId);
    if (!ok) return res.status(404).json({ success: false, message: "Không tìm thấy câu hỏi" });
    res.json({ success: true, message: "Đã xóa câu hỏi" });
  } catch (err) {
    next(err);
  }
};

export const startSessionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const data = await startSessionWithMeta(req.params.examId, user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const submitSessionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { answers } = req.body;
    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ success: false, message: "answers là bắt buộc (object)" });
    }
    const user = (req as any).user;
    const result = await submitSessionService(req.params.sessionId, user.userId, answers);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getMySessionsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const data = await getStudentSessions(user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getExamSessionsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getExamSessions(req.params.examId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getMySubmissionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const data = await getMySubmissionForExam(req.params.examId, user.userId);
    if (!data) return res.status(404).json({ success: false, message: "Chưa có bài nộp" });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getSessionGradingController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const data = await getSessionGradingView(req.params.sessionId, user.userId, user.role);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const gradeSessionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { grades } = req.body;
    if (!grades || typeof grades !== "object") {
      return res.status(400).json({ success: false, message: "grades là object bắt buộc" });
    }
    const user = (req as any).user;
    const session = await gradeEssaySessionService(req.params.sessionId, user.userId, user.role, grades);
    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};
