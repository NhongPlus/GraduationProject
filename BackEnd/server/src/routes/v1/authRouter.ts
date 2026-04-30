import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import { registerController, loginController } from "~/controllers/auth.controller";

const authRouter = Router();

/** Đăng ký công khai tắt — chỉ admin tạo tài khoản (Bearer JWT). */
authRouter.post("/register", authMiddleware, roleMiddleware(["admin"]), registerController);
authRouter.post("/login", loginController);

export default authRouter;