import { lazy } from 'react';
import authRoute from './authRoute';
import type { Routes } from '@/@types/routes';

export const publicRoutes: Routes = [...authRoute];

export const protectedRoutes: Routes = [
  {
    key: 'dashboard',
    path: '/dashboard',
    component: lazy(() => import('@/pages/main/Dashboard/Dashboard')),
    authority: ['user'],
  },
];
