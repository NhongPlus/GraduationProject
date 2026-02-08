import { AppShell } from '@mantine/core';
import Sidebar from '@/components/SideBar/SideBar';
import { NavbarNested } from '@/components/NavBar/NavBarNested';
import Views from '@/components/Layout/Views';

const DefaultLayout = () => (
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

    <AppShell.Main>
      <Views />
    </AppShell.Main>
  </AppShell>
);
export default DefaultLayout;
