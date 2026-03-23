import dotenv from "dotenv";

dotenv.config();

export const env = {
  APP_PORT: process.env.APP_PORT || 5000,
  APP_HOST: process.env.APP_HOST || "localhost",
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || "change_this_to_strong_secret",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1d",
  AUTHOR: process.env.AUTHOR || "NhongPlus"
};