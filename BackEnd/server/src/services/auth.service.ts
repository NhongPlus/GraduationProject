import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createHash } from "crypto";
import { env } from "~/config/enviroment";
import pool from "~/config/db";
import {
  createUser,
  getUserByEmail,
  getUserByUsername,
  getUserById,
  User,
} from "~/models/user.model";
import {
  createUserSession,
  revokeAllSessionsByUserId,
  getActiveSessionByUserId,
  verifySession,
} from "~/models/user_session.model";

if (!env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required in environment variables");
}

const DEFAULT_JWT_EXP = env.JWT_EXPIRES_IN || "1d";

function parseExpiryToDate(exp: string): Date {
  const match = exp.match(/^(\d+)([dhms])$/);
  if (!match) return new Date(Date.now() + 86400000);
  const [, value, unit] = match;
  const msMap: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return new Date(Date.now() + Number(value) * (msMap[unit] || 86400000));
}

export interface TokenPayload {
  userId: string;
  role: User["role"];
}

export interface LoginResult {
  token: string;
  user: Omit<User, "hashed_password">;
  deviceId: string;
  hasExistingSession: boolean;
}

export const registerUser = async (
  email: string,
  username: string,
  password: string,
  role: User["role"],
  fullName?: string
): Promise<Omit<User, "hashed_password">> => {
  const emailExists = await getUserByEmail(email);
  if (emailExists) throw new Error("Email đã tồn tại");

  const usernameExists = await getUserByUsername(username);
  if (usernameExists) throw new Error("Username đã tồn tại");

  const hashed = await bcrypt.hash(password, 12);
  const user = await createUser(email, username, hashed, role, fullName);

  const { hashed_password, ...publicUser } = user;
  return publicUser;
};

export const loginUser = async (
  email: string,
  password: string,
  deviceId: string,
  deviceInfo?: string
): Promise<LoginResult> => {
  const user = await getUserByEmail(email);
  if (!user) throw new Error("Email hoặc mật khẩu không đúng");

  if (!user.is_active) throw new Error("Tài khoản đã bị vô hiệu hóa");

  const valid = await bcrypt.compare(password, user.hashed_password);
  if (!valid) throw new Error("Email hoặc mật khẩu không đúng");

  const payload: TokenPayload = { userId: user.id, role: user.role };
  const token = jwt.sign(payload, env.JWT_SECRET as jwt.Secret, {
    expiresIn: DEFAULT_JWT_EXP,
  } as jwt.SignOptions);

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = parseExpiryToDate(DEFAULT_JWT_EXP);

  const existingSession = await getActiveSessionByUserId(user.id);
  const hasExistingSession = !!existingSession;

  await revokeAllSessionsByUserId(user.id);

  await createUserSession(user.id, deviceId, tokenHash, deviceInfo ?? null, expiresAt);

  const { hashed_password, ...publicUser } = user;
  return { token, user: publicUser, deviceId, hasExistingSession };
};

export const verifyTokenPayload = async (token: string): Promise<TokenPayload> => {
  const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;

  const user = await getUserById(decoded.userId);
  if (!user) throw new Error("Người dùng không tồn tại");
  if (!user.is_active) throw new Error("Tài khoản đã bị vô hiệu hóa");

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const sessionValid = await verifySession(decoded.userId, tokenHash);
  if (!sessionValid) {
    throw new Error("Session đã hết hạn hoặc bị thu hồi từ thiết bị khác");
  }

  return decoded;
};

export const changePasswordService = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const user = await getUserById(userId);
  if (!user) throw new Error("Người dùng không tồn tại");

  const isValid = await bcrypt.compare(currentPassword, user.hashed_password);
  if (!isValid) throw new Error("Mật khẩu hiện tại không đúng");

  if (newPassword.length < 8) {
    throw new Error("Mật khẩu mới phải có ít nhất 8 ký tự");
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await pool.query(
    "UPDATE accounts SET hashed_password = $1, updated_at = NOW() WHERE id = $2",
    [hashed, userId]
  );
};
