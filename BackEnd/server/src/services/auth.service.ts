import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "~/config/enviroment";
import {
  createUser,
  getUserByEmail,
  getUserByUsername,
  getUserById,
  User,
} from "~/models/user.model";

if (!env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required in environment variables");
}

const DEFAULT_JWT_EXP = env.JWT_EXPIRES_IN || "1d";

export interface TokenPayload {
  userId: string;
  role: User["role"];
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
  password: string
): Promise<{ token: string; user: Omit<User, "hashed_password"> }> => {
  const user = await getUserByEmail(email);
  if (!user) throw new Error("Email hoặc mật khẩu không đúng");

  if (!user.is_active) throw new Error("Tài khoản đã bị vô hiệu hóa");

  const valid = await bcrypt.compare(password, user.hashed_password);
  if (!valid) throw new Error("Email hoặc mật khẩu không đúng");

  const payload: TokenPayload = { userId: user.id, role: user.role };
  const token = jwt.sign(payload, env.JWT_SECRET as jwt.Secret, {
    expiresIn: DEFAULT_JWT_EXP,
  } as jwt.SignOptions);

  const { hashed_password, ...publicUser } = user;
  return { token, user: publicUser };
};

export const verifyTokenPayload = async (token: string): Promise<TokenPayload> => {
  const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;

  const user = await getUserById(decoded.userId);
  if (!user) throw new Error("Người dùng không tồn tại");
  if (!user.is_active) throw new Error("Tài khoản đã bị vô hiệu hóa");

  return decoded;
};