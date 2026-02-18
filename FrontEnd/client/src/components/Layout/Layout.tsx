import { lazy, Suspense, useMemo } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  QueryErrorResetBoundary,
} from '@tanstack/react-query';
import LoadingScreen from '@/components/LoadingScreen/LoadingScreen';
import useAuth from '@/hooks/useAuth';
import useLocale from '@/hooks/useLocale';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export function Layout() {
  const { authenticated } = useAuth();

  useLocale();

  const AppLayout = useMemo(() => {
    if (authenticated) {
      return lazy(() => import('./LayoutTypes/DefaultLayout'));
    }
    return lazy(() => import('./AuthLayout'));
  }, [authenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      <QueryErrorResetBoundary>
        {() => (
          <Suspense
            fallback={
              <div className="flex flex-auto flex-col h-[100vh]">
                <LoadingScreen />
              </div>
            }
          >
            <AppLayout />
          </Suspense>
        )}
      </QueryErrorResetBoundary>
    </QueryClientProvider>
  );
}
