import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import {
  listStudentsController,
  addStudentController,
  updateStudentController,
  deleteStudentController,
  getGradeReportController,
  sendGradeReportEmailController,
} from "~/controllers/teacherStudents.controller";

const teacherStudentsRouter = Router();

teacherStudentsRouter.use(authMiddleware);
teacherStudentsRouter.use(roleMiddleware(["teacher"]));

teacherStudentsRouter.get("/", listStudentsController);
teacherStudentsRouter.post("/", addStudentController);
teacherStudentsRouter.patch("/:id", updateStudentController);
teacherStudentsRouter.delete("/:id", deleteStudentController);

teacherStudentsRouter.get("/grade-report", getGradeReportController);
teacherStudentsRouter.post("/grade-report/email", sendGradeReportEmailController);

export default teacherStudentsRouter;
