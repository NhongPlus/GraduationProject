import {
  SimpleGrid,
  Paper,
  Flex,
  BackgroundImage,
  Center,
  Text,
  Title,
  Box,
  Anchor,
  Alert,
  Modal,
  Stack,
} from '@mantine/core';
import { Carousel } from '@mantine/carousel';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import image from '@/assets/img/login.jpg';
import classes from './Login.module.scss';
import appConfig from '@/configs/app.config';
import { login, saveSession, forgotPassword as forgotPasswordApi, resetPassword as resetPasswordApi } from '@/services/authApi';
import InputText from '@/components/Input/InputText/InputText';
import InputPassword from '@/components/Input/InputPassword/InputPassword';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import { useAppDispatch } from '@/hooks/useAppStore';
import { refreshAuthFromStorage } from '@/store/authSlice';

function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotOpened, setForgotOpened] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [forgotMsg, setForgotMsg] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t('login.missing_fields'));
      return;
    }
    try {
      setLoading(true);
      setError('');
      setWarning('');
      const result = await login(email, password);
      if (!result?.token || !result?.user?.id) {
        setError(t('login.login_failed'));
        return;
      }
      if (result.hasExistingSession) {
        setWarning(t('login.session_revoked_warning'));
      }
      saveSession(result.token, result.user);
      dispatch(refreshAuthFromStorage());
      navigate(appConfig.authenticatedEntryPath, { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      const msg =
        axiosErr?.response?.status === 401 && axiosErr?.response?.data?.message
          ? axiosErr.response.data.message
          : (typeof err === 'object' &&
              err !== null &&
              'response' in err &&
              typeof (err as { response?: { data?: { message?: string } } }).response
                ?.data?.message === 'string' &&
              (err as { response?: { data?: { message?: string } } }).response?.data
                ?.message) ||
            t('login.login_failed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') handleLogin();
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      setForgotStatus('error');
      setForgotMsg(t('login.forgot_email_required'));
      return;
    }
    setForgotStatus('loading');
    setForgotMsg('');
    try {
      const result = await forgotPasswordApi(forgotEmail);
      setForgotStatus('success');
      setForgotMsg(result.message || t('login.forgot_success'));
    } catch (err: unknown) {
      setForgotStatus('error');
      const axiosErr = err as { response?: { data?: { message?: string; error?: string } } };
      setForgotMsg(
        axiosErr?.response?.data?.message ||
        axiosErr?.response?.data?.error ||
        t('login.forgot_failed')
      );
    }
  };

  return (
    <Center>
      <Paper shadow="md" mt="6%" radius="xl" maw={1100}>
        <SimpleGrid cols={2} h="100%">
          <Flex align="center" justify="center" py={24}>
            <Box w="100%" maw={400} onKeyDown={handleKeyDown} tabIndex={0}>
              <Flex gap={12} my={36} direction="column">
                <Title order={1} size="h1">{t('login.title')}</Title>
                <Text>{t('login.subtitle')}</Text>
              </Flex>
              <Flex gap={12} direction="column" mb={24}>
                <InputText
                  label={t('login.email')}
                  placeholder={t('login.email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  required
                />
                <InputPassword
                  label={t('login.password')}
                  placeholder={t('login.password_placeholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  required
                />
              </Flex>

              {error && (
                <Text color="red" size="sm" mb={8}>{error}</Text>
              )}

              {warning && (
                <Alert color="yellow" variant="light" mb={8}>
                  {warning}
                </Alert>
              )}

              <ButtonFilled
                label={t('login.submit')}
                disabled={loading}
                style={{ marginTop: 12 }}
                fullWidth
                onClick={handleLogin}
                loading={loading}
              />

              <Anchor
                underline="never"
                style={{ marginTop: 12, display: 'inline-block', cursor: 'pointer' }}
                onClick={() => setForgotOpened(true)}
              >
                {t('login.forgot_password')}
              </Anchor>
            </Box>
          </Flex>

          <BackgroundImage src={image} py={30} classNames={{ root: classes.rootImage }}>
            <Flex direction="column">
              <Title order={1} pl={36} size="h1" mb={24}>
                {t('login.hero_title')}
              </Title>
              <Box w="100%" pl={36}>
                <Carousel
                  withIndicators
                  withControls={false}
                  classNames={{
                    indicators: classes.indicators,
                    indicator: classes.indicator,
                  }}
                >
                  <Carousel.Slide>
                    <Text size="lg" maw={500}>
                      {t('login.hero_slide_1')}
                    </Text>
                  </Carousel.Slide>
                  <Carousel.Slide>
                    <Text size="lg" maw={500}>
                      {t('login.hero_slide_2')}
                    </Text>
                  </Carousel.Slide>
                </Carousel>
              </Box>
            </Flex>
          </BackgroundImage>
        </SimpleGrid>
      </Paper>

      <Modal
        opened={forgotOpened}
        onClose={() => { setForgotOpened(false); setForgotStatus('idle'); setForgotMsg(''); setForgotEmail(''); }}
        title={t('login.forgot_password')}
        centered
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">{t('login.forgot_desc')}</Text>
          {forgotStatus === 'success' ? (
            <Alert color="green" variant="light">{forgotMsg}</Alert>
          ) : (
            <>
              <InputText
                label={t('login.email')}
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                fullWidth
                placeholder={t('login.email_placeholder')}
              />
              {forgotStatus === 'error' && <Text c="red" size="sm">{forgotMsg}</Text>}
              <ButtonFilled
                label={t('login.forgot_submit')}
                disabled={forgotStatus === 'loading'}
                loading={forgotStatus === 'loading'}
                onClick={handleForgotPassword}
                fullWidth
              />
            </>
          )}
        </Stack>
      </Modal>
    </Center>
  );
}

export default Login;