import pool from "~/config/db";

type UserRole = "admin" | "lecturer" | "student";

export interface User {
  id: string;
  email: string;
  hashed_password: string;
  role: UserRole;
  device_id: string | null;
  created_at: string;
  updated_at: string;
}

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const result = await pool.query("SELECT * FROM accounts WHERE email = $1", [email]);
  return result.rows[0] ?? null;
};

export const getUserById = async (id: string): Promise<User | null> => {
  const result = await pool.query("SELECT * FROM accounts WHERE id = $1", [id]);
  return result.rows[0] ?? null;
};

export const getAllaccounts = async (): Promise<User[]> => {
  const result = await pool.query("SELECT id, email, role, created_at, updated_at FROM accounts");
  return result.rows;
};

export const createUser = async (email: string, hashedPassword: string, role: UserRole): Promise<User> => {
  const result = await pool.query(
    `INSERT INTO accounts (email, hashed_password, role) VALUES ($1, $2, $3) RETURNING *`,
    [email, hashedPassword, role]
  );
  return result.rows[0];
};

export const updateUserDeviceId = async (id: string, deviceId: string | null): Promise<User | null> => {
  const result = await pool.query(
    `UPDATE accounts SET device_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [deviceId, id]
  );
  return result.rows[0] ?? null;
};
