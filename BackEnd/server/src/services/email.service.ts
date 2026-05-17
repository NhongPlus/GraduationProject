import nodemailer from "nodemailer";
import { env } from "~/config/enviroment";

// ---------------------------------------------------------------------------
// Transporter
// ---------------------------------------------------------------------------

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!env.SMTP_HOST || !env.MAIL_FROM) return null;
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    });
  }
  return _transporter;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mustGetTransporter(): nodemailer.Transporter {
  const t = getTransporter();
  if (!t) throw new Error("SMTP chưa cấu hình — đặt SMTP_HOST và MAIL_FROM trong .env");
  return t;
}

async function send(opts: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}): Promise<void> {
  const t = mustGetTransporter();
  await t.sendMail({
    from: env.MAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function isEmailConfigured(): boolean {
  return Boolean(getTransporter());
}

/**
 * Gửi email đơn giản (html hoặc text).
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> {
  await send({ to, subject, html, text });
}

/**
 * Gửi email đặt lại mật khẩu kèm mật khẩu tạm thời.
 * @param to   Địa chỉ email người nhận
 * @param tempPassword Mật khẩu tạm do hệ thống tạo
 * @param fullName Tên hiển thị của người dùng (tùy chọn)
 */
export async function sendPasswordReset(
  to: string,
  tempPassword: string,
  fullName?: string
): Promise<void> {
  const subject = "[Hệ thống thi trực tuyến] Mật khẩu tạm thời";
  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { background: #ffffff; border-radius: 8px; padding: 30px; max-width: 600px; margin: auto; }
    .password { font-size: 24px; font-weight: bold; color: #2563eb; letter-spacing: 4px; text-align: center; margin: 20px 0; padding: 12px; border: 2px dashed #2563eb; border-radius: 6px; }
    .footer { margin-top: 24px; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Xin chào ${fullName || "bạn"},</h2>
    <p>Chúng tôi đã tạo mật khẩu tạm thời cho tài khoản của bạn:</p>
    <div class="password">${tempPassword}</div>
    <p>Vui lòng đăng nhập và đổi mật khẩu ngay sau khi đăng nhập thành công.</p>
    <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
    <p>Trân trọng,<br/>Ban quản trị hệ thống thi trực tuyến.</p>
    <div class="footer">Email này được gửi tự động. Vui lòng không trả lời trực tiếp.</div>
  </div>
</body>
</html>`;
  const text =
    `Xin chào ${fullName || "bạn"},\n\n` +
    `Mật khẩu tạm thời của bạn: ${tempPassword}\n\n` +
    `Vui lòng đăng nhập và đổi mật khẩu ngay sau khi đăng nhập thành công.\n` +
    `Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.\n\n` +
    `Trân trọng,\nBan quản trị hệ thống thi trực tuyến.`;

  await send({ to, subject, html, text });
}

/**
 * Gửi thông báo liên quan đến bài thi (nhắc hạn, thay đổi, kết quả…).
 */
export async function sendExamNotification(
  to: string,
  examTitle: string,
  message: string,
  kind: "reminder_24h" | "reminder_1h" | "started" | "closed" | "result" = "reminder_24h"
): Promise<void> {
  const subjectPrefix: Record<typeof kind, string> = {
    reminder_24h: "[Nhắc nhở 24h]",
    reminder_1h: "[Nhắc nhở 1h]",
    started: "[Thông báo]",
    closed: "[Thông báo]",
    result: "[Kết quả thi]",
  };

  const subject = `${subjectPrefix[kind]} ${examTitle}`;
  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { background: #ffffff; border-radius: 8px; padding: 30px; max-width: 600px; margin: auto; }
    .exam-title { font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 16px; }
    .message { font-size: 15px; color: #374151; line-height: 1.6; }
    .footer { margin-top: 24px; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="exam-title">📝 ${examTitle}</div>
    <div class="message">${message}</div>
    <div class="footer">Email này được gửi tự động từ hệ thống thi trực tuyến.</div>
  </div>
</body>
</html>`;
  const text = `${examTitle}\n\n${message}`;

  await send({ to, subject, html, text });
}

/**
 * Gửi email cho nhiều người cùng lúc qua BCC (cho reminder job).
 */
export async function sendBatchEmail(
  bcc: string[],
  subject: string,
  html: string,
  text?: string
): Promise<void> {
  if (!bcc.length) return;
  const t = mustGetTransporter();
  await t.sendMail({
    from: env.MAIL_FROM,
    to: env.MAIL_FROM,
    bcc: bcc.filter(Boolean),
    subject,
    text: text ?? html.replace(/<[^>]*>/g, ""),
    html,
  });
}

/**
 * Gửi thông báo điểm thi cho sinh viên.
 */
export async function sendGradeNotification(
  to: string,
  examTitle: string,
  score: number,
  maxScore: number,
  submittedAt: string
): Promise<void> {
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const subject = `[Kết quả thi] ${examTitle}`;
  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { background: #ffffff; border-radius: 8px; padding: 30px; max-width: 600px; margin: auto; }
    .score-box { font-size: 48px; font-weight: bold; color: #2563eb; text-align: center; margin: 20px 0; }
    .percentage { font-size: 20px; color: #6b7280; text-align: center; margin-bottom: 20px; }
    .info { font-size: 14px; color: #374151; margin-top: 16px; }
    .footer { margin-top: 24px; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Kết quả bài thi</h2>
    <div class="exam-title">📝 ${examTitle}</div>
    <div class="score-box">${score} / ${maxScore}</div>
    <div class="percentage">${percentage}%</div>
    <div class="info">Ngày nộp: ${submittedAt}</div>
    <p>Xem chi tiết kết quả trong hệ thống thi trực tuyến.</p>
    <div class="footer">Email này được gửi tự động từ hệ thống thi trực tuyến.</div>
  </div>
</body>
</html>`;
  const text = `Kết quả bài thi: ${examTitle}\nĐiểm: ${score}/${maxScore} (${percentage}%)\nNgày nộp: ${submittedAt}`;

  await send({ to, subject, html, text });
}