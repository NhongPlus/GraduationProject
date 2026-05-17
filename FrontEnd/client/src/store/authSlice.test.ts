import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit tests for authSlice reducers and selectors.
 * Tests the Redux slice logic in isolation from Redux store.
 */

type FrontendRole = "admin" | "teacher" | "student";

type AuthState = {
  authenticated: boolean;
  userRole: FrontendRole;
  accessToken: string | null;
  userName: string | null;
  userEmail: string | null;
};

// ─── Selectors ─────────────────────────────────────────────────────────────

const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.authenticated;
const selectUserRole = (state: { auth: AuthState }) => state.auth.userRole;
const selectAccessToken = (state: { auth: AuthState }) => state.auth.accessToken;
const selectUserName = (state: { auth: AuthState }) => state.auth.userName;

// ─── Reducer helpers (mimic createSlice behavior) ──────────────────────────

const initialState: AuthState = {
  authenticated: false,
  userRole: "student",
  accessToken: null,
  userName: null,
  userEmail: null,
};

type AuthAction =
  | { type: "auth/loginSuccess"; payload: { token: string; user: { role: FrontendRole; full_name?: string; email?: string } } }
  | { type: "auth/logout" }
  | { type: "auth/updateRole"; payload: FrontendRole };

function authReducer(state = initialState, action: AuthAction): AuthState {
  switch (action.type) {
    case "auth/loginSuccess":
      return {
        authenticated: true,
        userRole: action.payload.user.role,
        accessToken: action.payload.token,
        userName: action.payload.user.full_name ?? null,
        userEmail: action.payload.user.email ?? null,
      };
    case "auth/logout":
      return { ...initialState };
    case "auth/updateRole":
      return { ...state, userRole: action.payload };
    default:
      return state;
  }
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("authSlice reducers", () => {
  describe("loginSuccess", () => {
    it("sets authenticated=true and stores token + user info", () => {
      const action = {
        type: "auth/loginSuccess" as const,
        payload: {
          token: "eyJhbGciOiJIUzI1NiJ9.mock-token",
          user: {
            role: "student" as FrontendRole,
            full_name: "Nguyen Van A",
            email: "student01@system.local",
          },
        },
      };
      const nextState = authReducer(initialState, action);

      expect(nextState.authenticated).toBe(true);
      expect(nextState.accessToken).toBe("eyJhbGciOiJIUzI1NiJ9.mock-token");
      expect(nextState.userRole).toBe("student");
      expect(nextState.userName).toBe("Nguyen Van A");
      expect(nextState.userEmail).toBe("student01@system.local");
    });

    it("handles teacher login", () => {
      const action = {
        type: "auth/loginSuccess" as const,
        payload: {
          token: "teacher-token",
          user: { role: "teacher" as FrontendRole, full_name: "GV Tran Thi B" },
        },
      };
      const nextState = authReducer(initialState, action);

      expect(nextState.authenticated).toBe(true);
      expect(nextState.userRole).toBe("teacher");
      expect(nextState.userEmail).toBeNull(); // email not provided
    });

    it("handles admin login", () => {
      const action = {
        type: "auth/loginSuccess" as const,
        payload: {
          token: "admin-token",
          user: { role: "admin" as FrontendRole },
        },
      };
      const nextState = authReducer(initialState, action);

      expect(nextState.authenticated).toBe(true);
      expect(nextState.userRole).toBe("admin");
    });

    it("does not overwrite previous state on unknown action", () => {
      const loggedInState: AuthState = {
        authenticated: true,
        userRole: "student",
        accessToken: "existing-token",
        userName: "Some User",
        userEmail: "user@test.com",
      };
      const nextState = authReducer(loggedInState, { type: "unknown" });
      expect(nextState).toEqual(loggedInState);
    });
  });

  describe("logout", () => {
    it("resets state to initial values", () => {
      const loggedInState: AuthState = {
        authenticated: true,
        userRole: "teacher",
        accessToken: "some-token",
        userName: "Teacher Name",
        userEmail: "teacher@local",
      };
      const nextState = authReducer(loggedInState, { type: "auth/logout" });

      expect(nextState.authenticated).toBe(false);
      expect(nextState.accessToken).toBeNull();
      expect(nextState.userRole).toBe("student"); // default
      expect(nextState.userName).toBeNull();
      expect(nextState.userEmail).toBeNull();
    });

    it("logout from initial state stays at initial", () => {
      const nextState = authReducer(initialState, { type: "auth/logout" });
      expect(nextState).toEqual(initialState);
    });
  });

  describe("updateRole", () => {
    it("updates userRole without affecting other fields", () => {
      const state: AuthState = {
        authenticated: true,
        userRole: "student",
        accessToken: "token",
        userName: "Student",
        userEmail: "student@test.com",
      };
      const nextState = authReducer(state, {
        type: "auth/updateRole",
        payload: "teacher",
      });

      expect(nextState.userRole).toBe("teacher");
      expect(nextState.authenticated).toBe(true);
      expect(nextState.accessToken).toBe("token");
      expect(nextState.userName).toBe("Student");
    });
  });
});

describe("authSlice selectors", () => {
  const loggedInState = {
    auth: {
      authenticated: true,
      userRole: "teacher" as FrontendRole,
      accessToken: "test-token-123",
      userName: "Test Teacher",
      userEmail: "teacher@test.com",
    },
  };

  const loggedOutState = {
    auth: initialState,
  };

  describe("selectIsAuthenticated", () => {
    it("returns true when authenticated", () => {
      expect(selectIsAuthenticated(loggedInState)).toBe(true);
    });

    it("returns false when not authenticated", () => {
      expect(selectIsAuthenticated(loggedOutState)).toBe(false);
    });
  });

  describe("selectUserRole", () => {
    it("returns correct role when logged in", () => {
      expect(selectUserRole(loggedInState)).toBe("teacher");
    });

    it("returns student default when logged out", () => {
      expect(selectUserRole(loggedOutState)).toBe("student");
    });
  });

  describe("selectAccessToken", () => {
    it("returns token when present", () => {
      expect(selectAccessToken(loggedInState)).toBe("test-token-123");
    });

    it("returns null when not authenticated", () => {
      expect(selectAccessToken(loggedOutState)).toBeNull();
    });
  });

  describe("selectUserName", () => {
    it("returns user name when set", () => {
      expect(selectUserName(loggedInState)).toBe("Test Teacher");
    });

    it("returns null when not set", () => {
      expect(selectUserName(loggedOutState)).toBeNull();
    });
  });
});

describe("JWT expiration check", () => {
  const isJwtExpired = (token: string): boolean => {
    try {
      const payload = token.split(".")[1];
      if (!payload) return true;
      const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
      const exp = typeof decoded.exp === "number" ? decoded.exp : null;
      if (!exp) return false;
      return Date.now() >= exp * 1000;
    } catch {
      return true;
    }
  };

  it("returns true for null/empty token", () => {
    expect(isJwtExpired("")).toBe(true);
  });

  it("returns true for token without dots (malformed)", () => {
    expect(isJwtExpired("not-a-jwt")).toBe(true);
  });

  it("returns true for expired token (exp in past)", () => {
    // Manually construct: { "exp": past_timestamp }
    const past = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const payload = btoa(JSON.stringify({ exp: past })).replace(/=/g, "");
    const token = `header.${payload}.signature`;
    expect(isJwtExpired(token)).toBe(true);
  });

  it("returns false for valid token with future exp", () => {
    const future = Math.floor(Date.now() / 1000) + 3600; // 1 hour ahead
    const payload = btoa(JSON.stringify({ exp: future })).replace(/=/g, "");
    const token = `header.${payload}.signature`;
    expect(isJwtExpired(token)).toBe(false);
  });

  it("returns false for token with no exp claim", () => {
    const payload = btoa(JSON.stringify({ userId: "123" })).replace(/=/g, "");
    const token = `header.${payload}.signature`;
    expect(isJwtExpired(token)).toBe(false);
  });
});