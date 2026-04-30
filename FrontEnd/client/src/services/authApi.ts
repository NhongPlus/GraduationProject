import apiClient from './apiClient';

export type UserRole = 'admin' | 'teacher' | 'student';

export interface UserInfo {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  token: string;
  user: UserInfo;
  deviceId: string;
  hasExistingSession: boolean;
}

const ACCESS_TOKEN_KEY = 'access_token';
const DEVICE_ID_KEY = 'device_id';

export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

export const login = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  const deviceId = getDeviceId();
  const deviceInfo = navigator.userAgent;
  const res = await apiClient.post<{ success: boolean; data: LoginResponse }>(
    '/auth/login',
    { email, password, device_id: deviceId, device_info: deviceInfo }
  );
  return res.data.data;
};

/**
 * Chỉ gọi khi đã đăng nhập **admin** (token gắn tự động).
 * Sinh viên / giảng viên không tự đăng ký qua UI — tài khoản do admin tạo.
 */
export const registerUserAsAdmin = async (
  email: string,
  username: string,
  password: string,
  role: UserRole,
  full_name?: string
): Promise<UserInfo> => {
  const res = await apiClient.post<{ success: boolean; data: UserInfo }>(
    '/auth/register',
    { email, username, password, role, full_name }
  );
  return res.data.data;
};

export const saveSession = (token: string, user: UserInfo) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  localStorage.setItem('user_role', user.role);
  localStorage.setItem('user_name', user.full_name || user.username);
  localStorage.setItem('user_email', user.email);
  window.dispatchEvent(new Event('auth-change'));
};

export const clearSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_name');
  localStorage.removeItem('user_email');
  window.dispatchEvent(new Event('auth-change'));
};