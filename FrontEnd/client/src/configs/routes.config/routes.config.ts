import { lazy } from 'react';
import authRoute from './authRoute';
import type { Routes } from '@/@types/routes';

export const publicRoutes: Routes = [...authRoute];

export const protectedRoutes: Routes = [
  {
    key: 'main',
    path: '/main',
    component: lazy(() => import('@/pages/main/Dashboard/Dashboard')),
    authority: ['user', 'admin'],
  },
  {
    key: 'exam-list',
    path: '/exams',
    component: lazy(() => import('@/pages/main/Exam/ExamList')),
    authority: ['user', 'admin'],
  },
  {
    key: 'exam-authoring',
    path: '/exams/new',
    component: lazy(() => import('@/pages/main/Exam/ExamAuthoring')),
    authority: ['admin'],
  },
  {
    key: 'exam-authoring-edit',
    path: '/exams/:examId/edit',
    component: lazy(() => import('@/pages/main/Exam/ExamAuthoring')),
    authority: ['admin'],
  },
  {
    key: 'exam-take',
    path: '/exam/:examId',
    component: lazy(() => import('@/pages/main/Exam/ExamTake')),
    authority: ['user', 'admin'],
  },
  {
    key: 'exam-result',
    path: '/result/:examId',
    component: lazy(() => import('@/pages/main/Exam/ExamResult')),
    authority: ['user', 'admin'],
  },
  {
    key: 'prediction',
    path: '/prediction',
    component: lazy(() => import('@/pages/main/Exam/Prediction')),
    authority: ['user', 'admin'],
  },
  {
    key: 'my-results',
    path: '/my-results',
    component: lazy(() => import('@/pages/main/Exam/MyResults')),
    authority: ['user', 'admin'],
  },
  {
    key: 'profile',
    path: '/profile',
    component: lazy(() => import('@/pages/main/Profile/Profile')),
    authority: ['user', 'admin'],
  },
  {
    key: 'student-management',
    path: '/admin/students',
    component: lazy(() => import('@/pages/main/Admin/StudentManagement')),
    authority: ['admin'],
  },
];
