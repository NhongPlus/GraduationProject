import { createSlice } from '@reduxjs/toolkit';

export type FrontendRole = 'admin' | 'user';

type AuthState = {
  authenticated: boolean;
  userRole: FrontendRole;
  accessToken: string | null;
  userName: string | null;
  userEmail: string | null;
};

const ACCESS_TOKEN_KEY = 'access_token';
const USER_ROLE_KEY = 'user_role';
const USER_NAME_KEY = 'user_name';
const USER_EMAIL_KEY = 'user_email';

function resolveRoleFromStorage(): FrontendRole {
  const role = localStorage.getItem(USER_ROLE_KEY);
  if (role === 'admin') return 'admin';
  return 'user';
}

function readAuthStateFromStorage(): AuthState {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  return {
    authenticated: Boolean(accessToken),
    userRole: resolveRoleFromStorage(),
    accessToken,
    userName: localStorage.getItem(USER_NAME_KEY),
    userEmail: localStorage.getItem(USER_EMAIL_KEY),
  };
}

const initialState: AuthState = readAuthStateFromStorage();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    refreshAuthFromStorage: () => readAuthStateFromStorage(),
    clearAuthState: () => ({
      authenticated: false,
      userRole: 'user' as FrontendRole,
      accessToken: null,
      userName: null,
      userEmail: null,
    }),
  },
});

export const { refreshAuthFromStorage, clearAuthState } = authSlice.actions;
export default authSlice.reducer;
