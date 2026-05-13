import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import {
  getUsersController,
  getUserController,
  createUserController,
  updateUserController,
  deleteUserController,
  changePasswordController,
} from "~/controllers/user.controller";

const userRouter = Router();

userRouter.use(authMiddleware);

userRouter.get("/", roleMiddleware(["admin"]), getUsersController);
userRouter.post("/", roleMiddleware(["admin"]), createUserController);
userRouter.get("/:id", roleMiddleware(["admin"]), getUserController);
userRouter.patch("/:id", roleMiddleware(["admin"]), updateUserController);
userRouter.patch("/:id/password", changePasswordController);
userRouter.delete("/:id", roleMiddleware(["admin"]), deleteUserController);

export default userRouter;