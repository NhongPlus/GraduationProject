import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import {
  listAdminClassesController,
  getAdminClassController,
  getMyAdminClassController,
} from "~/controllers/adminClass.controller";

const adminClassRouter = Router();

adminClassRouter.use(authMiddleware);

adminClassRouter.get(
  "/me",
  roleMiddleware(["admin", "teacher", "student"]),
  getMyAdminClassController
);

adminClassRouter.get(
  "/",
  roleMiddleware(["admin", "teacher"]),
  listAdminClassesController
);

adminClassRouter.get(
  "/:id",
  roleMiddleware(["admin", "teacher"]),
  getAdminClassController
);

export default adminClassRouter;
