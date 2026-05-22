import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import appConfig from '@/configs/app.config';
import { clearClientSession } from '@/services/clearClientSession';

const ACCESS_TOKEN_KEY = 'access_token';

const apiClient = axios.create({
  baseURL: `${appConfig.apiURL}${appConfig.apiPrefix}`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Tự động đính token vào mỗi request
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

function shouldRedirectOn401(url: string | undefined): boolean {
  if (!url) return true;
  if (url.includes('/auth/login')) return false;
  const path = window.location.pathname;
  return !path.startsWith('/login');
}

// Xử lý 401 → xóa session đầy đủ (kể cả redux-persist) và về trang đăng nhập
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      const message =
        (error.response?.data as { message?: string } | undefined)?.message ?? '';
      const revokedElsewhere = message.includes('thiết bị khác');
      await clearClientSession();
      if (shouldRedirectOn401(error.config?.url)) {
        const qs = revokedElsewhere ? '?session=revoked' : '';
        window.location.replace(`/login${qs}`);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;