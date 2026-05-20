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
} from "~/models/user.model";

export const getUsers = async (): Promise<PublicUser[]> => {
  return getAllUsers();
};

export const listUsersPaginated = async (
  limit: number,
  offset: number,
  opts?: { role?: User["role"]; search?: string; admin_class_id?: string }
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
  fullName?: string
): Promise<PublicUser> => {
  if (await getUserByEmail(email)) throw new Error("Email đã tồn tại");
  if (await getUserByUsername(username)) throw new Error("Username đã tồn tại");

  const hashed = await bcrypt.hash(password, 12);
  const user = await createUser(
    email,
    username,
    hashed,
    role,
    fullName,
    role === "student" ? password : null
  );
  const { hashed_password, ...publicUser } = user;
  return publicUser;
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
