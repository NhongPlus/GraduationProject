import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Stack, Text, Title, Alert } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import appConfig from '@/configs/app.config';
import InputPassword from '@/components/Input/InputPassword/InputPassword';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import { changePassword } from '@/services/authApi';

const FIRST_LOGIN_KEY = 'first_login';

const ChangePasswordRequired = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userId = localStorage.getItem('user_id') ?? '';
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!currentPassword || !newPassword) {
      setError(t('first_login.missing_fields'));
      return;
    }
    if (newPassword.length < 8) {
      setError(t('first_login.min_length'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('first_login.mismatch'));
      return;
    }
    if (!userId) {
      setError(t('first_login.session_error'));
      return;
    }
    try {
      setLoading(true);
      await changePassword(userId, currentPassword, newPassword);
      localStorage.setItem(FIRST_LOGIN_KEY, 'false');
      navigate(appConfig.authenticatedEntryPath, { replace: true });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || t('first_login.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
      <Paper withBorder radius="md" p="xl" maw={440} w="100%">
        <Stack gap="md">
          <Title order={3}>{t('first_login.title')}</Title>
          <Text size="sm" c="dimmed">
            {t('first_login.description')}
          </Text>
          {error && (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          )}
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
            label={t('first_login.submit')}
            disabled={loading}
            onClick={() => void handleSubmit()}
            color="teal"
          />
        </Stack>
      </Paper>
    </Box>
  );
};

export default ChangePasswordRequired;
