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

export const env = {
  APP_PORT: process.env.APP_PORT || process.env.PORT || 5000,
  APP_HOST: process.env.APP_HOST || "localhost",
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || "change_this_to_strong_secret",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1d",
  AUTHOR: process.env.AUTHOR || "NhongPlus",
  /** Dùng chung cho Express `cors` và Socket.IO */
  CORS_ORIGINS: parseCorsOrigins(),
};