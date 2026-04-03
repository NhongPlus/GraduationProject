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
} from "~/controllers/exam.controller";

const examRouter = Router();

examRouter.use(authMiddleware);

// Exams
examRouter.get("/", roleMiddleware(["admin", "lecturer", "student"]), getExamListController);
examRouter.post("/", roleMiddleware(["admin", "lecturer"]), createExamController);
examRouter.get("/:id", roleMiddleware(["admin", "lecturer", "student"]), getExamController);
examRouter.delete("/:id", roleMiddleware(["admin", "lecturer"]), deleteExamController);

// Questions
examRouter.get("/:examId/questions", roleMiddleware(["admin", "lecturer", "student"]), getQuestionsController);
examRouter.post("/:examId/questions", roleMiddleware(["admin", "lecturer"]), addQuestionController);
examRouter.delete("/:examId/questions/:questionId", roleMiddleware(["admin", "lecturer"]), deleteQuestionController);

// Sessions
examRouter.post("/:examId/sessions", roleMiddleware(["student"]), startSessionController);
examRouter.get("/:examId/sessions", roleMiddleware(["admin", "lecturer"]), getExamSessionsController);
examRouter.post("/sessions/:sessionId/submit", roleMiddleware(["student"]), submitSessionController);

// Student xem lịch sử thi của mình
examRouter.get("/sessions/me", roleMiddleware(["student"]), getMySessionsController);

export default examRouter;