import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Mock modules before importing service
vi.mock("~/config/db", () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}));

// Must mock BEFORE importing auth.service
vi.mock("~/models/user_session.model", () => ({
  replaceUserSession: vi.fn().mockResolvedValue({ id: "sess-1" }),
  getActiveSessionByUserId: vi.fn().mockResolvedValue(null),
  verifySession: vi.fn().mockResolvedValue(true),
  revokeSessionByTokenHash: vi.fn().mockResolvedValue(undefined),
  revokeAllSessionsByUserId: vi.fn().mockResolvedValue(undefined),
}));

// Mock env
vi.mock("~/config/enviroment", () => ({
  env: {
    JWT_SECRET: "test-secret-key-for-unit-tests",
    JWT_EXPIRES_IN: "1d",
  },
}));

import { registerUser, loginUser, verifyTokenPayload } from "./auth.service";
import pool from "~/config/db";
import { verifySession } from "~/models/user_session.model";

const mockedPool = pool as any;

describe("auth.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("registerUser", () => {
    it("throws if email already exists", async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ id: "existing" }] });

      await expect(
        registerUser("a@b.com", "username", "pass", "student")
      ).rejects.toThrow("Email đã tồn tại");
    });

    it("throws if username already exists", async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rows: [] }) // email check
        .mockResolvedValueOnce({ rows: [{ id: "existing" }] }); // username check

      await expect(
        registerUser("a@b.com", "username", "pass", "student")
      ).rejects.toThrow("Username đã tồn tại");
    });

    it("creates user and returns public data (no hashed_password)", async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rows: [] }) // email check
        .mockResolvedValueOnce({ rows: [] }); // username check

      const hashedPassword = await bcrypt.hash("password", 12);
      mockedPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: "user-1",
            email: "a@b.com",
            username: "username",
            hashed_password: hashedPassword,
            role: "student",
            full_name: "Test User",
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      });

      const result = await registerUser("a@b.com", "username", "password", "student", "Test User");

      expect(result).not.toHaveProperty("hashed_password");
      expect(result.email).toBe("a@b.com");
      expect(result.role).toBe("student");
    });
  });

  describe("loginUser", () => {
    const mockUser = {
      id: "user-1",
      email: "student@local",
      username: "student01",
      hashed_password: "",
      role: "student" as const,
      full_name: "Student One",
      is_active: true,
      first_login: false,
      token_version: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    beforeEach(async () => {
      mockUser.hashed_password = await bcrypt.hash("Test@123", 12);
    });

    it("throws if user not found", async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        loginUser("notfound@local", "pass", "device-1")
      ).rejects.toThrow("Email hoặc mật khẩu không đúng");
    });

    it("throws if account is inactive", async () => {
      mockedPool.query.mockResolvedValueOnce({
        rows: [{ ...mockUser, is_active: false }],
      });

      await expect(
        loginUser("student@local", "Test@123", "device-1")
      ).rejects.toThrow("Tài khoản đã bị vô hiệu hóa");
    });

    it("throws if password is wrong", async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [mockUser] });

      await expect(
        loginUser("student@local", "WrongPassword", "device-1")
      ).rejects.toThrow("Email hoặc mật khẩu không đúng");
    });

    it("returns token + user + hasExistingSession=false on success", async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // getUserByEmail
        .mockResolvedValueOnce({ rows: [] }) // getActiveSessionByUserId
        .mockResolvedValueOnce({ rows: [] }) // revokeAllSessionsByUserId
        .mockResolvedValueOnce({ rows: [{ id: "session-1" }] }); // createUserSession

      const connectMock = vi.fn().mockResolvedValue({
        query: vi.fn().mockResolvedValue({ rows: [] }),
        release: vi.fn(),
      });
      mockedPool.connect = connectMock;

      const result = await loginUser("student@local", "Test@123", "device-1");

      expect(result).toHaveProperty("token");
      expect(result).toHaveProperty("user");
      expect(result.hasExistingSession).toBe(false);
      expect(result.user).not.toHaveProperty("hashed_password");
    });
  });

  describe("verifyTokenPayload", () => {
    beforeEach(() => {
      vi.mocked(verifySession).mockResolvedValue(true);
    });

    it("throws if user not found", async () => {
      const token = jwt.sign(
        { userId: "nonexistent", role: "student", first_login: false, tv: 0 },
        "test-secret-key-for-unit-tests"
      );
      mockedPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(verifyTokenPayload(token)).rejects.toThrow(
        "Người dùng không tồn tại"
      );
    });

    it("throws if account is inactive", async () => {
      const token = jwt.sign(
        { userId: "user-1", role: "student", first_login: false, tv: 0 },
        "test-secret-key-for-unit-tests"
      );
      mockedPool.query.mockResolvedValueOnce({
        rows: [{ is_active: false, token_version: 0 }],
      });

      await expect(verifyTokenPayload(token)).rejects.toThrow(
        "Tài khoản đã bị vô hiệu hóa"
      );
    });

    it("throws if token_version mismatch", async () => {
      const token = jwt.sign(
        { userId: "user-1", role: "teacher", first_login: false, tv: 0 },
        "test-secret-key-for-unit-tests"
      );
      mockedPool.query.mockResolvedValueOnce({
        rows: [{ is_active: true, token_version: 2 }],
      });

      await expect(verifyTokenPayload(token)).rejects.toThrow(
        "Phiên đăng nhập đã hết hạn"
      );
    });
  });
});
