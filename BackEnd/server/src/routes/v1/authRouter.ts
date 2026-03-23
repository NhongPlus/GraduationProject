import { Router } from "express";
import { loginController, registerController, logoutController } from "~/controllers/auth.controller";
import { authMiddleware } from "~/middlewares/auth.middleware";

const authRouter = Router();

// register for first setup / admin panel
authRouter.post("/register", registerController);

// login returns JWT + user
authRouter.post("/login", loginController);

// logout invalidate current device
authRouter.post("/logout", authMiddleware, logoutController);

export default authRouter;
