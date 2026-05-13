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
/** Production API when no `VITE_API_URL`. Dev server (`vite`) uses localhost unless overridden. */
const DEFAULT_PRODUCTION_API_URL = 'https://api.nhongplus.id.vn';

function resolveApiUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (typeof raw === 'string' && raw.trim() !== '') {
    return raw.trim().replace(/\/+$/, '');
  }
  // Chỉ bundle production (`vite build`) dùng API public; dev server / vitest → localhost.
  return import.meta.env.PROD ? DEFAULT_PRODUCTION_API_URL : 'http://localhost:5000';
}

const appConfig: AppConfig = {
  layoutType: LayoutTypes.SimpleSideBar,
  apiURL: resolveApiUrl(),
  apiPrefix: '/v1',
  authenticatedEntryPath: '/main',
  unAuthenticatedEntryPath: '/login',
  enableMock: false,
  locale: 'vi',
};

export default appConfig;