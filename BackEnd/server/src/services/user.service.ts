import bcrypt from "bcrypt";
import { getUserByEmail, createUser as createUserModel, getAllUsers, User } from "~/models/user.model";

export const getUsers = async (): Promise<Partial<User>[]> => {
  const users = await getAllUsers();
  return users.map((u) => ({ id: u.id, email: u.email, role: u.role, created_at: u.created_at }));
};

export const createUser = async (email: string, password: string, role: User["role"]): Promise<Partial<User>> => {
  const existing = await getUserByEmail(email);
  if (existing) {
    throw new Error("Email đã tồn tại");
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const result = await createUserModel(email, hashedPassword, role);

  return { id: result.id, email: result.email, role: result.role, created_at: result.created_at };
};
