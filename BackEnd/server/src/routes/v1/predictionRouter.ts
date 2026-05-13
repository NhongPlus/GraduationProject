import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import { getCachedPredictionByUserId } from "~/models/studentPredictionCache.model";
import { recomputePredictionsForAllStudents } from "~/services/predictionBatch.service";

const router = Router();

/** Sinh viên / admin xem cache (admin xem bản cache của chính mình — thường null). */
router.get("/me", authMiddleware, roleMiddleware(["student", "admin"]), async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId as string | undefined;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const data = await getCachedPredictionByUserId(userId);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/** Admin: tính lại dự đoán MiniMax cho mọi sinh viên có đủ dữ liệu, ghi cache (SV không gọi API AI). */
router.post(
  "/admin/recompute-all",
  authMiddleware,
  roleMiddleware(["admin"]),
  async (req, res, next) => {
    try {
      const summary = await recomputePredictionsForAllStudents();
      return res.json({ success: true, data: summary });
    } catch (err: any) {
      if (err.message?.includes("MINIMAX_API_KEY")) {
        return res.status(503).json({ success: false, message: "Dịch vụ AI dự đoán chưa được cấu hình" });
      }
      next(err);
    }
  }
);

export default router;
