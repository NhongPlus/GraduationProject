import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import {
  getExamScoreDistributionController,
  getAllSubjectsScoreDistributionController,
  getAllAdminClassesScoreDistributionController,
} from "~/controllers/scoreAnalytics.controller";

const scoreAnalyticsRouter = Router();

scoreAnalyticsRouter.use(authMiddleware);

scoreAnalyticsRouter.get(
  "/exam/:examId",
  roleMiddleware(["admin", "teacher"]),
  getExamScoreDistributionController
);

scoreAnalyticsRouter.get(
  "/subjects",
  roleMiddleware(["admin", "teacher"]),
  getAllSubjectsScoreDistributionController
);

scoreAnalyticsRouter.get(
  "/admin-classes",
  roleMiddleware(["admin", "teacher"]),
  getAllAdminClassesScoreDistributionController
);

export default scoreAnalyticsRouter;
