import nodemailer from "nodemailer";
import { env } from "~/config/enviroment";

// ---------------------------------------------------------------------------
// Transporter (SMTP)
// ---------------------------------------------------------------------------

let _transporter: nodemailer.Transporter | null = null;

function getSmtpTransporter(): nodemailer.Transporter | null {
  if (!env.SMTP_HOST || !env.MAIL_FROM) return null;
  if (!_transporter) {
    const useTlsOn587 = env.SMTP_PORT === 587 && !env.SMTP_SECURE;
    _transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      requireTLS: useTlsOn587,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    });
  }
  return _transporter;
}

function usesResendApi(): boolean {
  return Boolean(env.RESEND_API_KEY && env.MAIL_FROM);
}

async function sendViaResend(opts: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  bcc?: string[];
}): Promise<void> {
  const body: Record<string, unknown> = {
    from: env.MAIL_FROM,
    subject: opts.subject,
    html: opts.html,
    text: opts.text ?? opts.html?.replace(/<[^>]*>/g, ""),
  };
  if (opts.bcc?.length) {
    body.bcc = opts.bcc;
    body.to = env.MAIL_FROM;
  } else {
    body.to = [opts.to];
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend API lỗi (${res.status}): ${detail.slice(0, 200)}`);
  }
}

async function sendViaSmtp(opts: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  bcc?: string[];
}): Promise<void> {
  const t = getSmtpTransporter();
  if (!t) throw new Error("SMTP chưa cấu hình — đặt SMTP_HOST và MAIL_FROM trong .env");

  if (opts.bcc?.length) {
    await t.sendMail({
      from: env.MAIL_FROM,
      to: env.MAIL_FROM,
      bcc: opts.bcc.filter(Boolean),
      subject: opts.subject,
      text: opts.text ?? opts.html?.replace(/<[^>]*>/g, ""),
      html: opts.html,
    });
    return;
  }

  await t.sendMail({
    from: env.MAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
}

async function dispatchEmail(opts: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  bcc?: string[];
}): Promise<void> {
  if (usesResendApi()) {
    await sendViaResend(opts);
    return;
  }
  await sendViaSmtp(opts);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function isEmailConfigured(): boolean {
  return usesResendApi() || Boolean(getSmtpTransporter());
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> {
  await dispatchEmail({ to, subject, html, text });
}

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

  await dispatchEmail({ to, subject, html, text });
}

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

  await dispatchEmail({ to, subject, html, text });
}

export async function sendBatchEmail(
  bcc: string[],
  subject: string,
  html: string,
  text?: string
): Promise<void> {
  if (!bcc.length) return;
  await dispatchEmail({
    to: env.MAIL_FROM,
    bcc,
    subject,
    html,
    text: text ?? html.replace(/<[^>]*>/g, ""),
  });
}

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

  await dispatchEmail({ to, subject, html, text });
}
