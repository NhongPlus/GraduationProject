import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import {
  getExamListController,
  getExamController,
  createExamController,
  updateExamController,
  deleteExamController,
  getQuestionsController,
  addQuestionController,
  updateQuestionController,
  deleteQuestionController,
  startSessionController,
  submitSessionController,
  getMySessionsController,
  getExamSessionsController,
  forceSubmitExamSessionsController,
  startExamRuntimeController,
  getMySubmissionController,
  getSessionGradingController,
  gradeSessionController,
  getExamProctoringController,
  postIntegrityEventsController,
  postAutosaveController,
  previewWordImportController,
  commitWordImportController,
  aiRecomposeExamController,
  uploadExamMediaController,
} from "~/controllers/exam.controller";

const examRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});
const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

examRouter.use(authMiddleware);

examRouter.get("/sessions/me", roleMiddleware(["admin", "teacher", "student"]), getMySessionsController);
examRouter.post("/sessions/:sessionId/submit", roleMiddleware(["student"]), submitSessionController);
examRouter.get(
  "/sessions/:sessionId/grading",
  roleMiddleware(["admin", "teacher"]),
  getSessionGradingController
);
examRouter.patch(
  "/sessions/:sessionId/grade",
  roleMiddleware(["admin", "teacher"]),
  gradeSessionController
);

examRouter.post(
  "/integrity-events",
  roleMiddleware(["student"]),
  postIntegrityEventsController
);

examRouter.post(
  "/autosave",
  roleMiddleware(["student"]),
  postAutosaveController
);

examRouter.get("/", roleMiddleware(["admin", "teacher", "student"]), getExamListController);
examRouter.post("/", roleMiddleware(["admin", "teacher"]), createExamController);
examRouter.post(
  "/import-word/preview",
  roleMiddleware(["admin", "teacher"]),
  upload.single("file"),
  previewWordImportController
);
examRouter.post(
  "/import-word/commit",
  roleMiddleware(["admin", "teacher"]),
  commitWordImportController
);
examRouter.post(
  "/import-word/ai-recompose",
  roleMiddleware(["admin", "teacher"]),
  upload.single("file"),
  aiRecomposeExamController
);
examRouter.post(
  "/upload-media",
  roleMiddleware(["admin", "teacher"]),
  mediaUpload.single("file"),
  uploadExamMediaController
);
examRouter.get("/:id", roleMiddleware(["admin", "teacher", "student"]), getExamController);
examRouter.patch("/:id", roleMiddleware(["admin", "teacher"]), updateExamController);
examRouter.delete("/:id", roleMiddleware(["admin", "teacher"]), deleteExamController);

examRouter.get("/:examId/questions", roleMiddleware(["admin", "teacher", "student"]), getQuestionsController);
examRouter.post("/:examId/questions", roleMiddleware(["admin", "teacher"]), addQuestionController);
examRouter.patch(
  "/:examId/questions/:questionId",
  roleMiddleware(["admin", "teacher"]),
  updateQuestionController
);
examRouter.delete("/:examId/questions/:questionId", roleMiddleware(["admin", "teacher"]), deleteQuestionController);

examRouter.post("/:examId/sessions", roleMiddleware(["student"]), startSessionController);
examRouter.get("/:examId/sessions", roleMiddleware(["admin", "teacher"]), getExamSessionsController);
examRouter.get(
  "/:examId/proctoring",
  roleMiddleware(["admin", "teacher"]),
  getExamProctoringController
);
examRouter.post(
  "/:examId/start-runtime",
  roleMiddleware(["admin", "teacher"]),
  startExamRuntimeController
);
examRouter.post(
  "/:examId/force-submit",
  roleMiddleware(["admin", "teacher"]),
  forceSubmitExamSessionsController
);
examRouter.get("/:examId/my-submission", roleMiddleware(["student"]), getMySubmissionController);

export default examRouter;
