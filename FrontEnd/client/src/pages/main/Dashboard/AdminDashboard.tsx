import { useMemo, useState } from 'react';
import {
  Box, Table, Title, SimpleGrid, Paper, Text, Stack, Group, Badge, Select, TextInput,
} from '@mantine/core';
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
  const [activityStatus, setActivityStatus] = useState<string>('all');
  const [activityTime, setActivityTime] = useState<string>('all');
  const [keyword, setKeyword] = useState('');

  const filteredActivity = useMemo(() => {
    const now = Date.now();
    const term = keyword.trim().toLowerCase();
    return data.recent_activity.filter((row) => {
      const matchesStatus = activityStatus === 'all' || row.status === activityStatus;
      let matchesTime = true;
      if (activityTime !== 'all') {
        const updatedAt = new Date(row.updated_at).getTime();
        const maxAge = activityTime === '7d' ? 7 : activityTime === '30d' ? 30 : 90;
        matchesTime = now - updatedAt <= maxAge * 24 * 60 * 60 * 1000;
      }
      const hay = `${row.exam_title} ${row.student_name || ''} ${row.student_email || ''}`.toLowerCase();
      const matchesKeyword = !term || hay.includes(term);
      return matchesStatus && matchesTime && matchesKeyword;
    });
  }, [data.recent_activity, activityStatus, activityTime, keyword]);

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
            <Text size="xs" c="dimmed" mt={6}>{t('dashboard.management_metric_hint')}</Text>
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
        <Group justify="space-between" align="center">
          <Title order={4}>{t('dashboard.recent_activity')}</Title>
          <Badge color={isAdmin ? 'grape' : 'blue'} variant="light">
            {isAdmin ? t('dashboard.role_admin_view') : t('dashboard.role_teacher_view')}
          </Badge>
        </Group>

        <Group grow align="end">
          <TextInput
            label={t('dashboard.filter_keyword')}
            placeholder={t('dashboard.filter_keyword_placeholder')}
            value={keyword}
            onChange={(e) => setKeyword(e.currentTarget.value)}
          />
          <Select
            label={t('dashboard.filter_status')}
            value={activityStatus}
            onChange={(v) => setActivityStatus(v || 'all')}
            data={[
              { value: 'all', label: t('dashboard.filter_all_status') },
              { value: 'submitted', label: t('dashboard.status_submitted') },
              { value: 'active', label: t('dashboard.status_active') },
              { value: 'expired', label: t('dashboard.status_expired') },
            ]}
          />
          <Select
            label={t('dashboard.filter_time')}
            value={activityTime}
            onChange={(v) => setActivityTime(v || 'all')}
            data={[
              { value: 'all', label: t('dashboard.filter_time_all') },
              { value: '7d', label: t('dashboard.filter_time_7d') },
              { value: '30d', label: t('dashboard.filter_time_30d') },
              { value: '90d', label: t('dashboard.filter_time_90d') },
            ]}
          />
        </Group>

        {filteredActivity.length === 0 ? (
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
              {filteredActivity.map((row) => (
                <Table.Tr key={row.session_id}>
                  <Table.Td>{row.exam_title}</Table.Td>
                  <Table.Td>
                    {row.student_name || row.student_email || '—'}
                  </Table.Td>
                  <Table.Td>
                    <Badge color={row.status === 'submitted' ? 'green' : row.status === 'active' ? 'orange' : 'gray'}>
                      {t(`dashboard.status_${row.status}`, { defaultValue: row.status })}
                    </Badge>
                  </Table.Td>
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
