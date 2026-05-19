import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import {
  listStudentsController,
  updateStudentController,
  deleteStudentController,
  getGradeReportExamsController,
  getGradeReportController,
  exportGradeReportController,
  sendGradeReportEmailController,
  getStudentTranscriptController,
  exportStudentTranscriptController,
} from "~/controllers/teacherStudents.controller";

const teacherStudentsRouter = Router();

teacherStudentsRouter.use(authMiddleware);
teacherStudentsRouter.use(roleMiddleware(["teacher"]));

teacherStudentsRouter.get("/", listStudentsController);

teacherStudentsRouter.get("/:id/transcript/export", exportStudentTranscriptController);
teacherStudentsRouter.get("/:id/transcript", getStudentTranscriptController);

teacherStudentsRouter.patch("/:id", updateStudentController);
teacherStudentsRouter.delete("/:id", deleteStudentController);

teacherStudentsRouter.get("/grade-report/exams", getGradeReportExamsController);
teacherStudentsRouter.get("/grade-report/export", exportGradeReportController);
teacherStudentsRouter.get("/grade-report", getGradeReportController);
teacherStudentsRouter.post("/grade-report/email", sendGradeReportEmailController);

export default teacherStudentsRouter;
