import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import apiClient from '@/services/apiClient';
import useAuth from '@/hooks/useAuth';
import { connectAuthSessionSocket } from '@/services/authSessionSocket';

/** Dự phòng nếu socket chưa kết nối — vẫn phát hiện phiên bị thu hồi trong vài giây. */
const SESSION_CHECK_MS = 5_000;

/**
 * Giữ một phiên / trình duyệt: socket đẩy logout ngay; HTTP poll dự phòng.
 */
export function useSessionGuard(): void {
  const { authenticated, accessToken } = useAuth();

  useEffect(() => {
    if (!authenticated || !accessToken) return;

    let socket: Socket | null = connectAuthSessionSocket(accessToken);

    const check = () => {
      void apiClient.get('/auth/session').catch(() => {
        /* 401 → apiClient interceptor */
      });
    };

    check();

    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    const onFocus = () => check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(check, SESSION_CHECK_MS);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.clearInterval(timer);
      socket?.close();
      socket = null;
    };
  }, [authenticated, accessToken]);
}
