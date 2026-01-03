import { lazy, Suspense, useMemo } from 'react';
import Login from '../../pages/auth/Login/Login';
import DefaultLayout from './LayoutTypes/DefaultLayout';
import Dashboard from '@/pages/main/Dashboard/Dashboard';
import Sidebar from '@/components/sidebar/Sidebar';
import StatsSection from '../StatsSection/StatsSection';
import UpcomingExamsTable from '../UpcomingExamsTable/UpcomingExamsTable';
import PerformanceChart from '../PerformanceChart/PerformanceChart';
import RecentResults from '../RecentResults/RecentResults';
import QuickActions from '../QuickActions/QuickActions';
import { useDisclosure } from '@mantine/hooks';
import { AppShell, Box } from '@mantine/core';



export function Layout() {
   const [opened, { toggle }] = useDisclosure();
  // const AppLayout = useMemo(() => {
  //   if (authenticated) { // đăng nhập ròi 
  //     return lazy(() => import('./LayoutTypes/DefaultLayout'));
  //   }
  //   return lazy(() => import('./AuthLayout'));
  // }, [authenticated]);

  return (
    // <Suspense
    //   fallback={
    //     <div className="flex flex-auto flex-col h-[100vh]">
    //       <LoadingScreen />
    //     </div>
    //   }
    // >
    // <AppLayout />
    // </Suspense>
   <AppShell
      navbar={{
        width: 260,
        breakpoint: 'md',
        collapsed: { mobile: !opened },
      }}
      header={{
        height: 60,
      }}
      padding="md"
    >
      {/* SIDEBAR */}
      <AppShell.Navbar>
      </AppShell.Navbar>

      {/* MOBILE HEADER */}
      <AppShell.Header>
          <Sidebar />
      </AppShell.Header>

      {/* MAIN CONTENT */}
      <AppShell.Main>
        <Box className="max-w-[1400px] mx-auto flex flex-col gap-6">
          <StatsSection />

          {/* 3️⃣ Content */}
          <Box className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* LEFT */}
            <Box className="xl:col-span-2 flex flex-col gap-6">
              <UpcomingExamsTable />
              <PerformanceChart />
            </Box>

            {/* RIGHT */}
            <Box className="flex flex-col gap-6">
              <RecentResults />
              <QuickActions />
            </Box>
          </Box>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
