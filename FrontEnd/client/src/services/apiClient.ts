import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import appConfig from '@/configs/app.config';
import { kickToLogin } from '@/services/kickToLogin';

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
    if (error.response?.status === 401) {
      const url = error.config?.url ?? '';
      const message =
        (error.response?.data as { message?: string } | undefined)?.message ?? '';
      const revokedElsewhere = message.includes('thiết bị khác');
      if (!url.includes('/auth/login')) {
        await kickToLogin(revokedElsewhere);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;