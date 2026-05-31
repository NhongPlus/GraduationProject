import {
  Image,
  Box,
  Flex,
  Group,
  Text,
  Anchor
} from '@mantine/core';
import styles from './SideBar.module.scss';
import icon from '@/assets/logo/logo.svg'
import useAuth from '@/hooks/useAuth';
import ButtonFilled from '../Button/ButtonFilled/ButtonFilled';
import NotificationBell from '../common/NotificationBell';

export default function SideBar() {
  const { authenticated } = useAuth();

  return (
    <Box className={styles.wrapper}>
      <Flex justify={'space-between'} align={'center'}>
        {/* thẻ link */}
        <Anchor c="inherit" underline="never">
          <Group>
            <Image w={24} h={24} src={icon} />
            <Text fw={700} size="lg" c="inherit">
              NhongPlus
            </Text>
          </Group>
        </Anchor>
        <Group>
          <NotificationBell />
          {!authenticated && <ButtonFilled label={'Sign up'} disabled={false} />}
        </Group>
      </Flex>
    </Box>
  );
}