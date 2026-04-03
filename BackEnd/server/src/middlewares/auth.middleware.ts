import { Request, Response, NextFunction } from "express";
import { verifyTokenPayload } from "~/services/auth.service";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = String(req.headers.authorization || "");
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Token không hợp lệ" });
    }
    const token = authHeader.replace("Bearer ", "").trim();
    const payload = await verifyTokenPayload(token);
    (req as any).user = payload;
    next();
  } catch (error: any) {
    return res.status(401).json({ success: false, message: error.message || "Unauthorized" });
  }
};