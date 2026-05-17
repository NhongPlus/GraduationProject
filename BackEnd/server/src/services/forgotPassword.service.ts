import bcrypt from "bcrypt";
import pool from "~/config/db";
import { generateResetToken, findValidToken, markTokenUsed } from "~/models/passwordResetToken.model";
import { getUserByEmail } from "~/models/user.model";
import { sendEmail } from "./email.service";
import { isEmailConfigured } from "./email.service";
import { env } from "~/config/enviroment";

const RESET_LINK_TTL_HOURS = 1;

export const forgotPassword = async (
  email: string
): Promise<{ sent: boolean; message: string }> => {
  const user = await getUserByEmail(email);
  if (!user) {
    return {
      sent: false,
      message: "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.",
    };
  }

  if (!isEmailConfigured()) {
    return {
      sent: false,
      message: "Hệ thống chưa cấu hình SMTP. Vui lòng liên hệ quản trị viên.",
    };
  }

  const token = await generateResetToken(user.id);
  const resetLink = `${env.APP_HOST}/reset-password?token=${token}`;
  const subject = "[Hệ thống thi trực tuyến] Đặt lại mật khẩu";
  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { background: #ffffff; border-radius: 8px; padding: 30px; max-width: 600px; margin: auto; }
    .footer { margin-top: 24px; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Xin chào ${user.full_name || user.username},</h2>
    <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
    <p>Nhấn vào link dưới đây để đặt lại mật khẩu (hiệu lực trong ${RESET_LINK_TTL_HOURS} giờ):</p>
    <p><a href="${resetLink}">${resetLink}</a></p>
    <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
    <p>Trân trọng,<br/>Ban quản trị hệ thống thi trực tuyến.</p>
    <div class="footer">Email này được gửi tự động. Vui lòng không trả lời trực tiếp.</div>
  </div>
</body>
</html>`;
  const text =
    `Xin chào ${user.full_name || user.username},\n\n` +
    `Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.\n\n` +
    `Nhấn vào link dưới đây để đặt lại mật khẩu (hiệu lực trong ${RESET_LINK_TTL_HOURS} giờ):\n` +
    `${resetLink}\n\n` +
    `Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.\n\n` +
    `Trân trọng,\nBan quản trị hệ thống thi trực tuyến.`;

  await sendEmail(user.email, subject, html, text);

  return {
    sent: true,
    message: "Hướng dẫn đặt lại mật khẩu đã được gửi đến email của bạn.",
  };
};

export const resetPassword = async (
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "Mật khẩu phải có ít nhất 6 ký tự." };
  }

  const record = await findValidToken(token);
  if (!record) {
    return { success: false, error: "Token không hợp lệ hoặc đã hết hạn." };
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await Promise.all([
    pool.query(
      `UPDATE accounts SET hashed_password = $1, updated_at = NOW() WHERE id = $2`,
      [hashed, record.user_id]
    ),
    markTokenUsed(record.id),
  ]);

  return { success: true };
};