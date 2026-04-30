import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './useAppStore';
import { refreshAuthFromStorage } from '@/store/authSlice';

const useAuth = () => {
  const dispatch = useAppDispatch();
  const { authenticated, userRole, accessToken, userName, userEmail } = useAppSelector(
    (state) => state.auth
  );

  useEffect(() => {
    const refresh = () => {
      dispatch(refreshAuthFromStorage());
    };

    window.addEventListener('storage', refresh);
    window.addEventListener('auth-change', refresh as EventListener);

    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('auth-change', refresh as EventListener);
    };
  }, [dispatch]);

  return {
    authenticated,
    userAuthority: userRole === 'admin' ? ['admin', 'user'] : ['user'],
    userRole,
    accessToken,
    userName,
    userEmail,
  };
};

export default useAuth;