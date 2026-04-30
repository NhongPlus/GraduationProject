import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import appConfig from '@/configs/app.config';

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

// Xử lý 401 → redirect về login
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_name');
      localStorage.removeItem('user_email');
      window.dispatchEvent(new Event('auth-change'));
    }
    return Promise.reject(error);
  }
);

export default apiClient;