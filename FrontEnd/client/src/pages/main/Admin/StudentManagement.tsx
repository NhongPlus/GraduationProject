import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Title, Table, Select, Modal, Group, Text, Loader } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import userApi from '@/services/userApi';
import type { UserAccount, UserRole } from '@/services/userApi';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import InputText from '@/components/Input/InputText/InputText';

const StudentManagement = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const roles = [
    { value: 'student', label: t('roles.student') },
    { value: 'teacher', label: t('roles.teacher') },
    { value: 'admin', label: t('roles.admin') },
  ];

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userApi.getUsers();
      setUsers(data);
    } catch {
      setError(t('errors.user_list_failed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const addUser = async () => {
    if (!fullName || !username || !password) return;
    try {
      const u = await userApi.addUser({ full_name: fullName, username, email, role, password });
      setUsers((prev) => [...prev, u]);
      setFullName('');
      setUsername('');
      setEmail('');
      setPassword('');
      setRole('student');
      setIsModalOpen(false);
    } catch {
      setError(t('errors.user_add_failed'));
    }
  };

  const removeUser = async (id: string) => {
    try {
      await userApi.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch {
      setError(t('errors.user_delete_failed'));
    }
  };

  const studentAccounts = useMemo(() => users.filter((u) => u.role === 'student'), [users]);

  if (loading) return <Loader />;

  return (
    <Box className="max-w-[1200px] mx-auto p-4">
      <Title order={2} mb="md">{t('admin.student_management_title')}</Title>

      <Group mb="md">
        <ButtonFilled label={t('admin.create_account')} disabled={false} onClick={() => setIsModalOpen(true)} />
      </Group>

      {error && <Text color="red">{error}</Text>}

      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('my_results.index')}</Table.Th>
            <Table.Th>{t('admin.full_name')}</Table.Th>
            <Table.Th>{t('admin.username')}</Table.Th>
            <Table.Th>{t('admin.email')}</Table.Th>
            <Table.Th>{t('admin.role')}</Table.Th>
            <Table.Th>{t('common.actions')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {studentAccounts.map((u, idx) => (
            <Table.Tr key={u.id}>
              <Table.Td>{idx + 1}</Table.Td>
              <Table.Td>{u.full_name || '—'}</Table.Td>
              <Table.Td>{u.username}</Table.Td>
              <Table.Td>{u.email}</Table.Td>
              <Table.Td>{u.role}</Table.Td>
              <Table.Td>
                <ButtonFilled size="xs" color="red" label={t('common.delete')} disabled={false} onClick={() => removeUser(u.id)} />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('common.create_account_title')}>
        <InputText
          label={t('admin.full_name')}
          value={fullName}
          onChange={(e) => setFullName(e.currentTarget.value)}
          mb="sm"
        />
        <InputText label={t('admin.username')} value={username} onChange={(e) => setUsername(e.currentTarget.value)} mb="sm" />
        <InputText label={t('admin.email')} value={email} onChange={(e) => setEmail(e.currentTarget.value)} mb="sm" />
        <InputText
          label={t('common.password')}
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          mb="sm"
        />
        <Select
          label={t('admin.role')}
          data={roles}
          value={role}
          onChange={(value) => setRole(value as UserRole)}
          mb="sm"
        />
        <ButtonFilled label={t('common.save_account')} disabled={false} onClick={addUser} />
      </Modal>
    </Box>
  );
};

export default StudentManagement;
