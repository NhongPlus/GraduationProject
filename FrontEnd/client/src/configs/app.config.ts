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
/** Dev fallback only. Production builds must set `VITE_API_URL` on the host to the real API (never localhost). */
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