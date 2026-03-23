import { Router } from "express";
import { getUsersController, createUserController } from "~/controllers/user.controller";
import { roleMiddleware } from "~/middlewares/role.middleware";

const userRouter = Router();

userRouter.get("/", roleMiddleware(["admin"]), getUsersController);
userRouter.post("/", roleMiddleware(["admin"]), createUserController);

export default userRouter;
