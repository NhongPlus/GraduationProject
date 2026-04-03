import { Router } from "express";
import authRouter from "./authRouter";
import userRouter from "./userRouter";
import examRouter from "./examRouter";

const RouterV1 = Router();

RouterV1.use("/auth", authRouter);
RouterV1.use("/users", userRouter);
RouterV1.use("/exams", examRouter);

export default RouterV1;