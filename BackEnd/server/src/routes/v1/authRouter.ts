import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import { registerController, loginController } from "~/controllers/auth.controller";
import {
  forgotPasswordController,
  resetPasswordController,
} from "~/controllers/forgotPassword.controller";

const authRouter = Router();

/** Đăng ký công khai tắt — chỉ admin tạo tài khoản (Bearer JWT). */
authRouter.post("/register", authMiddleware, roleMiddleware(["admin"]), registerController);
authRouter.post("/login", loginController);

/** Self-service password reset via email link */
authRouter.post("/forgot-password", forgotPasswordController);
authRouter.post("/reset-password", resetPasswordController);

export default authRouter;