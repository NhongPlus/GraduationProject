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
const appConfig: AppConfig = {
  layoutType: LayoutTypes.SimpleSideBar,
  apiURL: import.meta.env.VITE_API_URL || (
    window.location.hostname === 'localhost'
      ? 'http://localhost:5000'
      : 'https://api.nhongplus.id.vn'
  ),
  apiPrefix: '/v1',
  authenticatedEntryPath: '/main',
  unAuthenticatedEntryPath: '/login',
  enableMock: false,
  locale: 'vi',
};

export default appConfig;