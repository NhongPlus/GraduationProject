import express from "express";
import exitHook from "async-exit-hook";

import { connectDB, closeDB } from "./config/db";
import { env } from "./config/enviroment";
import  RouterV1  from "./routes/v1/index";
import { errorHandler } from "~/middlewares/error.middleware";
const START_SERVER = () => {
  const app = express();
  app.use(express.json());

  app.use("/v1", RouterV1);

  // Root healthcheck endpoint
  app.get("/", (req, res) => {
    res.json({ success: true, message: "API is running" });
  });

  // Global error handler (uniform response)
  
  app.use(errorHandler);

  const server = app.listen(env.APP_PORT, () => {
    console.log(
      `Hi ${env.AUTHOR}, Back-end Server running at http://${env.APP_HOST}:${env.APP_PORT}`
    );
  });

  // graceful shutdown
  exitHook(async () => {
    console.log("Server shutting down...");
    server.close(); // đóng express
    await closeDB(); // đóng postgres
    console.log("PostgreSQL disconnected.");
  });
};

// connect DB trước khi start server
connectDB()
  .then(() => {
    console.log("Connected to PostgreSQL (Neon) successfully!");
    START_SERVER();
  })
  .catch((err) => {
    console.error("Cannot connect to PostgreSQL:", err);
    process.exit(1);
  });