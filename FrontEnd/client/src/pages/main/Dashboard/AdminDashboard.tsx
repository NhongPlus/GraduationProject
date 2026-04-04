import { useState } from 'react';
import { Box, Table, Title, Flex } from '@mantine/core';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import InputText from '@/components/Input/InputText/InputText';

type StudentRecord = { id: number; name: string; username: string; email: string };

const initialStudents: StudentRecord[] = [
  { id: 1, name: 'Nguyễn Văn A', username: 'student1', email: 'a@example.com' },
  { id: 2, name: 'Trần Thị B', username: 'student2', email: 'b@example.com' },
];

const AdminDashboard = () => {
  const [students, setStudents] = useState<StudentRecord[]>(initialStudents);
  const [newStudent, setNewStudent] = useState({ name: '', username: '', email: '' });

  const addStudent = () => {
    if (!newStudent.name || !newStudent.username) return;
    setStudents((prev) => [
      ...prev,
      { id: prev.length + 1, name: newStudent.name, username: newStudent.username, email: newStudent.email },
    ]);
    setNewStudent({ name: '', username: '', email: '' });
  };

  return (
    <Box className="max-w-[1200px] mx-auto p-4">
      <Title order={2} mb="md">Admin Dashboard</Title>

      <Box mb="xl">
        <Title order={4} mb={8}>Tạo tài khoản sinh viên</Title>
        <Flex gap="sm" align="flex-end" wrap="wrap">
          <InputText
            label="Họ tên"
            value={newStudent.name}
            onChange={(event) => {
              const name = event.currentTarget.value;
              setNewStudent((s) => ({ ...s, name }));
            }}
            required
          />
          <InputText
            label="Tên đăng nhập"
            value={newStudent.username}
            onChange={(event) => {
              const username = event.currentTarget.value;
              setNewStudent((s) => ({ ...s, username }));
            }}
            required
          />
          <InputText
            label="Email"
            value={newStudent.email}
            onChange={(event) => {
              const email = event.currentTarget.value;
              setNewStudent((s) => ({ ...s, email }));
            }}
          />
          <ButtonFilled label="Thêm sinh viên" disabled={false} onClick={addStudent} color="green" />
        </Flex>
      </Box>

      <Box>
        <Title order={4} mb={8}>Danh sách sinh viên</Title>
        <Table highlightOnHover verticalSpacing="sm">
          <thead>
            <tr>
              <th>STT</th>
              <th>Họ tên</th>
              <th>Tên đăng nhập</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {students.map((stu, index) => (
              <tr key={stu.id}>
                <td>{index + 1}</td>
                <td>{stu.name}</td>
                <td>{stu.username}</td>
                <td>{stu.email}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
