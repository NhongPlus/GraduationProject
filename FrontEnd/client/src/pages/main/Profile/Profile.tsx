import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Title, Text, Paper, Stack,
  Tabs, Notification, Group, Badge, Divider, Alert,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { clearSession, submitMyPasswordResetRequest } from '@/services/authApi';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';

const Profile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const name = localStorage.getItem('user_name') || t('roles.user');
  const role = localStorage.getItem('user_role') || 'user';
  const roleLabel = t(`roles.${role}`, { defaultValue: role });
  const [email] = useState(localStorage.getItem('user_email') || '');
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleLogout = async () => {
    await clearSession();
    navigate('/login', { replace: true });
  };

  const handleRequestPasswordReset = async () => {
    if (!window.confirm(t('profile.reset_request_confirm'))) return;
    try {
      setSubmitting(true);
      setMessage('');
      setMessageIsError(false);
      const { message: okMsg } = await submitMyPasswordResetRequest();
      setMessage(okMsg);
      setMessageIsError(false);
    } catch (e: unknown) {
      const apiMsg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessage(apiMsg || t('profile.reset_request_error'));
      setMessageIsError(true);
    } finally {
      setSubmitting(false);
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
                {t('profile.reset_request_desc')}
              </Alert>
              {message && (
                <Notification color={messageIsError ? 'red' : 'teal'} onClose={() => setMessage('')}>
                  {message}
                </Notification>
              )}
              <Title order={4}>{t('profile.reset_request_title')}</Title>
              <Text size="sm" c="dimmed">{t('profile.reset_request_hint')}</Text>
              <ButtonFilled
                label={t('profile.reset_request_submit')}
                disabled={submitting}
                onClick={() => void handleRequestPasswordReset()}
              />
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
};

export default Profile;
