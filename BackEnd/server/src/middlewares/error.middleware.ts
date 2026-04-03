import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(`[${req.method}] ${req.path} —`, err?.message || err);

  // Duplicate key PostgreSQL
  if (err.code === "23505") {
    return res.status(409).json({ success: false, message: "Dữ liệu đã tồn tại" });
  }

  // Foreign key violation
  if (err.code === "23503") {
    return res.status(400).json({ success: false, message: "Tham chiếu không hợp lệ" });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(status).json({ success: false, message });
};