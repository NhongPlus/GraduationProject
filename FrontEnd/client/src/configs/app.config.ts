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
	apiURL: '',
	apiPrefix: '',
	authenticatedEntryPath: '/dashboard',
	unAuthenticatedEntryPath: '/login',
	enableMock: false,
	locale: 'vi',
};

export default appConfig;
