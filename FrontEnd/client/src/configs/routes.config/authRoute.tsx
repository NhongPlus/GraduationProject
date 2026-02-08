import { lazy } from 'react';
import type { Routes } from '@/@types/routes';

const authRoute: Routes = [
  {
    key: 'login',
    path: '/login',
    component: lazy(() => import('@/pages/auth/Login/Login')),
    authority: [],
  },
];

export default authRoute;
