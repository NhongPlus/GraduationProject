import { Request, Response, NextFunction } from "express";
import {
  listExams,
  listExamsByClass,
  getExam,
  createExamService,
  updateExamService,
  deleteExamService,
  getQuestionsForStudent,
  getQuestionsForTeacher,
  addQuestion,
  updateQuestionInExam,
  removeQuestion,
  startSessionWithMeta,
  submitSessionService,
  getStudentSessions,
  getExamSessions,
  getMySubmissionForExam,
  getSessionGradingView,
  gradeEssaySessionService,
  forceSubmitActiveSessionsByExamService,
  getExamProctoringData,
  normalizeIntegrityEvents,
  persistIntegrityEventsService,
  persistAutosaveSnapshotService,
  createExamWithQuestionsService,
} from "~/services/exam.service";
import { parseExamImportDocx, aiRecomposeExam } from "~/services/examImport.service";
import { uploadMediaBuffer } from "~/services/cloudinary.service";
import { emitForceSubmitNotification, startExamRuntimeFromServer } from "~/socket/examSocket";
import { auditGradeSession, auditForceSubmit } from "~/services/auditHelpers";
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
    const { title, class_id, duration_min, description, closes_at } = req.body;
    if (!title || !class_id || !duration_min) {
      return res.status(400).json({ success: false, message: "title/class_id/duration_min là bắt buộc" });
    }
    const user = (req as any).user;
    const exam = await createExamService(
      title,
      class_id,
      user.userId,
      Number(duration_min),
      description,
      closes_at
    );
    res.status(201).json({ success: true, data: exam });
  } catch (err) {
    next(err);
  }
};

export const previewWordImportController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "file .docx là bắt buộc" });
    }
    const preview = await parseExamImportDocx(file.buffer);
    res.json({ success: true, data: preview });
  } catch (err) {
    next(err);
  }
};

export const commitWordImportController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    const { title, class_id, duration_min, description, closes_at, questions } = req.body;
    const data = await createExamWithQuestionsService({
      title,
      class_id,
      duration_min: Number(duration_min),
      description,
      closes_at,
      questions,
      created_by: user.userId,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const aiRecomposeExamController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "file .docx là bắt buộc" });
    }
    const examInfo = req.body.examInfo ? JSON.parse(req.body.examInfo) : {};
    const result = await aiRecomposeExam(file.buffer, examInfo);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error("aiRecomposeExamController error:", err.message);
    res.status(500).json({ success: false, message: err.message || "Lỗi khi xử lý AI" });
  }
};

export const uploadExamMediaController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "file media là bắt buộc" });
    }

    const uploaded = await uploadMediaBuffer({
      buffer: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
      folder: "exam-media",
    });

    res.json({
      success: true,
      data: {
        url: uploaded.secure_url || uploaded.url,
        public_id: uploaded.public_id,
        resource_type: uploaded.resource_type,
        bytes: uploaded.bytes,
        format: uploaded.format ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateExamController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const exam = await updateExamService(req.params.id, req.body);
    if (!exam) return res.status(404).json({ success: false, message: "Không tìm thấy bài thi" });
    res.json({ success: true, data: exam });
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
    const { content, options, correct_answer, points, question_type, media_url } = req.body;
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
      correct_answer ?? null,
      media_url ?? null
    );
    res.status(201).json({ success: true, data: q });
  } catch (err) {
    next(err);
  }
};

export const updateQuestionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content, options, correct_answer, points, question_type, media_url, display_order } = req.body;
    if (!content || points === undefined || points === null || display_order === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "content, points và display_order là bắt buộc" });
    }
    const qt = (question_type || "mcq") as QuestionType;
    if (qt !== "mcq" && qt !== "essay") {
      return res.status(400).json({ success: false, message: "question_type phải là mcq hoặc essay" });
    }
    const q = await updateQuestionInExam(req.params.examId, req.params.questionId, {
      content,
      points: Number(points),
      question_type: qt,
      options: options ?? null,
      correct_answer: correct_answer ?? null,
      media_url: media_url ?? null,
      display_order: Number(display_order),
    });
    res.json({ success: true, data: q });
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

export const forceSubmitExamSessionsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    const examId = req.params.examId;
    const data = await forceSubmitActiveSessionsByExamService(examId);
    emitForceSubmitNotification(examId, data);
    await auditForceSubmit(user.userId, user.role, examId, data.active_sessions, req);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const startExamRuntimeController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await startExamRuntimeFromServer(req.params.examId);
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
    await auditGradeSession(user.userId, user.role, req.params.sessionId, req);
    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

export const getExamProctoringController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await getExamProctoringData(req.params.examId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const postIntegrityEventsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    const { exam_id, events } = req.body;

    if (!exam_id) {
      return res.status(400).json({ success: false, message: "exam_id là bắt buộc" });
    }

    const normalized = normalizeIntegrityEvents(events);
    const data = await persistIntegrityEventsService(String(exam_id), user.userId, normalized);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const postAutosaveController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    const { exam_id, saved_at, answers } = req.body;

    if (!exam_id || !saved_at || answers === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "exam_id/saved_at/answers là bắt buộc" });
    }

    const data = await persistAutosaveSnapshotService({
      examId: String(exam_id),
      studentId: user.userId,
      savedAt: String(saved_at),
      answers,
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
