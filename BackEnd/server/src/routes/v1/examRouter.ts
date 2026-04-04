import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import {
  getExamListController,
  getExamController,
  createExamController,
  deleteExamController,
  getQuestionsController,
  addQuestionController,
  deleteQuestionController,
  startSessionController,
  submitSessionController,
  getMySessionsController,
  getExamSessionsController,
  getMySubmissionController,
  getSessionGradingController,
  gradeSessionController,
} from "~/controllers/exam.controller";

const examRouter = Router();

examRouter.use(authMiddleware);

examRouter.get("/sessions/me", roleMiddleware(["student"]), getMySessionsController);
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

examRouter.get("/", roleMiddleware(["admin", "teacher", "student"]), getExamListController);
examRouter.post("/", roleMiddleware(["admin", "teacher"]), createExamController);
examRouter.get("/:id", roleMiddleware(["admin", "teacher", "student"]), getExamController);
examRouter.delete("/:id", roleMiddleware(["admin", "teacher"]), deleteExamController);

examRouter.get("/:examId/questions", roleMiddleware(["admin", "teacher", "student"]), getQuestionsController);
examRouter.post("/:examId/questions", roleMiddleware(["admin", "teacher"]), addQuestionController);
examRouter.delete("/:examId/questions/:questionId", roleMiddleware(["admin", "teacher"]), deleteQuestionController);

examRouter.post("/:examId/sessions", roleMiddleware(["student"]), startSessionController);
examRouter.get("/:examId/sessions", roleMiddleware(["admin", "teacher"]), getExamSessionsController);
examRouter.get("/:examId/my-submission", roleMiddleware(["student"]), getMySubmissionController);

export default examRouter;
