import { Request, Response, NextFunction } from "express";
import { getDashboardForUser } from "~/services/dashboard.service";

export const getDashboardController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as { user?: { userId: string; role: string } }).user;
    if (!user?.userId || !user.role) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const data = await getDashboardForUser(user.userId, user.role as "admin" | "teacher" | "student");
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
