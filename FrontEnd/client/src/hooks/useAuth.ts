import { useMemo } from 'react';

const ACCESS_TOKEN_KEY = 'access_token';
// chủ yếu là lấy giá trị của access_token 
const useAuth = () => {
  const authenticated = useMemo(() => {
    return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
  }, []);

  return {
    authenticated,
    userAuthority: ['user'],
  };
};

export default useAuth;
