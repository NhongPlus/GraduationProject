import { type ReactNode } from 'react';

export type AuthorityGuardProps = {
  authority?: string[];
  userAuthority?: string[] | string;
  children: ReactNode;
};

const normalizeAuthority = (authority?: string[] | string) => {
  if (!authority) {
    return [];
  }
  return Array.isArray(authority) ? authority : [authority];
};

const AuthorityGuard = ({ authority, userAuthority, children }: AuthorityGuardProps) => {
  const required = normalizeAuthority(authority);
  if (required.length === 0) {
    return <>{children}</>;
  }

  const userRoles = normalizeAuthority(userAuthority);
  const isAllowed = required.some((role) => userRoles.includes(role));

  return isAllowed ? <>{children}</> : null;
};

export default AuthorityGuard;
