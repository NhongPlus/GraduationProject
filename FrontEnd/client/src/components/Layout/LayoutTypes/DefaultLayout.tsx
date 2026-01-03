import { Box, Flex, ScrollAreaAutosize, Stack } from '@mantine/core';
import classes from '@/components/Layout/LayoutTypes/DefaultLayout.module.scss';
// import { SideBarSmall } from '@/components/Menu/SideBarSmall/SideBarSmall';
import Login from '@/pages/auth/Login/Login';
import { SideBar } from '@/components/SideBar/SideBar';

const DefaultLayout = () => (
  <>
    <div className={classes.wrapper}>
      {/* <ScrollAreaAutosize scrollbars="y" h="100%" p={0}> */}
        <Stack className={classes.scrollArea} justify="space-between" p={0} gap={0}>
          <Stack w="100%" gap={0} p={0}>
            <SideBar />
            <Box className={classes.box} p={0}>
              <Login />
            </Box>
          </Stack>
        </Stack>
      {/* </ScrollAreaAutosize> */}
    </div>
  </>
);
export default DefaultLayout;
