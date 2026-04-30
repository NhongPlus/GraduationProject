import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Title, Text, Paper, Stack,
  Tabs, Notification, Group, Badge, Divider, Alert,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { clearSession } from '@/services/authApi';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import InputPassword from '@/components/Input/InputPassword/InputPassword';

const Profile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const name = localStorage.getItem('user_name') || t('roles.user');
  const role = localStorage.getItem('user_role') || 'user';
  const roleLabel = t(`roles.${role}`, { defaultValue: role });
  const [email] = useState(localStorage.getItem('user_email') || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage(t('common.fill_required'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage(t('common.password_mismatch'));
      return;
    }
    // TODO: gọi API đổi mật khẩu khi BE có endpoint
    setMessage(t('common.change_password_soon'));
  };

  return (
    <Box className="max-w-[900px] mx-auto p-4">
      <Group justify="space-between" mb="xs">
        <Title order={2}>{t('profile.title')}</Title>
        <Badge color={role === 'admin' ? 'red' : role === 'teacher' ? 'blue' : 'green'}>
          {roleLabel}
        </Badge>
      </Group>
      <Text c="dimmed" mb="md">{t('profile.subtitle')}</Text>
      <Tabs defaultValue="profile" mt="md">
        <Tabs.List>
          <Tabs.Tab value="profile">{t('profile.tab_profile')}</Tabs.Tab>
          <Tabs.Tab value="settings">{t('profile.tab_settings')}</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="profile" pt="md">
          <Paper shadow="xs" withBorder p="md">
            <Stack gap="sm">
              <Text><strong>{t('profile.name')}:</strong> {name}</Text>
              <Text><strong>{t('profile.role')}:</strong> {roleLabel}</Text>
              <Text><strong>{t('profile.email')}:</strong> {email}</Text>
            </Stack>
            <Divider my="md" />
            <Text size="sm" c="dimmed">
              {t('profile.contact_admin_hint')}
            </Text>
            <ButtonFilled
              style={{ marginTop: 16 }}
              color="red"
              label={t('common.logout')}
              disabled={false}
              onClick={handleLogout}
            />
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="settings" pt="md">
          <Paper shadow="xs" withBorder p="md">
            <Stack gap="md">
              <Alert color="blue" variant="light">
                {t('profile.password_hint')}
              </Alert>
              {message && (
                <Notification color="blue" onClose={() => setMessage('')}>
                  {message}
                </Notification>
              )}
              <Title order={4}>{t('common.change_password')}</Title>
              <InputPassword
                label={t('common.password_current')}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.currentTarget.value)}
                fullWidth
              />
              <InputPassword
                label={t('common.password_new')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.currentTarget.value)}
                fullWidth
              />
              <InputPassword
                label={t('common.password_confirm')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                fullWidth
              />
              <ButtonFilled label={t('common.change_password')} disabled={false} onClick={handleChangePassword} />
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
};

export default Profile;