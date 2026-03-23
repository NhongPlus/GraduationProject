import { useEffect, useState } from 'react';

const ACCESS_TOKEN_KEY = 'access_token';
const USER_ROLE_KEY = 'user_role';

const resolveRole = (): 'admin' | 'user' => {
  const role = localStorage.getItem(USER_ROLE_KEY);
  if (role === 'admin' || role === 'teacher') return 'admin';
  return 'user';
};

const useAuth = () => {
  const [authenticated, setAuthenticated] = useState(() => Boolean(localStorage.getItem(ACCESS_TOKEN_KEY)));
  const [userRole, setUserRole] = useState<'admin' | 'user'>(resolveRole);

  useEffect(() => {
    const refresh = () => {
      setAuthenticated(Boolean(localStorage.getItem(ACCESS_TOKEN_KEY)));
      setUserRole(resolveRole());
    };

    window.addEventListener('storage', refresh);

    // Tiền xử lý cho những hành động cùng tab (dispatch thủ công)
    const custom = () => refresh();
    window.addEventListener('auth-change', custom as EventListener);

    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('auth-change', custom as EventListener);
    };
  }, []);

  return {
    authenticated,
    userAuthority: userRole === 'admin' ? ['admin', 'user'] : ['user'],
    userRole,
  };
};

export default useAuth;
