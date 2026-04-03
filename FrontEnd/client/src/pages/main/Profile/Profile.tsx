import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Title, Text, Paper, Stack, Button,
  Tabs, TextInput, PasswordInput, Notification,
} from '@mantine/core';
import { clearSession } from '@/services/authApi';

const Profile = () => {
  const navigate = useNavigate();
  const name = localStorage.getItem('user_name') || 'Người dùng';
  const role = localStorage.getItem('user_role') || 'user';
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
      setMessage('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Mật khẩu mới và xác nhận không khớp.');
      return;
    }
    // TODO: gọi API đổi mật khẩu khi BE có endpoint
    setMessage('Chức năng đổi mật khẩu sẽ được cập nhật sớm.');
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
            <Stack gap="sm">
              <Text><strong>Họ & tên:</strong> {name}</Text>
              <Text><strong>Vai trò:</strong> {role}</Text>
              <Text><strong>Email:</strong> {email}</Text>
            </Stack>
            <Button mt="md" color="red" onClick={handleLogout}>
              Đăng xuất
            </Button>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="settings" pt="md">
          <Paper shadow="xs" withBorder p="md">
            <Stack gap="md">
              {message && (
                <Notification color="blue" onClose={() => setMessage('')}>
                  {message}
                </Notification>
              )}
              <Title order={4}>Đổi mật khẩu</Title>
              <PasswordInput
                label="Mật khẩu hiện tại"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.currentTarget.value)}
              />
              <PasswordInput
                label="Mật khẩu mới"
                value={newPassword}
                onChange={(e) => setNewPassword(e.currentTarget.value)}
              />
              <PasswordInput
                label="Xác nhận mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.currentTarget.value)}
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