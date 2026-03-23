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
import LanguageSwitcher from '../SwitchLanguage/LanguageSwitcher';
import ButtonFilled from '../Button/ButtonFilled/ButtonFilled';
import useAuth from '@/hooks/useAuth';

export default function SideBar() {
  const { authenticated } = useAuth();

  return (
    <Box className={styles.wrapper}>
      <Flex justify={'space-between'} align={'center'}>
        {/* thẻ link */}
        <Anchor c={'black'} underline='never'>
          <Group>
            <Image
              w={24}
              h={24}
              src={icon}
            />
            <Text fw={700} size='lg'>NhongPlus</Text>
          </Group>
        </Anchor>
        <Group>
          <LanguageSwitcher/>
          {!authenticated && <ButtonFilled label={'Sign up'} disabled={false} />}
        </Group>
      </Flex>
    </Box>
  );
}