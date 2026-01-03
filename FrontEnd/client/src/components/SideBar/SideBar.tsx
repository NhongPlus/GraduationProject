import {
  Image,
  Box,
  Flex,
  Group,
  Text,
  Anchor
} from '@mantine/core';
import styles from './SideBar.module.scss';
import ButtonBase, { SecondaryButton } from '../Button/ButtonBase/ButtonBase';
import icon from '@/assets/logo/logo.svg'
import LanguageSwitcher from '../SwitchLanguage/LanguageSwitcher';

export default function SideBar() {
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
          <SecondaryButton label={'Contact Support'} color='#0D141B' />
          <ButtonBase label={'Sign up'} />
        </Group>
      </Flex>
    </Box>
  );
}