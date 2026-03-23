import { Router } from "express";
import { roleMiddleware } from "~/middlewares/role.middleware";
import { createExamController, getExamListController } from "~/controllers/exam.controller";

const examRouter = Router();

examRouter.get("/", roleMiddleware(["lecturer", "admin"]), getExamListController);
examRouter.post("/", roleMiddleware(["lecturer"]), createExamController);

export default examRouter;
