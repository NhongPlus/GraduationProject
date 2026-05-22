import { useEffect } from 'react';
import apiClient from '@/services/apiClient';
import useAuth from '@/hooks/useAuth';

const SESSION_CHECK_MS = 60_000;

/**
 * Xác thực phiên với server định kỳ — tab/trình duyệt cũ nhận 401 khi đăng nhập nơi khác.
 */
export function useSessionGuard(): void {
  const { authenticated } = useAuth();

  useEffect(() => {
    if (!authenticated) return;

    const check = () => {
      void apiClient.get('/auth/session').catch(() => {
        /* 401 → apiClient interceptor xóa session và chuyển /login */
      });
    };

    check();

    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(check, SESSION_CHECK_MS);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [authenticated]);
}
