import { useEffect, useState } from 'react';

const ACCESS_TOKEN_KEY = 'access_token';
const USER_ROLE_KEY = 'user_role';

// DB dùng 'teacher', admin/teacher → quyền admin trong FE
const resolveRole = (): 'admin' | 'user' => {
  const role = localStorage.getItem(USER_ROLE_KEY);
  if (role === 'admin' || role === 'teacher') return 'admin';
  return 'user';
};

const useAuth = () => {
  const [authenticated, setAuthenticated] = useState(
    () => Boolean(localStorage.getItem(ACCESS_TOKEN_KEY))
  );
  const [userRole, setUserRole] = useState<'admin' | 'user'>(resolveRole);

  useEffect(() => {
    const refresh = () => {
      setAuthenticated(Boolean(localStorage.getItem(ACCESS_TOKEN_KEY)));
      setUserRole(resolveRole());
    };

    window.addEventListener('storage', refresh);
    window.addEventListener('auth-change', refresh as EventListener);

    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('auth-change', refresh as EventListener);
    };
  }, []);

  return {
    authenticated,
    userAuthority: userRole === 'admin' ? ['admin', 'user'] : ['user'],
    userRole,
  };
};

export default useAuth;