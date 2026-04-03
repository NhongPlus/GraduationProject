import pool from "~/config/db";

export type UserRole = "admin" | "lecturer" | "student";

export interface User {
  id: string;
  email: string;
  username: string;
  hashed_password: string;
  role: UserRole;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PublicUser = Omit<User, "hashed_password">;

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const result = await pool.query(
    "SELECT * FROM accounts WHERE email = $1",
    [email]
  );
  return result.rows[0] ?? null;
};

export const getUserByUsername = async (username: string): Promise<User | null> => {
  const result = await pool.query(
    "SELECT * FROM accounts WHERE username = $1",
    [username]
  );
  return result.rows[0] ?? null;
};

export const getUserById = async (id: string): Promise<User | null> => {
  const result = await pool.query(
    "SELECT * FROM accounts WHERE id = $1",
    [id]
  );
  return result.rows[0] ?? null;
};

export const getAllUsers = async (): Promise<PublicUser[]> => {
  const result = await pool.query(
    "SELECT id, email, username, role, full_name, is_active, created_at, updated_at FROM accounts ORDER BY created_at DESC"
  );
  return result.rows;
};

export const createUser = async (
  email: string,
  username: string,
  hashedPassword: string,
  role: UserRole,
  fullName?: string
): Promise<User> => {
  const result = await pool.query(
    `INSERT INTO accounts (email, username, hashed_password, role, full_name)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [email, username, hashedPassword, role, fullName ?? null]
  );
  return result.rows[0];
};

export const updateUser = async (
  id: string,
  fields: Partial<Pick<User, "full_name" | "is_active" | "role">>
): Promise<User | null> => {
  const keys = Object.keys(fields) as Array<keyof typeof fields>;
  if (keys.length === 0) return null;
  const setClauses = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  const values = keys.map((k) => fields[k]);
  const result = await pool.query(
    `UPDATE accounts SET ${setClauses}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] ?? null;
};

export const deleteUser = async (id: string): Promise<boolean> => {
  const result = await pool.query(
    "DELETE FROM accounts WHERE id = $1",
    [id]
  );
  return (result.rowCount ?? 0) > 0;
};