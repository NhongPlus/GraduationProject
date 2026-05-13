import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import pool from "~/config/db";
import {
  createNotification,
  getUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "~/models/userNotification.model";

const notificationRouter = Router();

notificationRouter.use(authMiddleware);

notificationRouter.get("/", async (req, res) => {
  const userId = (req as any).user?.userId;
  const role = (req as any).user?.role;

  try {
    if (role === "student") {
      const result = await pool.query(
        `SELECT DISTINCT ON (e.id)
          e.id AS exam_id,
          e.title,
          e.duration_min,
          e.closes_at,
          COALESCE(sub.name, e.title) AS class_name
         FROM exam_sessions es
         JOIN exams e ON e.id = es.exam_id
         LEFT JOIN classes c ON c.id = e.class_id
         LEFT JOIN subjects sub ON sub.id = c.subject_id
         WHERE es.student_id = $1
           AND es.status = 'active'
           AND e.closes_at > NOW()
         ORDER BY e.id, e.closes_at ASC
         LIMIT 10`,
        [userId]
      );
      return res.json({ success: true, data: result.rows });
    }

    if (role === "teacher" || role === "admin") {
      const result = await pool.query(
        `SELECT DISTINCT ON (e.id)
          e.id AS exam_id,
          e.title,
          e.duration_min,
          e.closes_at,
          COALESCE(sub.name, e.title) AS class_name,
          es.status AS session_status,
          COUNT(es.id) FILTER (WHERE es.status = 'active') AS active_count,
          COUNT(es.id) FILTER (WHERE es.status = 'submitted') AS submitted_count
         FROM exam_sessions es
         JOIN exams e ON e.id = es.exam_id
         LEFT JOIN classes c ON c.id = e.class_id
         LEFT JOIN subjects sub ON sub.id = c.subject_id
         WHERE e.created_by = $1
           AND e.closes_at > NOW()
         GROUP BY e.id, e.title, e.duration_min, e.closes_at, sub.name, es.status
         ORDER BY e.id, e.closes_at ASC
         LIMIT 10`,
        [userId]
      );
      return res.json({ success: true, data: result.rows });
    }

    return res.json({ success: true, data: [] });
  } catch (err: any) {
    console.error("notificationRouter error:", err?.message ?? err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// User in-app notifications
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

export default notificationRouter;