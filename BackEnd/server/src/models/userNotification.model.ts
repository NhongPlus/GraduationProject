import pool from "~/config/db";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface UserNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: NotificationType = "info",
  link?: string
): Promise<UserNotification> => {
  const result = await pool.query(
    `INSERT INTO user_notifications (user_id, title, message, type, link)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, title, message, type, link ?? null]
  );
  return result.rows[0] as UserNotification;
};

export const getUnreadNotifications = async (
  userId: string,
  limit = 20
): Promise<UserNotification[]> => {
  const result = await pool.query(
    `SELECT * FROM user_notifications
     WHERE user_id = $1 AND is_read = FALSE
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows as UserNotification[];
};

export const markNotificationRead = async (
  id: string,
  userId: string
): Promise<void> => {
  await pool.query(
    `UPDATE user_notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
};

export const markAllNotificationsRead = async (userId: string): Promise<void> => {
  await pool.query(
    `UPDATE user_notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
};
