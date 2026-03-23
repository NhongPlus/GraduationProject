import { useMemo } from 'react';
import { Box, Text } from '@mantine/core';
import useAuth from '@/hooks/useAuth';
import AdminDashboard from './AdminDashboard';
import StudentDashboard from './StudentDashboard';

const Dashboard = () => {
  const { userAuthority } = useAuth();

  const isAdmin = useMemo(() => userAuthority.includes('admin'), [userAuthority]);

  return (
    <Box>
      {isAdmin ? <AdminDashboard /> : <StudentDashboard />}
      {!isAdmin && !userAuthority.includes('user') && (
        <Text color="red" mt="md">Không có quyền truy cập dashboard</Text>
      )}
    </Box>
  );
};

export default Dashboard;