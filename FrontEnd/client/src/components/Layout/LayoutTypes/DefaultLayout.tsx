import { AppShell } from '@mantine/core';
import { useLocation } from 'react-router-dom';
import Sidebar from '@/components/SideBar/SideBar';
import { NavbarNested } from '@/components/NavBar/NavbarNested';
import Views from '@/components/Layout/Views';
import { useState } from 'react';

const DefaultLayout = () => {
  const { pathname } = useLocation();
  const isExamMode = pathname.startsWith('/exam/');
  const [navbarCollapsed, setNavbarCollapsed] = useState(false);

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
        width: navbarCollapsed ? 72 : 260,
        /* md (~992px) khiến navbar chuyển overlay full-width rất sớm; xs chỉ ẩn sidebar dưới ~576px */
        breakpoint: 'xs',
      }}
      header={{
        height: 60,
      }}
      padding="md"
    >
      <AppShell.Navbar style={{ display: 'flex', justifyContent: 'space-between' }}>
        <NavbarNested collapsed={navbarCollapsed} onCollapsedChange={setNavbarCollapsed} />
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
