import { AppShell } from '@mantine/core';
import { useLocation } from 'react-router-dom';
import Sidebar from '@/components/SideBar/SideBar';
import { NavbarNested } from '@/components/NavBar/NavbarNested';
import Views from '@/components/Layout/Views';

const DefaultLayout = () => {
  const { pathname } = useLocation();
  const isExamMode = pathname.startsWith('/exam/');

  if (isExamMode) {
    return (
      <AppShell padding={0}>
        <AppShell.Main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Views />
        </AppShell.Main>
      </AppShell>
    );
  }

  return (
    <AppShell
      navbar={{
        width: 260,
        breakpoint: 'md',
      }}
      header={{
        height: 60,
      }}
      padding="md"
    >
      <AppShell.Navbar style={{ display: 'flex', justifyContent: 'space-between' }}>
        <NavbarNested />
      </AppShell.Navbar>

      <AppShell.Header>
        <Sidebar />
      </AppShell.Header>

      <AppShell.Main style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
        <Views />
      </AppShell.Main>
    </AppShell>
  );
};
export default DefaultLayout;
