import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "~/config/enviroment";
import { createUser, getUserByEmail, getUserById, updateUserDeviceId, User } from "~/models/user.model";

const DEFAULT_JWT_EXP = env.JWT_EXPIRES_IN || "1d";

if (!env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required in environment variables");
}

interface TokenPayload {
  userId: string;
  role: User["role"];
  deviceId: string;
}

export const registerUser = async (email: string, password: string, role: User["role"]): Promise<User> => {
  const existing = await getUserByEmail(email);
  if (existing) {
    throw new Error("Email đã tồn tại");
  }
  const hashed = await bcrypt.hash(password, 12);
  return await createUser(email, hashed, role);
};

export const loginUser = async (email: string, password: string, deviceId: string): Promise<{ token: string; user: User }> => {
  const user = await getUserByEmail(email);
  if (!user) {
    throw new Error("Email hoặc mật khẩu không đúng");
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    throw new Error("Email hoặc mật khẩu không đúng");
  }

  // 1 device login: cập nhật deviceId
  await updateUserDeviceId(user.id, deviceId);

  const payload: TokenPayload = {
    userId: user.id,
    role: user.role,
    deviceId,
  };

  const jwtSecret = env.JWT_SECRET as jwt.Secret;
  const token = jwt.sign(payload, jwtSecret, {
    expiresIn: DEFAULT_JWT_EXP,
  } as jwt.SignOptions);

  return { token, user };
};

export const verifyTokenPayload = async (token: string): Promise<TokenPayload> => {
  const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;

  const user = await getUserById(decoded.userId);
  if (!user) {
    throw new Error("Người dùng không tồn tại");
  }

  if (!user.device_id || user.device_id !== decoded.deviceId) {
    throw new Error("Phiên đăng nhập đã bị hủy");
  }

  return decoded;
};

export const logoutUser = async (userId: string): Promise<void> => {
  await updateUserDeviceId(userId, null);
};
