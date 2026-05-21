import { lazy, Suspense, useMemo } from 'react';
import LoadingScreen from '@/components/LoadingScreen/LoadingScreen';
import useAuth from '@/hooks/useAuth';
import useLocale from '@/hooks/useLocale';

export function Layout() {
  const { authenticated } = useAuth();
  useLocale();

  // useMemo
  /*
    Theo như cơ bản thì nếu mà AppLayout thay đổi thì sẽ tính toán lại giá trị => 
    sd useMemo => AppLayout thay đổi khi mà authenticated thay đổi
  */
  const AppLayout = useMemo(() => {
    if (authenticated) {
      return lazy(() => import('./LayoutTypes/DefaultLayout'));
    }
    return lazy(() => import('./AuthLayout'));
  }, [authenticated]);

  return (
      <Suspense
        fallback={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw' }}>
            <LoadingScreen />
          </div>
        }
      >
        <AppLayout />
      </Suspense>
  );
}
