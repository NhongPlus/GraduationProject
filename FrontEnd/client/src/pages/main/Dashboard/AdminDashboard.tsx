import { Box, Table, Title, SimpleGrid, Paper, Text, Stack, Group } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import type { StaffDashboardDto } from '@/services/dashboardApi';

type AdminDashboardProps = {
  data: StaffDashboardDto;
};

const AdminDashboard = ({ data }: AdminDashboardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAdmin = data.viewer === 'admin';

  return (
    <Box className="max-w-[1200px] mx-auto p-4">
      <Group justify="space-between" align="flex-start" mb="md" wrap="wrap">
        <Title order={2}>{t('admin.dashboard_title')}</Title>
        {isAdmin && (
          <ButtonFilled
            label={t('admin.student_management_title')}
            disabled={false}
            onClick={() => navigate('/admin/students')}
            color="teal"
            size="sm"
          />
        )}
      </Group>

      <Text size="sm" c="dimmed" mb="lg">
        {t('dashboard.staff_hint')}
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="xl">
        {data.metrics.map((m) => (
          <Paper key={m.key} radius="md" withBorder p="md">
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
              {t(m.label_key)}
            </Text>
            <Text fw={800} size="xl" mt={4}>
              {m.value}
            </Text>
          </Paper>
        ))}
      </SimpleGrid>

      {isAdmin && data.recent_students.length > 0 && (
        <Stack gap="sm" mb="xl">
          <Title order={4}>{t('admin.student_list_title')}</Title>
          <Table highlightOnHover verticalSpacing="sm" withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('my_results.index')}</Table.Th>
                <Table.Th>{t('admin.full_name')}</Table.Th>
                <Table.Th>{t('admin.username')}</Table.Th>
                <Table.Th>{t('admin.email')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.recent_students.map((stu, index) => (
                <Table.Tr key={stu.id}>
                  <Table.Td>{index + 1}</Table.Td>
                  <Table.Td>{stu.full_name || '—'}</Table.Td>
                  <Table.Td>{stu.username}</Table.Td>
                  <Table.Td>{stu.email}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      )}

      <Stack gap="sm">
        <Title order={4}>{t('dashboard.recent_activity')}</Title>
        {data.recent_activity.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t('dashboard.activity_empty')}
          </Text>
        ) : (
          <Table highlightOnHover verticalSpacing="sm" withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('dashboard.col_exam')}</Table.Th>
                <Table.Th>{t('dashboard.col_student')}</Table.Th>
                <Table.Th>{t('dashboard.col_status')}</Table.Th>
                <Table.Th>{t('dashboard.col_updated')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.recent_activity.map((row) => (
                <Table.Tr key={row.session_id}>
                  <Table.Td>{row.exam_title}</Table.Td>
                  <Table.Td>
                    {row.student_name || row.student_email || '—'}
                  </Table.Td>
                  <Table.Td>{row.status}</Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={1}>
                      {new Date(row.updated_at).toLocaleString()}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Box>
  );
};

export default AdminDashboard;
