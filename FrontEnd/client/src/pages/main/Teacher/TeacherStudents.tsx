import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Table, Title, Paper, Text, Stack, Group, Badge, Modal, Loader, Alert,
  Tabs, Tooltip, ActionIcon,
} from '@mantine/core';
import { IconDownload, IconMail, IconPlus, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import teacherStudentsApi from '@/services/teacherStudentsApi';
import type { StudentItem, GradeRow } from '@/services/teacherStudentsApi';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import ButtonLight from '@/components/Button/ButtonLight/ButtonLight';
import InputText from '@/components/Input/InputText/InputText';
import { ListPaginationBar } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, pageToOffset } from '@/utils/pagination';
import PageHeader from '@/components/PageHeader/PageHeader';

const TeacherStudents = () => {
  const { t } = useTranslation();
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ full_name: '', username: '', email: '', password: 'Test@123' });
  const [addErr, setAddErr] = useState('');

  const [gradeRows, setGradeRows] = useState<GradeRow[]>([]);
  const [className, setClassName] = useState('');
  const [gradeLoading, setGradeLoading] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => { setSearchDebounced(search.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      const r = await teacherStudentsApi.list({
        limit: pageSize,
        offset: pageToOffset(page, pageSize),
        search: searchDebounced || undefined,
      });
      setStudents(r.items);
      setTotal(r.total);
    } catch {
      setError(t('errors.user_list_failed'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchDebounced, t]);

  useEffect(() => { void loadStudents(); }, [loadStudents]);

  const handleAdd = async () => {
    setAddErr('');
    if (!addForm.username || !addForm.email || !addForm.password) {
      setAddErr(t('teacher_students.add_validation'));
      return;
    }
    try {
      await teacherStudentsApi.add(addForm);
      setAddOpen(false);
      setAddForm({ full_name: '', username: '', email: '', password: 'Test@123' });
      void loadStudents();
    } catch (e: any) {
      setAddErr(e?.response?.data?.message || t('errors.user_add_failed'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('teacher_students.confirm_delete'))) return;
    try {
      await teacherStudentsApi.remove(id);
      void loadStudents();
    } catch {
      setError(t('errors.user_delete_failed'));
    }
  };

  const loadGradeReport = async () => {
    try {
      setGradeLoading(true);
      const r = await teacherStudentsApi.getGradeReport();
      setGradeRows(r.rows);
      setClassName(r.class_name);
    } catch {
      setError(t('teacher_students.grade_load_error'));
    } finally {
      setGradeLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!window.confirm(t('teacher_students.confirm_send_email'))) return;
    try {
      setEmailSending(true);
      setEmailResult('');
      const r = await teacherStudentsApi.sendGradeEmail();
      setEmailResult(t('teacher_students.email_sent_result', { sent: r.sent, total: r.total }));
    } catch {
      setEmailResult(t('teacher_students.email_send_error'));
    } finally {
      setEmailSending(false);
    }
  };

  const exportCsv = () => {
    if (gradeRows.length === 0) return;
    const headers = ['Mã SV', 'Họ tên', 'Email', 'Bài thi', 'Điểm', 'Thang điểm', '%', 'Ngày nộp'];
    const rows = gradeRows.map((r) => [
      r.username,
      r.full_name ?? '',
      r.email,
      r.exam_title ?? '',
      r.score != null ? String(r.score) : '',
      r.max_points != null ? String(r.max_points) : '',
      r.score != null && r.max_points ? ((r.score / r.max_points) * 100).toFixed(1) : '',
      r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('vi-VN') : '',
    ]);
    const csvContent = '\uFEFF' + [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bang_diem_${className || 'class'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const gradeByStudent = useMemo(() => {
    const map = new Map<string, GradeRow[]>();
    for (const r of gradeRows) {
      const key = r.student_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return map;
  }, [gradeRows]);

  return (
    <Box className="max-w-[1200px] mx-auto p-4">
      <PageHeader
        title={t('teacher_students.title')}
        subtitle={t('teacher_students.subtitle')}
        accent="teal"
      />

      <Tabs defaultValue="list" onChange={(v) => { if (v === 'grades') void loadGradeReport(); }}>
        <Tabs.List mb="md">
          <Tabs.Tab value="list">{t('teacher_students.tab_list')}</Tabs.Tab>
          <Tabs.Tab value="grades">{t('teacher_students.tab_grades')}</Tabs.Tab>
        </Tabs.List>

        {/* Tab: Danh sách */}
        <Tabs.Panel value="list">
          <Stack gap="md">
            <Group justify="space-between">
              <InputText
                placeholder={t('teacher_students.search_placeholder')}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                style={{ maxWidth: 320 }}
              />
              <ButtonFilled
                label={t('teacher_students.add_student')}
                disabled={false}
                onClick={() => setAddOpen(true)}
                color="teal"
                size="sm"
                leftSection={<IconPlus size={16} />}
              />
            </Group>

            {error && <Alert color="red" variant="light">{error}</Alert>}

            <Paper withBorder radius="md">
              <ListPaginationBar
                page={page}
                total={total}
                limit={pageSize}
                onPageChange={setPage}
                onLimitChange={(n) => { setPageSize(n); setPage(1); }}
              />
              {loading ? (
                <Box p="xl" className="flex justify-center"><Loader size="sm" /></Box>
              ) : (
                <Table highlightOnHover verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>#</Table.Th>
                      <Table.Th>{t('teacher_students.col_code')}</Table.Th>
                      <Table.Th>{t('teacher_students.col_name')}</Table.Th>
                      <Table.Th>{t('teacher_students.col_email')}</Table.Th>
                      <Table.Th>{t('teacher_students.col_status')}</Table.Th>
                      <Table.Th>{t('common.actions')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {students.map((s, idx) => (
                      <Table.Tr key={s.id}>
                        <Table.Td>{(page - 1) * pageSize + idx + 1}</Table.Td>
                        <Table.Td><Text size="sm" ff="monospace">{s.username}</Text></Table.Td>
                        <Table.Td>{s.full_name || '—'}</Table.Td>
                        <Table.Td>{s.email}</Table.Td>
                        <Table.Td>
                          <Badge color={s.is_active ? 'green' : 'gray'} size="sm">
                            {s.is_active ? t('teacher_students.active') : t('teacher_students.inactive')}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Tooltip label={t('common.delete')}>
                            <ActionIcon color="red" variant="light" onClick={() => handleDelete(s.id)}>
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                    {!loading && students.length === 0 && (
                      <Table.Tr>
                        <Table.Td colSpan={6}>
                          <Text c="dimmed" ta="center" py="md">{t('teacher_students.empty')}</Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              )}
            </Paper>
          </Stack>
        </Tabs.Panel>

        {/* Tab: Bảng điểm */}
        <Tabs.Panel value="grades">
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={4}>{t('teacher_students.grade_title', { class: className })}</Title>
              <Group gap="xs">
                <ButtonLight
                  label={t('teacher_students.export_csv')}
                  onClick={exportCsv}
                  color="blue"
                  size="sm"
                  leftSection={<IconDownload size={16} />}
                  disabled={gradeRows.length === 0}
                />
                <ButtonFilled
                  label={emailSending ? '...' : t('teacher_students.send_email')}
                  onClick={handleSendEmail}
                  color="teal"
                  size="sm"
                  leftSection={<IconMail size={16} />}
                  disabled={emailSending || gradeRows.length === 0}
                />
              </Group>
            </Group>

            {emailResult && <Alert color={emailResult.includes('error') ? 'red' : 'green'} variant="light">{emailResult}</Alert>}

            {gradeLoading ? (
              <Box p="xl" className="flex justify-center"><Loader size="sm" /></Box>
            ) : gradeRows.length === 0 ? (
              <Text c="dimmed">{t('teacher_students.grade_empty')}</Text>
            ) : (
              <Paper withBorder radius="md" p="sm">
                <Table highlightOnHover verticalSpacing="sm" striped>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('teacher_students.col_code')}</Table.Th>
                      <Table.Th>{t('teacher_students.col_name')}</Table.Th>
                      <Table.Th>{t('teacher_students.col_exam')}</Table.Th>
                      <Table.Th>{t('teacher_students.col_score')}</Table.Th>
                      <Table.Th>%</Table.Th>
                      <Table.Th>{t('teacher_students.col_date')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {gradeRows.map((r, idx) => {
                      const pct =
                        r.score != null && r.max_points && r.max_points > 0
                          ? ((r.score / r.max_points) * 100).toFixed(1)
                          : '—';
                      return (
                        <Table.Tr key={`${r.student_id}-${r.exam_id ?? idx}`}>
                          <Table.Td><Text size="sm" ff="monospace">{r.username}</Text></Table.Td>
                          <Table.Td>{r.full_name || '—'}</Table.Td>
                          <Table.Td>{r.exam_title || '—'}</Table.Td>
                          <Table.Td>
                            {r.score != null ? `${r.score} / ${r.max_points}` : '—'}
                          </Table.Td>
                          <Table.Td>{pct}</Table.Td>
                          <Table.Td>
                            {r.submitted_at
                              ? new Date(r.submitted_at).toLocaleDateString('vi-VN')
                              : '—'}
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Paper>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Modal thêm SV */}
      <Modal opened={addOpen} onClose={() => setAddOpen(false)} title={t('teacher_students.add_modal_title')}>
        <Stack gap="sm">
          <InputText
            label={t('teacher_students.col_name')}
            value={addForm.full_name}
            onChange={(e) => setAddForm((p) => ({ ...p, full_name: e.currentTarget.value }))}
          />
          <InputText
            label={t('teacher_students.col_code')}
            value={addForm.username}
            onChange={(e) => setAddForm((p) => ({ ...p, username: e.currentTarget.value }))}
          />
          <InputText
            label="Email"
            value={addForm.email}
            onChange={(e) => setAddForm((p) => ({ ...p, email: e.currentTarget.value }))}
          />
          <InputText
            label={t('common.password')}
            value={addForm.password}
            onChange={(e) => setAddForm((p) => ({ ...p, password: e.currentTarget.value }))}
          />
          {addErr && <Text c="red" size="sm">{addErr}</Text>}
          <ButtonFilled label={t('common.save')} disabled={false} onClick={handleAdd} color="teal" />
        </Stack>
      </Modal>
    </Box>
  );
};

export default TeacherStudents;
