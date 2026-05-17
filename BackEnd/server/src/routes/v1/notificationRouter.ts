import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import pool from "~/config/db";
import {
  createNotification,
  getUnreadNotifications,
  getNotificationsByUser,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "~/models/userNotification.model";

const notificationRouter = Router();

notificationRouter.use(authMiddleware);

// GET /notifications  → paginated in-app notifications for the current user
notificationRouter.get("/", async (req, res) => {
  const userId = (req as any).user?.userId;
  const page = Math.max(1, Number(req.query["page"]) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query["limit"]) || 20));
  const offset = (page - 1) * limit;

  try {
    const { notifications, total } = await getNotificationsByUser(userId, limit, offset);
    res.json({
      success: true,
      data: notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error("notificationRouter error:", err?.message ?? err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// GET /notifications/unread-count
notificationRouter.get("/unread-count", async (req, res) => {
  const userId = (req as any).user?.userId;
  try {
    const count = await getUnreadCount(userId);
    res.json({ success: true, data: count });
  } catch (err: any) {
    console.error("notificationRouter /unread-count error:", err?.message ?? err);
    const missingTable = err?.code === "42P01" || /user_notifications/i.test(String(err?.message ?? ""));
    if (missingTable) {
      return res.status(503).json({
        success: false,
        error: "user_notifications table missing — run npm run migrate on production DB",
      });
    }
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// GET /notifications/user  → unread notifications (backward compatible)
notificationRouter.get("/user", async (req, res) => {
  const userId = (req as any).user?.userId;
  try {
    const notifications = await getUnreadNotifications(userId);
    res.json({ success: true, data: notifications });
  } catch (err: any) {
    console.error("notificationRouter /user error:", err?.message ?? err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

notificationRouter.patch("/:id/read", async (req, res) => {
  const userId = (req as any).user?.userId;
  const { id } = req.params;
  try {
    await markNotificationRead(id, userId);
    res.json({ success: true });
  } catch (err: any) {
    console.error("notificationRouter patch error:", err?.message ?? err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

notificationRouter.patch("/read-all", async (req, res) => {
  const userId = (req as any).user?.userId;
  try {
    await markAllNotificationsRead(userId);
    res.json({ success: true });
  } catch (err: any) {
    console.error("notificationRouter patch all error:", err?.message ?? err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /notifications/broadcast  → admin gửi notification thủ công
notificationRouter.post(
  "/broadcast",
  roleMiddleware(["admin"]),
  async (req, res) => {
    const senderId = (req as any).user?.userId;
    const {
      userIds,
      role,
      examId,
      title,
      message,
      kind = "info",
    } = req.body as {
      userIds?: string[];
      role?: "all" | "student" | "teacher";
      examId?: string;
      title?: string;
      message?: string;
      kind?: "info" | "warning" | "exam";
    };

    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ success: false, error: "title và message bắt buộc" });
    }
    if (!userIds?.length && !role && !examId) {
      return res.status(400).json({
        success: false,
        error: "Phải cung cấp ít nhất userIds, role, hoặc examId",
      });
    }

    try {
      let targetUserIds: string[] = [];

      if (userIds?.length) {
        targetUserIds = userIds;
      } else if (role) {
        const roleFilter = role === "all" ? "" : `WHERE role = $1`;
        const params = role === "all" ? [] : [role];
        const r = await pool.query(`SELECT id FROM accounts ${roleFilter}`, params);
        targetUserIds = r.rows.map((row: any) => row.id as string);
      } else if (examId) {
        // Lấy tất cả enrolled students của exam đó
        const r = await pool.query(
          `SELECT e.student_id FROM exam_sessions e WHERE e.exam_id = $1`,
          [examId]
        );
        targetUserIds = r.rows.map((row: any) => row.student_id as string);
      }

      if (targetUserIds.length === 0) {
        return res.json({ success: true, data: { sent: 0, message: "Không có người nhận" } });
      }

      await Promise.all(
        targetUserIds.map((uid) =>
          createNotification(uid, title, message, kind as any)
        )
      );

      res.json({
        success: true,
        data: { sent: targetUserIds.length, title, message },
      });
    } catch (err: any) {
      console.error("notificationRouter /broadcast error:", err?.message ?? err);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

export default notificationRouter;