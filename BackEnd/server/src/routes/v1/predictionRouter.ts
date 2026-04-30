import { Router } from "express";
import { predictScore, PredictionRequest } from "~/services/prediction.service";
import { roleMiddleware } from "~/middlewares/role.middleware";

const router = Router();

// POST /v1/prediction — AI dự đoán điểm các môn tiếp theo
router.post("/", roleMiddleware(["student", "teacher", "admin"]), async (req, res, next) => {
  try {
    const { student_id, student_name, just_completed, history, target_subjects } = req.body as PredictionRequest;

    if (!student_id || !just_completed || !history) {
      return res.status(400).json({ success: false, message: "student_id, just_completed, history là bắt buộc" });
    }
    if (typeof just_completed.score !== "number" || just_completed.score < 0 || just_completed.score > 10) {
      return res.status(400).json({ success: false, message: "just_completed.score phải là số 0-10" });
    }

    const result = await predictScore({
      student_id,
      student_name,
      just_completed,
      history,
      target_subjects,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    if (err.message?.includes("MINIMAX_API_KEY")) {
      return res.status(503).json({ success: false, message: "Dịch vụ AI dự đoán chưa được cấu hình" });
    }
    next(err);
  }
});

export default router;
