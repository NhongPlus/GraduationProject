import bcrypt from "bcrypt";
import {
  getAllUsers,
  queryUsersPaginated,
  getUserById,
  getUserByEmail,
  getUserByUsername,
  createUser,
  updateUser,
  deleteUser,
  User,
  PublicUser,
  UserUpdateFields,
  type UserListFilters,
} from "~/models/user.model";
import { generateRandomPassword } from "~/utils/randomPassword";
import { sendPasswordReset } from "~/services/email.service";

export const getUsers = async (): Promise<PublicUser[]> => {
  return getAllUsers();
};

export const listUsersPaginated = async (
  limit: number,
  offset: number,
  opts?: UserListFilters
) => queryUsersPaginated(limit, offset, opts);

export const getUserDetail = async (id: string): Promise<PublicUser | null> => {
  const user = await getUserById(id);
  if (!user) return null;
  const { hashed_password, ...publicUser } = user;
  return publicUser;
};

export const createUserService = async (
  email: string,
  username: string,
  password: string,
  role: User["role"],
  fullName?: string,
  adminClassId?: string | null
): Promise<PublicUser> => {
  if (await getUserByEmail(email)) throw new Error("Email đã tồn tại");
  if (await getUserByUsername(username)) throw new Error("Username đã tồn tại");

  const hashed = await bcrypt.hash(password, 12);
  const storePlain = role === "student" || role === "teacher";
  const user = await createUser(email, username, hashed, role, fullName, storePlain ? password : null, {
    first_login: storePlain,
    admin_class_id: role === "student" ? adminClassId ?? null : null,
  });
  const { hashed_password, ...publicUser } = user;
  return publicUser;
};

export const adminResetPasswordService = async (
  userId: string
): Promise<{ email_sent: boolean }> => {
  const user = await getUserById(userId);
  if (!user) throw new Error("Không tìm thấy người dùng");
  if (user.role !== "student" && user.role !== "teacher" && user.role !== "admin") {
    throw new Error("Không hỗ trợ đặt lại mật khẩu cho vai trò này");
  }

  const tempPassword = generateRandomPassword(10);
  const hashed = await bcrypt.hash(tempPassword, 12);
  await updateUser(userId, {
    hashed_password: hashed,
    password_plain: tempPassword,
    first_login: true,
  });

  let email_sent = false;
  try {
    await sendPasswordReset(user.email, tempPassword, user.full_name ?? undefined);
    email_sent = true;
  } catch {
    email_sent = false;
  }
  return { email_sent };
};

export const updateUserService = async (
  id: string,
  fields: {
    full_name?: string | null;
    is_active?: boolean;
    role?: User["role"];
    username?: string;
    email?: string;
    password?: string;
  }
): Promise<PublicUser | null> => {
  const existing = await getUserById(id);
  if (!existing) return null;

  if (fields.email && fields.email !== existing.email) {
    if (await getUserByEmail(fields.email)) throw new Error("Email đã tồn tại");
  }
  if (fields.username && fields.username !== existing.username) {
    if (await getUserByUsername(fields.username)) throw new Error("Username đã tồn tại");
  }

  const patch: UserUpdateFields = {};
  if (fields.full_name !== undefined) patch.full_name = fields.full_name;
  if (fields.is_active !== undefined) patch.is_active = fields.is_active;
  if (fields.role !== undefined) patch.role = fields.role;
  if (fields.username !== undefined) patch.username = fields.username;
  if (fields.email !== undefined) patch.email = fields.email;
  if (fields.password !== undefined && String(fields.password).length > 0) {
    patch.hashed_password = await bcrypt.hash(String(fields.password), 12);
    patch.password_plain = String(fields.password);
    if (existing.role === "student" || existing.role === "teacher") {
      patch.first_login = true;
    }
  }

  const user = await updateUser(id, patch);
  if (!user) return null;
  const { hashed_password, ...publicUser } = user;
  return publicUser;
};

export const deleteUserService = async (id: string): Promise<boolean> => {
  return deleteUser(id);
};

export const bulkDeleteUsersService = async (
  ids: string[]
): Promise<{ deleted: number; failed: { id: string; reason: string }[] }> => {
  let deleted = 0;
  const failed: { id: string; reason: string }[] = [];
  for (const id of ids) {
    try {
      const ok = await deleteUser(id);
      if (ok) deleted += 1;
      else failed.push({ id, reason: "Không tìm thấy người dùng" });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "23503") {
        failed.push({ id, reason: "Tài khoản đang được tham chiếu (đề thi, lớp, …)" });
      } else {
        failed.push({ id, reason: "Không xóa được tài khoản" });
      }
    }
  }
  return { deleted, failed };
};
