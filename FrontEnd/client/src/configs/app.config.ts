import { LayoutTypes } from '@/@types/layout';

export type AppConfig = {
  apiPrefix: string;
  apiURL: string;
  authenticatedEntryPath: string;
  unAuthenticatedEntryPath: string;
  enableMock: boolean;
  locale: string;
  layoutType: LayoutTypes;
};
// import.meta.env.VITE_API_URL ||
const appConfig: AppConfig = {
  layoutType: LayoutTypes.SimpleSideBar,
  apiURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  apiPrefix: '/v1',
  authenticatedEntryPath: '/main',
  unAuthenticatedEntryPath: '/login',
  enableMock: false,
  locale: 'vi',
};

export default appConfig;