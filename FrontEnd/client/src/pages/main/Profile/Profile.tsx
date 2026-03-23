import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Title, Text, Paper, Stack, Button, Tabs, TextInput, PasswordInput, Notification } from '@mantine/core';

const Profile = () => {
  const navigate = useNavigate();
  const name = localStorage.getItem('user_name') || 'Người dùng';
  const role = localStorage.getItem('user_role') || 'user';
  const [email, setEmail] = useState(localStorage.getItem('user_email') || 'frontend@dev.com');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
  };

  const handleSaveEmail = () => {
    localStorage.setItem('user_email', email);
    setMessage('Cập nhật email thành công.');
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage('Vui lòng điền đầy đủ thông tin.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('Mật khẩu mới và xác nhận không khớp.');
      return;
    }

    // Trường hợp mock: lưu password trong localStorage để demo.
    localStorage.setItem('user_password', newPassword);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setMessage('Đổi mật khẩu thành công.');
  };

  return (
    <Box className="max-w-[900px] mx-auto p-4">
      <Title order={2}>Cài đặt tài khoản</Title>
      <Tabs defaultValue="profile" mt="md">
        <Tabs.List>
          <Tabs.Tab value="profile">Thông tin</Tabs.Tab>
          <Tabs.Tab value="settings">Settings</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="profile" pt="md">
          <Paper shadow="xs" withBorder p="md">
            <Stack spacing="sm">
              <Text><strong>Họ & tên:</strong> {name}</Text>
              <Text><strong>Vai trò:</strong> {role}</Text>
              <Text><strong>Email:</strong> {email}</Text>
              <Text><strong>Username:</strong> {name.toLowerCase().replace(/\s+/g, '')}</Text>
            </Stack>
            <Button mt="md" color="red" onClick={handleLogout}>
              Đăng xuất
            </Button>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="settings" pt="md">
          <Paper shadow="xs" withBorder p="md">
            <Stack spacing="md">
              {message && (
                <Notification color="green" onClose={() => setMessage('')}>
                  {message}
                </Notification>
              )}

              <Title order={4}>Cập nhật email</Title>
              <TextInput
                label="Email"
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
              />
              <Button onClick={handleSaveEmail}>Lưu email</Button>

              <Title order={4}>Đổi mật khẩu</Title>
              <PasswordInput
                label="Mật khẩu hiện tại"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.currentTarget.value)}
              />
              <PasswordInput
                label="Mật khẩu mới"
                value={newPassword}
                onChange={(event) => setNewPassword(event.currentTarget.value)}
              />
              <PasswordInput
                label="Xác nhận mật khẩu mới"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.currentTarget.value)}
              />
              <Button onClick={handleChangePassword}>Đổi mật khẩu</Button>
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
};

export default Profile;

