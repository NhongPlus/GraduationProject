import { httpError } from "~/services/exam.service";
import {
  createPasswordResetRequest,
  getPendingResetRequests,
  getResetRequestsByUser,
  getPasswordResetRequestById,
  updateResetRequestStatus,
  expireOldResetRequests,
} from "~/models/passwordReset.model";
import { getUserById } from "~/models/user.model";
import { createNotification } from "~/models/userNotification.model";
import pool from "~/config/db";
import bcrypt from "bcrypt";
import { sendMail, isMailConfigured } from "./mail.service";

export const requestPasswordReset = async (
  userId: string,
  targetUserId: string
): Promise<{ requestId: string }> => {
  const requestor = await getUserById(userId);
  if (!requestor) throw httpError(404, "Người dùng không tồn tại");

  const target = await getUserById(targetUserId);
  if (!target) throw httpError(404, "Người dùng không tồn tại");

  if (requestor.role !== "admin" && requestor.id !== targetUserId) {
    throw httpError(403, "Không có quyền yêu cầu đặt lại mật khẩu cho người này");
  }

  const existing = await pool.query(
    `SELECT id FROM password_reset_requests
     WHERE user_id = $1 AND status = 'pending' AND expires_at > NOW()`,
    [targetUserId]
  );
  if (existing.rows.length > 0) {
    throw httpError(400, "Đã có yêu cầu đang chờ xử lý");
  }

  const req = await createPasswordResetRequest(targetUserId, userId);
  return { requestId: req.id };
};

export const getPendingResetRequestsService = async () => {
  return getPendingResetRequests();
};

export const approveResetRequest = async (
  requestId: string,
  approverId: string,
  adminNote?: string
): Promise<{ tempPassword: string }> => {
  const request = await getPasswordResetRequestById(requestId);
  if (!request) throw httpError(404, "Yêu cầu không tồn tại");
  if (request.status !== "pending") {
    throw httpError(400, `Yêu cầu đang ở trạng thái '${request.status}'`);
  }

  const tempPassword = Math.random().toString(36).slice(-8);
  const hashed = await bcrypt.hash(tempPassword, 12);

  await pool.query(
    `UPDATE accounts SET hashed_password = $1, updated_at = NOW() WHERE id = $2`,
    [hashed, request.user_id]
  );

  // Lưu temp password vào admin_note để admin có thể gửi cho sinh viên nếu email chưa cấu hình
  await updateResetRequestStatus(requestId, "approved", approverId, adminNote, tempPassword);

  // Gửi email cho sinh viên nếu SMTP đã cấu hình
  if (isMailConfigured()) {
    const user = await getUserById(request.user_id);
    if (user?.email) {
      await sendMail({
        to: user.email,
        subject: "Yêu cầu đặt lại mật khẩu đã được duyệt",
        text: `Xin chào ${user.full_name || user.username},\n\nMật khẩu tạm thời của bạn là: ${tempPassword}\n\nVui lòng đăng nhập và đổi mật khẩu ngay sau khi đăng nhập thành công.\n\nTrân trọng,\nBan quản trị hệ thống thi trực tuyến.`,
      }).catch(() => {
        // Không throw lỗi email để không ảnh hưởng đến flow chính
      });
    }
  }

  return { tempPassword };
};

export const rejectResetRequest = async (
  requestId: string,
  approverId: string,
  adminNote?: string
): Promise<void> => {
  const request = await getPasswordResetRequestById(requestId);
  if (!request) throw httpError(404, "Yêu cầu không tồn tại");
  if (request.status !== "pending") {
    throw httpError(400, `Yêu cầu đang ở trạng thái '${request.status}'`);
  }

  await updateResetRequestStatus(requestId, "rejected", approverId, adminNote);
};

export const cleanupExpiredRequests = async (): Promise<number> => {
  return expireOldResetRequests();
};

export const getMyResetRequests = async (userId: string) => {
  return getResetRequestsByUser(userId);
};
