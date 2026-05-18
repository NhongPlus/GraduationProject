import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Table, Title, Paper, Text, Stack, Group, Badge, Modal, Loader, Alert,
  Tabs, Tooltip, ActionIcon, Select,
} from '@mantine/core';
import { IconDownload, IconMail, IconPlus, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import teacherStudentsApi from '@/services/teacherStudentsApi';
import type { StudentItem, GradeRow, GradeExamOption } from '@/services/teacherStudentsApi';
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
  const [gradeExams, setGradeExams] = useState<GradeExamOption[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [className, setClassName] = useState('');
  const [gradeLoading, setGradeLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
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

  const loadGradeExams = useCallback(async () => {
    try {
      const data = await teacherStudentsApi.getGradeExams();
      setClassName(data.class_name);
      setGradeExams(data.exams);
      setSelectedExamId((prev) => prev ?? data.exams[0]?.id ?? null);
    } catch {
      setError(t('teacher_students.grade_load_error'));
    }
  }, [t]);

  const loadGradeReport = useCallback(async (examId: string | null) => {
    if (!examId) {
      setGradeRows([]);
      return;
    }
    try {
      setGradeLoading(true);
      const r = await teacherStudentsApi.getGradeReport(examId);
      setGradeRows(r.rows);
      setClassName(r.class_name);
    } catch {
      setError(t('teacher_students.grade_load_error'));
    } finally {
      setGradeLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (selectedExamId) void loadGradeReport(selectedExamId);
  }, [selectedExamId, loadGradeReport]);

  const handleExportCsv = async () => {
    if (!selectedExamId) return;
    try {
      setExportLoading(true);
      await teacherStudentsApi.downloadGradeExport(selectedExamId);
    } catch {
      setError(t('teacher_students.export_error'));
    } finally {
      setExportLoading(false);
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

  const submittedCount = useMemo(
    () => gradeRows.filter((r) => r.session_id).length,
    [gradeRows]
  );

  return (
    <Box className="max-w-[1200px] mx-auto p-4">
      <PageHeader
        title={t('teacher_students.title')}
        subtitle={t('teacher_students.subtitle')}
        accent="teal"
      />

      <Tabs defaultValue="list" onChange={(v) => { if (v === 'grades') void loadGradeExams(); }}>
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
            <Group justify="space-between" align="flex-end" wrap="wrap">
              <Stack gap="xs" style={{ flex: 1, minWidth: 260 }}>
                <Title order={4}>{t('teacher_students.grade_title', { class: className })}</Title>
                <Select
                  label={t('teacher_students.select_exam')}
                  placeholder={t('teacher_students.select_exam_placeholder')}
                  data={gradeExams.map((e) => ({
                    value: e.id,
                    label: `${e.title} (${e.submitted_count} ${t('teacher_students.submitted_short')})`,
                  }))}
                  value={selectedExamId}
                  onChange={(v) => setSelectedExamId(v)}
                  allowDeselect={false}
                  searchable
                />
              </Stack>
              <Group gap="xs">
                <ButtonLight
                  label={exportLoading ? '...' : t('teacher_students.export_detail_csv')}
                  onClick={handleExportCsv}
                  color="blue"
                  size="sm"
                  leftSection={<IconDownload size={16} />}
                  disabled={!selectedExamId || exportLoading}
                />
                <ButtonFilled
                  label={emailSending ? '...' : t('teacher_students.send_email')}
                  onClick={handleSendEmail}
                  color="teal"
                  size="sm"
                  leftSection={<IconMail size={16} />}
                  disabled={emailSending || submittedCount === 0}
                />
              </Group>
            </Group>

            {emailResult && <Alert color={emailResult.includes('error') ? 'red' : 'green'} variant="light">{emailResult}</Alert>}

            {!selectedExamId ? (
              <Text c="dimmed">{t('teacher_students.select_exam_hint')}</Text>
            ) : gradeLoading ? (
              <Box p="xl" className="flex justify-center"><Loader size="sm" /></Box>
            ) : (
              <Paper withBorder radius="md" p="sm">
                <Text size="sm" c="dimmed" mb="sm">
                  {t('teacher_students.grade_summary', {
                    submitted: submittedCount,
                    total: gradeRows.length,
                  })}
                </Text>
                <Table highlightOnHover verticalSpacing="sm" striped>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('teacher_students.col_code')}</Table.Th>
                      <Table.Th>{t('teacher_students.col_name')}</Table.Th>
                      <Table.Th>{t('teacher_students.col_version')}</Table.Th>
                      <Table.Th>{t('teacher_students.col_score')}</Table.Th>
                      <Table.Th>%</Table.Th>
                      <Table.Th>{t('teacher_students.col_date')}</Table.Th>
                      <Table.Th>{t('teacher_students.col_grading')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {gradeRows.map((r) => {
                      const pct =
                        r.score != null && r.max_points && r.max_points > 0
                          ? ((r.score / r.max_points) * 100).toFixed(1)
                          : '—';
                      const hasSession = Boolean(r.session_id);
                      return (
                        <Table.Tr key={r.student_id} style={hasSession ? undefined : { opacity: 0.65 }}>
                          <Table.Td><Text size="sm" ff="monospace">{r.username}</Text></Table.Td>
                          <Table.Td>{r.full_name || '—'}</Table.Td>
                          <Table.Td>{r.version_code || '—'}</Table.Td>
                          <Table.Td>
                            {hasSession ? `${r.score} / ${r.max_points}` : '—'}
                          </Table.Td>
                          <Table.Td>{hasSession ? pct : '—'}</Table.Td>
                          <Table.Td>
                            {r.submitted_at
                              ? new Date(r.submitted_at).toLocaleDateString('vi-VN')
                              : '—'}
                          </Table.Td>
                          <Table.Td>
                            {hasSession ? (
                              <Badge
                                size="sm"
                                color={r.grading_status === 'complete' ? 'green' : 'yellow'}
                                variant="light"
                              >
                                {r.grading_status === 'complete'
                                  ? t('teacher_students.grading_done')
                                  : t('teacher_students.grading_pending')}
                              </Badge>
                            ) : (
                              <Badge size="sm" color="gray" variant="light">
                                {t('teacher_students.not_submitted')}
                              </Badge>
                            )}
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
