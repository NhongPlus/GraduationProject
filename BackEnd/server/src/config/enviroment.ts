import dotenv from "dotenv";

dotenv.config();

/** Danh sách origin được phép gọi API + Socket.IO (CORS). Phân tách bằng dấu phẩy. */
function parseCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (raw) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [
    "http://localhost:5173",
    "https://nhongplus.id.vn",
  ];
}

function parseBool(raw: string | undefined, defaultVal: boolean): boolean {
  if (raw === undefined || raw === "") return defaultVal;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function parseIntEnv(raw: string | undefined, defaultVal: number): number {
  const n = raw !== undefined && raw !== "" ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) ? n : defaultVal;
}

export const env = {
  APP_PORT: process.env.APP_PORT || process.env.PORT || 5000,
  APP_HOST: process.env.APP_HOST || "localhost",
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || "change_this_to_strong_secret",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1d",
  AUTHOR: process.env.AUTHOR || "NhongPlus",
  /** Dùng chung cho Express `cors` và Socket.IO */
  CORS_ORIGINS: parseCorsOrigins(),
  /** SMTP — để job nhắc hạn thi gửi email (tùy chọn). */
  SMTP_HOST: process.env.SMTP_HOST?.trim() || "",
  SMTP_PORT: parseIntEnv(process.env.SMTP_PORT, 587),
  SMTP_SECURE: parseBool(process.env.SMTP_SECURE, false),
  SMTP_USER: process.env.SMTP_USER?.trim() || "",
  SMTP_PASS: process.env.SMTP_PASS?.trim() || "",
  MAIL_FROM: process.env.MAIL_FROM?.trim() || "",
  /** Chu kỳ quét nhắc hạn thi (ms), mặc định 10 phút */
  EXAM_REMINDER_INTERVAL_MS: parseIntEnv(process.env.EXAM_REMINDER_INTERVAL_MS, 600_000),
};