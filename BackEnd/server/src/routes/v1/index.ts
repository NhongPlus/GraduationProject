import { Router } from "express";
import authRouter from "./authRouter";
import userRouter from "./userRouter";
import examRouter from "./examRouter";
import examSessionRouter from "./examSessionRouter";
import dashboardRouter from "./dashboardRouter";
import classRouter from "./classRouter";
import boardRouter from "./boardRouter";
import predictionRouter from "./predictionRouter";

const RouterV1 = Router();

RouterV1.use("/auth", authRouter);
RouterV1.use("/users", userRouter);
RouterV1.use("/dashboard", dashboardRouter);
RouterV1.use("/exams", examRouter);
RouterV1.use("/exam-sessions", examSessionRouter);
RouterV1.use("/classes", classRouter);
RouterV1.use("/board", boardRouter);
RouterV1.use("/prediction", predictionRouter);

export default RouterV1;