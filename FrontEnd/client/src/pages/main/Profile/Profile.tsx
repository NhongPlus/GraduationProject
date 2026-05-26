import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Title, Text, Paper, Stack,
  Notification, Group, Badge, Divider,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { clearSession, changePassword } from '@/services/authApi';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import InputPassword from '@/components/Input/InputPassword/InputPassword';

const Profile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const name = localStorage.getItem('user_name') || t('roles.user');
  const role = localStorage.getItem('user_role') || 'user';
  const userId = localStorage.getItem('user_id') ?? '';
  const roleLabel = t(`roles.${role}`, { defaultValue: role });
  const [email] = useState(localStorage.getItem('user_email') || '');
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);

  const isAdmin = role === 'admin';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleLogout = async () => {
    await clearSession();
    navigate('/login', { replace: true });
  };

  const handleChangePassword = async () => {
    setMessage('');
    setMessageIsError(false);
    if (!currentPassword || !newPassword) {
      setMessage(t('profile.change_password_missing'));
      setMessageIsError(true);
      return;
    }
    if (newPassword.length < 8) {
      setMessage(t('profile.password_min_length'));
      setMessageIsError(true);
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage(t('profile.change_password_mismatch'));
      setMessageIsError(true);
      return;
    }
    if (!userId) {
      setMessage(t('first_login.session_error'));
      setMessageIsError(true);
      return;
    }
    try {
      setChangingPassword(true);
      await changePassword(userId, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage(t('profile.password_changed'));
      setMessageIsError(false);
    } catch (e: unknown) {
      const apiMsg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessage(apiMsg || t('profile.change_password_error'));
      setMessageIsError(true);
    } finally {
      setChangingPassword(false);
    }
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

      <Paper shadow="xs" withBorder p="md" mt="md">
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

      {isAdmin && (
        <Paper shadow="xs" withBorder p="md" mt="md">
          <Stack gap="md">
            {message && (
              <Notification color={messageIsError ? 'red' : 'teal'} onClose={() => setMessage('')}>
                {message}
              </Notification>
            )}

            <Title order={4}>{t('profile.change_password_title')}</Title>
            <Text size="sm" c="dimmed">{t('profile.admin_change_desc')}</Text>
            <Text size="sm" c="dimmed">{t('profile.password_hint')}</Text>
            <InputPassword
              label={t('first_login.current_password')}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.currentTarget.value)}
            />
            <InputPassword
              label={t('first_login.new_password')}
              value={newPassword}
              onChange={(e) => setNewPassword(e.currentTarget.value)}
            />
            <InputPassword
              label={t('first_login.confirm_password')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.currentTarget.value)}
            />
            <ButtonFilled
              label={t('profile.change_password_submit')}
              disabled={changingPassword}
              onClick={() => void handleChangePassword()}
            />
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default Profile;
