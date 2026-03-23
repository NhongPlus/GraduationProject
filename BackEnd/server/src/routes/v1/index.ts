import { Router } from "express";
import authRouter from "./authRouter";
import userRouter from "./userRouter";
import examRouter from "./examRouter";
import examSessionRouter from "./examSessionRouter";

const RouterV1 = Router();

RouterV1.use("/auth", authRouter);
RouterV1.use("/users", userRouter);
RouterV1.use("/exams", examRouter);
RouterV1.use("/sessions", examSessionRouter);

export default RouterV1;