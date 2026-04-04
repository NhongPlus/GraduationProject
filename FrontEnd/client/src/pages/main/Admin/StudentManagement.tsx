import { useEffect, useMemo, useState } from 'react';
import { Box, Title, Table, Select, Modal, Group, Text, Loader } from '@mantine/core';
import userApi from '@/services/userApi';
import type { UserAccount, UserRole } from '@/services/userApi';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import InputText from '@/components/Input/InputText/InputText';

const roles = [
  { value: 'student', label: 'Sinh viên' },
  { value: 'teacher', label: 'Giảng viên' },
  { value: 'admin', label: 'Admin' },
];

const StudentManagement = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('student');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await userApi.getUsers();
      setUsers(data);
    } catch {
      setError('Không tải được danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const addUser = async () => {
    if (!name || !username) return;
    try {
      const u = await userApi.addUser({ name, username, email, role });
      setUsers((prev) => [...prev, u]);
      setName('');
      setUsername('');
      setEmail('');
      setRole('student');
      setIsModalOpen(false);
    } catch {
      setError('Thêm user thất bại.');
    }
  };

  const removeUser = async (id: string) => {
    try {
      const newList = await userApi.deleteUser(id);
      setUsers(newList);
    } catch {
      setError('Xóa user thất bại.');
    }
  };

  const studentAccounts = useMemo(() => users.filter((u) => u.role === 'student'), [users]);

  if (loading) return <Loader />;

  return (
    <Box className="max-w-[1200px] mx-auto p-4">
      <Title order={2} mb="md">Quản lý tài khoản sinh viên</Title>

      <Group mb="md">
        <ButtonFilled label="Tạo tài khoản" disabled={false} onClick={() => setIsModalOpen(true)} />
      </Group>

      {error && <Text color="red">{error}</Text>}

      <Table verticalSpacing="sm" highlightOnHover>
        <thead>
          <tr>
            <th>STT</th>
            <th>Họ tên</th>
            <th>Tên đăng nhập</th>
            <th>Email</th>
            <th>Vai trò</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {studentAccounts.map((u, idx) => (
            <tr key={u.id}>
              <td>{idx + 1}</td>
              <td>{u.name}</td>
              <td>{u.username}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>
                <ButtonFilled size="xs" color="red" label="Xóa" disabled={false} onClick={() => removeUser(u.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal opened={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tạo tài khoản mới">
        <InputText label="Họ tên" value={name} onChange={(e) => setName(e.currentTarget.value)} mb="sm" />
        <InputText label="Tên đăng nhập" value={username} onChange={(e) => setUsername(e.currentTarget.value)} mb="sm" />
        <InputText label="Email" value={email} onChange={(e) => setEmail(e.currentTarget.value)} mb="sm" />
        <Select
          label="Vai trò"
          data={roles}
          value={role}
          onChange={(value) => setRole(value as UserRole)}
          mb="sm"
        />
        <ButtonFilled label="Lưu" disabled={false} onClick={addUser} />
      </Modal>
    </Box>
  );
};

export default StudentManagement;
