import { useEffect, useState } from 'react';
import {
  Box, Text, Loader, Table, Badge, Paper, Group, Stack, Select, Alert,
} from '@mantine/core';
import ListPaginationBar from '@/components/ListPagination/ListPaginationBar';
import { DEFAULT_PAGE_SIZE } from '@/utils/pagination';
import { useTranslation } from 'react-i18next';
import EmptyState from '@/components/EmptyState/EmptyState';
import apiClient from '@/services/apiClient';
import PageHeader from '@/components/PageHeader/PageHeader';

type AuditLogItem = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown>;
  actor_name: string | null;
  actor_email: string | null;
  created_at: string;
};

const ACTION_COLORS: Record<string, string> = {
  login: 'blue',
  create_account: 'green',
  delete_account: 'red',
  grade_session: 'cyan',
  force_submit_exam: 'orange',
  create_exam: 'green',
  delete_exam: 'red',
  submit_exam: 'gray',
  password_reset_approve: 'yellow',
};

const AuditLogPage = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const limit = DEFAULT_PAGE_SIZE;

  const load = async (pageNum: number) => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {
        limit,
        offset: (pageNum - 1) * limit,
      };
      if (actionFilter) params.action = actionFilter;
      const res = await apiClient.get<{ success: boolean; logs: AuditLogItem[]; total: number }>(
        '/audit-logs',
        { params }
      );
      setLogs(res.data.logs);
      setTotal(res.data.total);
    } catch {
      setError('Không tải được audit log.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(page);
  }, [page, actionFilter]);

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        <PageHeader
          title={t('audit_log.title')}
          subtitle={t('audit_log.subtitle')}
          accent="teal"
          action={
            <Select
              placeholder={t('audit_log.filter_action')}
              clearable
              value={actionFilter}
              onChange={setActionFilter}
              data={[
                { value: 'login', label: 'Login' },
                { value: 'create_account', label: 'Create account' },
                { value: 'grade_session', label: 'Grade session' },
                { value: 'force_submit_exam', label: 'Force submit' },
                { value: 'password_reset_approve', label: 'Password reset approve' },
              ]}
            />
          }
        />

        {error && <Alert color="red" variant="light">{error}</Alert>}

        <Paper withBorder radius="md" p="sm">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>{t('audit_log.time')}</Table.Th>
                <Table.Th>{t('audit_log.actor')}</Table.Th>
                <Table.Th>{t('audit_log.action')}</Table.Th>
                <Table.Th>{t('audit_log.resource')}</Table.Th>
                <Table.Th>IP</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {logs.map((log, idx) => (
                <Table.Tr key={log.id}>
                  <Table.Td>{(page - 1) * limit + idx + 1}</Table.Td>
                  <Table.Td>
                    <Text size="xs">{new Date(log.created_at).toLocaleString()}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={2}>
                      <Text size="sm" fw={500}>{log.actor_name || log.actor_id || 'System'}</Text>
                      {log.actor_email && <Text size="xs" c="dimmed">{log.actor_email}</Text>}
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={ACTION_COLORS[log.action] ?? 'gray'} size="sm">
                      {log.action}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">
                      {log.resource_type
                        ? `${log.resource_type}${log.resource_id ? ` (${log.resource_id.slice(0, 8)})` : ''}`
                        : '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">{log.details?.ip_address ?? log.actor_id ? '—' : '—'}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
              {logs.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <EmptyState
                      icon={<Text style={{ fontSize: 28 }}>📋</Text>}
                      title={t('audit_log.empty_title') || 'Chưa có nhật ký'}
                      description={t('audit_log.empty_desc') || 'Không có bản ghi hoạt động nào được ghi nhận.'}
                    />
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Paper>

        <ListPaginationBar page={page} total={total} limit={limit} onPageChange={setPage} />
      </Stack>
    </Box>
  );
};

export default AuditLogPage;
