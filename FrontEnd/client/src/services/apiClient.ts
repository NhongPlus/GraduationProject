import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import appConfig from '@/configs/app.config';
import { kickToLogin } from '@/services/kickToLogin';
import { redirectToPasswordChange } from '@/services/redirectToPasswordChange';

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

// Xử lý 401 → xóa session đầy đủ (kể cả redux-persist) và về trang đăng nhập
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const url = error.config?.url ?? '';
    const body = error.response?.data as { code?: string; message?: string } | undefined;

    if (error.response?.status === 403 && body?.code === 'PASSWORD_CHANGE_REQUIRED') {
      redirectToPasswordChange();
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      const message = body?.message ?? '';
      const revokedElsewhere = message.includes('thiết bị khác');
      if (!url.includes('/auth/login')) {
        await kickToLogin(revokedElsewhere);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;