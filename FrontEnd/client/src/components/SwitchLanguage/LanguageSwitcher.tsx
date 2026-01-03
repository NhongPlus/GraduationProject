import { useLanguage } from '@/hooks/useLanguage';
import { Menu, Group, Text } from '@mantine/core';
import ButtonBase from '../Button/ButtonBase/ButtonBase';

const LANGS = {
  en: { label: 'English', flag: '🇺🇸' },
  vi: { label: 'Tiếng Việt', flag: '🇻🇳' },
  ja: { label: '日本語', flag: '🇯🇵' },
};

function LanguageSwitcher() {
  const { language, changeLanguage } = useLanguage();

  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <ButtonBase
          label={`${LANGS[language].flag} ${LANGS[language].label}`}
        />
      </Menu.Target>

      <Menu.Dropdown>
        {(Object.keys(LANGS) as Array<keyof typeof LANGS>).map((lang) => (
          <Menu.Item
            key={lang}
            onClick={() => changeLanguage(lang)}
          >
            <Group gap="sm">
              <Text>{LANGS[lang].flag}</Text>
              <Text>{LANGS[lang].label}</Text>
            </Group>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

export default LanguageSwitcher;
