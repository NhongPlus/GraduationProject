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
} from "~/models/user.model";

export const getUsers = async (): Promise<PublicUser[]> => {
  return getAllUsers();
};

export const listUsersPaginated = async (
  limit: number,
  offset: number,
  opts?: { role?: User["role"]; search?: string }
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
  const user = await createUser(email, username, hashed, role, fullName);
  const { hashed_password, ...publicUser } = user;
  return publicUser;
};

export const updateUserService = async (
  id: string,
  fields: Partial<Pick<User, "full_name" | "is_active" | "role">>
): Promise<PublicUser | null> => {
  const user = await updateUser(id, fields);
  if (!user) return null;
  const { hashed_password, ...publicUser } = user;
  return publicUser;
};

export const deleteUserService = async (id: string): Promise<boolean> => {
  return deleteUser(id);
};