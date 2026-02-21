import express from "express";
import testRoutes from "./routes/test.route";

const app = express();

app.use(express.json());

app.use("/api/test", testRoutes);

export default app;