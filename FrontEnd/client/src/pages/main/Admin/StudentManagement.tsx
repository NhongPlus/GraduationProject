import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Table,
  Paper,
  Text,
  Stack,
  Group,
  Badge,
  Modal,
  Loader,
  Alert,
  Tabs,
  Tooltip,
  ActionIcon,
  Select,
  Checkbox,
  Button,
  Center,
} from '@mantine/core';
import {
  IconDownload,
  IconEye,
  IconEyeOff,
  IconKey,
  IconPencil,
  IconPlus,
  IconReportAnalytics,
  IconTrash,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import userApi, { type UserAccount } from '@/services/userApi';
import adminClassApi, { type AdminClassDto } from '@/services/adminClassApi';
import teacherStudentsApi from '@/services/teacherStudentsApi';
import type { GradeRow, GradeExamOption, StudentTranscript } from '@/services/teacherStudentsApi';
import StudentTranscriptModal from '@/pages/main/Teacher/StudentTranscriptModal';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import ButtonLight from '@/components/Button/ButtonLight/ButtonLight';
import InputText from '@/components/Input/InputText/InputText';
import { ListPaginationBar } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, pageToOffset } from '@/utils/pagination';
import PageHeader from '@/components/PageHeader/PageHeader';
import { formatScoreScale10Pair, scoreToPointPercent } from '@/utils/formatExamScore';

const StudentManagement = () => {
  const { t } = useTranslation();
  const [students, setStudents] = useState<UserAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [classFilterId, setClassFilterId] = useState<string | null>(null);
  const [classes, setClasses] = useState<AdminClassDto[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [visiblePasswordIds, setVisiblePasswordIds] = useState<Set<string>>(new Set());

  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    full_name: '',
    username: '',
    email: '',
    is_active: true,
    password: '',
  });
  const [editErr, setEditErr] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    full_name: '',
    username: '',
    email: '',
    password: 'Test@123',
  });
  const [createErr, setCreateErr] = useState('');

  const [gradeRows, setGradeRows] = useState<GradeRow[]>([]);
  const [gradeTotal, setGradeTotal] = useState(0);
  const [gradeSubmittedCount, setGradeSubmittedCount] = useState(0);
  const [gradeClassTotal, setGradeClassTotal] = useState(0);
  const [gradePage, setGradePage] = useState(1);
  const [gradePageSize, setGradePageSize] = useState(DEFAULT_PAGE_SIZE);
  const [gradeSearch, setGradeSearch] = useState('');
  const [gradeSearchDebounced, setGradeSearchDebounced] = useState('');
  const [gradeExams, setGradeExams] = useState<GradeExamOption[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [gradeClassId, setGradeClassId] = useState<string | null>(null);
  const [gradeClassName, setGradeClassName] = useState('');
  const [gradeLoading, setGradeLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptData, setTranscriptData] = useState<StudentTranscript | null>(null);
  const [transcriptStudentId, setTranscriptStudentId] = useState<string | null>(null);
  const [transcriptExportLoading, setTranscriptExportLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchDebounced(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setGradeSearchDebounced(gradeSearch.trim());
      setGradePage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [gradeSearch]);

  useEffect(() => {
    void adminClassApi.getClasses().then(setClasses).catch(() => {});
  }, []);

  const loadStudents = useCallback(async () => {
    const isFirst = initialLoading;
    try {
      if (!isFirst) setRefreshing(true);
      const r = await userApi.listStudents({
        limit: pageSize,
        offset: pageToOffset(page, pageSize),
        search: searchDebounced || undefined,
        admin_class_id: classFilterId || undefined,
      });
      setStudents(r.items);
      setTotal(r.total);
      setError('');
    } catch {
      setError(t('errors.user_list_failed'));
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, searchDebounced, classFilterId, initialLoading, t]);

  useEffect(() => {
    void loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, searchDebounced, classFilterId]);

  const pageStudentIds = useMemo(() => students.map((s) => s.id), [students]);
  const allPageSelected =
    pageStudentIds.length > 0 && pageStudentIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageStudentIds.some((id) => selectedIds.has(id));

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageStudentIds.forEach((id) => next.delete(id));
      else pageStudentIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleStudentSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (!window.confirm(`Xóa ${ids.length} sinh viên đã chọn? Tài khoản đang dùng trong hệ thống có thể không xóa được.`)) {
      return;
    }
    setBulkDeleting(true);
    setError('');
    try {
      const result = await userApi.bulkDeleteUsers(ids);
      setSelectedIds(new Set());
      if (result.failed.length > 0) {
        setNotice(`Đã xóa ${result.deleted} tài khoản. ${result.failed.length} tài khoản không xóa được.`);
        setError(result.failed.slice(0, 3).map((f) => f.reason).join(' · '));
      } else {
        setNotice(`Đã xóa ${result.deleted} sinh viên.`);
      }
      void loadStudents();
    } catch {
      setError(t('errors.user_delete_failed'));
    } finally {
      setBulkDeleting(false);
    }
  };

  const openEdit = (s: UserAccount) => {
    setEditForm({
      id: s.id,
      full_name: s.full_name ?? '',
      username: s.username,
      email: s.email,
      is_active: s.is_active,
      password: '',
    });
    setEditErr('');
    setEditOpen(true);
  };

  const openPasswordReset = (s: UserAccount) => {
    setEditForm({
      id: s.id,
      full_name: s.full_name ?? '',
      username: s.username,
      email: s.email,
      is_active: s.is_active,
      password: '',
    });
    setEditErr('');
    setPasswordOpen(true);
  };

  const handleSaveEdit = async () => {
    setEditErr('');
    if (!editForm.username.trim() || !editForm.email.trim()) {
      setEditErr(t('teacher_students.edit_validation'));
      return;
    }
    try {
      await userApi.updateUser(editForm.id, {
        full_name: editForm.full_name.trim() || null,
        username: editForm.username.trim(),
        email: editForm.email.trim(),
        is_active: editForm.is_active,
        ...(editForm.password.trim() ? { password: editForm.password.trim() } : {}),
      });
      setEditOpen(false);
      setPasswordOpen(false);
      setNotice('Đã cập nhật sinh viên.');
      void loadStudents();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setEditErr(msg || t('errors.user_update_failed'));
    }
  };

  const handleCreate = async () => {
    setCreateErr('');
    if (!createForm.username.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      setCreateErr(t('teacher_students.add_validation'));
      return;
    }
    try {
      await userApi.addUser({
        full_name: createForm.full_name.trim() || undefined,
        username: createForm.username.trim(),
        email: createForm.email.trim(),
        password: createForm.password.trim(),
        role: 'student',
      });
      setCreateOpen(false);
      setCreateForm({ full_name: '', username: '', email: '', password: 'Test@123' });
      setNotice('Đã tạo tài khoản sinh viên.');
      void loadStudents();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setCreateErr(msg || t('errors.user_add_failed'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('teacher_students.confirm_delete'))) return;
    try {
      await userApi.deleteUser(id);
      setNotice('Đã xóa sinh viên.');
      void loadStudents();
    } catch {
      setError(t('errors.user_delete_failed'));
    }
  };

  const loadGradeExams = useCallback(async (adminClassId: string) => {
    try {
      const data = await teacherStudentsApi.getGradeExams(adminClassId);
      setGradeClassName(data.class_name);
      setGradeExams(data.exams);
      setSelectedExamId((prev) => prev ?? data.exams[0]?.id ?? null);
    } catch {
      setError(t('teacher_students.grade_load_error'));
    }
  }, [t]);

  const loadGradeReport = useCallback(
    async (examId: string | null, adminClassId: string | null) => {
      if (!examId || !adminClassId) {
        setGradeRows([]);
        setGradeTotal(0);
        setGradeSubmittedCount(0);
        setGradeClassTotal(0);
        return;
      }
      try {
        setGradeLoading(true);
        const r = await teacherStudentsApi.getGradeReport(examId, {
          limit: gradePageSize,
          offset: pageToOffset(gradePage, gradePageSize),
          search: gradeSearchDebounced || undefined,
          admin_class_id: adminClassId,
        });
        setGradeRows(r.items);
        setGradeTotal(r.total);
        setGradeSubmittedCount(r.submitted_count);
        setGradeClassTotal(r.class_student_total);
        setGradeClassName(r.class_name);
      } catch {
        setError(t('teacher_students.grade_load_error'));
      } finally {
        setGradeLoading(false);
      }
    },
    [gradePage, gradePageSize, gradeSearchDebounced, t]
  );

  useEffect(() => {
    if (gradeClassId) void loadGradeExams(gradeClassId);
  }, [gradeClassId, loadGradeExams]);

  useEffect(() => {
    if (selectedExamId && gradeClassId) void loadGradeReport(selectedExamId, gradeClassId);
  }, [selectedExamId, gradeClassId, loadGradeReport]);

  useEffect(() => {
    setGradePage(1);
    setGradeSearch('');
    setGradeSearchDebounced('');
    setSelectedExamId(null);
    setGradeExams([]);
  }, [gradeClassId]);

  const handleExportCsv = async () => {
    if (!selectedExamId || !gradeClassId) return;
    try {
      setExportLoading(true);
      await teacherStudentsApi.downloadGradeExport(selectedExamId, gradeClassId);
    } catch {
      setError(t('teacher_students.export_error'));
    } finally {
      setExportLoading(false);
    }
  };

  const openTranscript = async (studentId: string) => {
    setTranscriptStudentId(studentId);
    setTranscriptOpen(true);
    setTranscriptData(null);
    try {
      setTranscriptLoading(true);
      const data = await teacherStudentsApi.getTranscript(studentId);
      setTranscriptData(data);
    } catch {
      setError(t('teacher_students.transcript_load_error'));
      setTranscriptOpen(false);
    } finally {
      setTranscriptLoading(false);
    }
  };

  const handleTranscriptExport = async (format: 'html' | 'csv') => {
    if (!transcriptStudentId) return;
    try {
      setTranscriptExportLoading(true);
      const code = transcriptData?.student.student_code ?? 'bang_diem';
      await teacherStudentsApi.downloadTranscriptExport(
        transcriptStudentId,
        format,
        format === 'csv' ? `bang_diem_${code}.csv` : undefined
      );
    } catch {
      setError(t('teacher_students.export_error'));
    } finally {
      setTranscriptExportLoading(false);
    }
  };

  const classFilterOptions = [
    { value: '', label: 'Tất cả lớp' },
    ...classes.map((c) => ({
      value: c.id,
      label: `${c.display_name} (${c.student_count ?? 0} SV)`,
    })),
  ];

  const gradeClassOptions = classes.map((c) => ({
    value: c.id,
    label: c.display_name,
  }));

  if (initialLoading) {
    return (
      <Box className="max-w-[1200px] mx-auto p-4">
        <Center py="xl">
          <Loader />
        </Center>
      </Box>
    );
  }

  return (
    <Box className="max-w-[1200px] mx-auto p-4">
      <PageHeader
        title={t('teacher_students.title')}
        subtitle="Quản lý tài khoản sinh viên toàn hệ thống"
        accent="teal"
      />

      {notice && (
        <Alert color="green" variant="light" mb="md" onClose={() => setNotice('')} withCloseButton>
          {notice}
        </Alert>
      )}
      {error && (
        <Alert color="red" variant="light" mb="md" onClose={() => setError('')} withCloseButton>
          {error}
        </Alert>
      )}

      <Tabs defaultValue="list">
        <Tabs.List mb="md">
          <Tabs.Tab value="list">{t('teacher_students.tab_list')}</Tabs.Tab>
          <Tabs.Tab value="grades">{t('teacher_students.tab_grades')}</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="list">
          <Stack gap="md">
            <Paper withBorder radius="md" p="sm">
              <Group justify="space-between" wrap="wrap" align="flex-end" gap="sm">
                <Group wrap="wrap" align="flex-end" gap="sm" style={{ flex: 1 }}>
                  <InputText
                    placeholder={t('teacher_students.search_placeholder')}
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    style={{ minWidth: 260, flex: '1 1 200px' }}
                  />
                  <Select
                    label="Lớp hành chính"
                    placeholder="Tất cả lớp"
                    data={classFilterOptions}
                    value={classFilterId ?? ''}
                    onChange={(v) => {
                      setClassFilterId(v || null);
                      setPage(1);
                      setSelectedIds(new Set());
                    }}
                    clearable
                    searchable
                    style={{ minWidth: 220 }}
                  />
                </Group>
                <Group gap="sm">
                  <ButtonFilled
                    size="sm"
                    label={t('teacher_students.add_student')}
                    leftSection={<IconPlus size={16} />}
                    disabled={false}
                    onClick={() => setCreateOpen(true)}
                  />
                  <ButtonLight
                    size="sm"
                    label="Làm mới"
                    loading={refreshing}
                    disabled={refreshing}
                    onClick={() => void loadStudents()}
                  />
                </Group>
              </Group>
            </Paper>

            {selectedIds.size > 0 && (
              <Group>
                <Text size="sm" c="dimmed">
                  Đã chọn {selectedIds.size} sinh viên
                </Text>
                <Button
                  color="red"
                  variant="light"
                  leftSection={<IconTrash size={16} />}
                  loading={bulkDeleting}
                  onClick={() => void handleBulkDelete()}
                >
                  Xóa đã chọn
                </Button>
                <Button variant="subtle" size="compact-sm" onClick={() => setSelectedIds(new Set())}>
                  Bỏ chọn
                </Button>
              </Group>
            )}

            <Paper withBorder radius="md">
              <Box
                px="sm"
                py="xs"
                style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}
              >
                <Group justify="space-between" wrap="wrap">
                  <Select
                    label="Số dòng / trang"
                    data={PAGE_SIZE_OPTIONS.map((n) => ({
                      value: String(n),
                      label: t('pagination.page_size_option', { size: n }),
                    }))}
                    value={String(pageSize)}
                    allowDeselect={false}
                    w={120}
                    onChange={(v) => {
                      if (!v) return;
                      setPageSize(Number(v));
                      setPage(1);
                    }}
                  />
                </Group>
              </Box>

              <Box pos="relative" style={{ minHeight: 80 }}>
                {refreshing && (
                  <Center
                    pos="absolute"
                    inset={0}
                    style={{ zIndex: 2, background: 'rgba(255,255,255,0.6)' }}
                  >
                    <Loader size="sm" />
                  </Center>
                )}
                <Table highlightOnHover verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th w={40}>
                        <Checkbox
                          checked={allPageSelected}
                          indeterminate={!allPageSelected && somePageSelected}
                          onChange={toggleSelectAllOnPage}
                          aria-label={t('teacher_students.select_all_page')}
                        />
                      </Table.Th>
                      <Table.Th>#</Table.Th>
                      <Table.Th>{t('teacher_students.col_code')}</Table.Th>
                      <Table.Th>{t('teacher_students.col_name')}</Table.Th>
                      <Table.Th>{t('teacher_students.col_email')}</Table.Th>
                      <Table.Th>{t('teacher_students.col_password')}</Table.Th>
                      <Table.Th>{t('teacher_students.col_status')}</Table.Th>
                      <Table.Th>{t('common.actions')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {students.map((s, idx) => (
                      <Table.Tr key={s.id} bg={selectedIds.has(s.id) ? 'teal.0' : undefined}>
                        <Table.Td>
                          <Checkbox
                            checked={selectedIds.has(s.id)}
                            onChange={() => toggleStudentSelected(s.id)}
                          />
                        </Table.Td>
                        <Table.Td>{(page - 1) * pageSize + idx + 1}</Table.Td>
                        <Table.Td>
                          <Text size="sm" ff="monospace">
                            {s.username}
                          </Text>
                        </Table.Td>
                        <Table.Td>{s.full_name || '—'}</Table.Td>
                        <Table.Td>{s.email}</Table.Td>
                        <Table.Td>
                          <Group gap={4} wrap="nowrap">
                            <Text size="sm" ff="monospace">
                              {visiblePasswordIds.has(s.id)
                                ? (s.password_plain ?? 'Test@123')
                                : '••••••••'}
                            </Text>
                            <ActionIcon
                              variant="subtle"
                              size="sm"
                              color="gray"
                              onClick={() => {
                                setVisiblePasswordIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(s.id)) next.delete(s.id);
                                  else next.add(s.id);
                                  return next;
                                });
                              }}
                            >
                              {visiblePasswordIds.has(s.id) ? (
                                <IconEyeOff size={16} />
                              ) : (
                                <IconEye size={16} />
                              )}
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={s.is_active ? 'green' : 'gray'} size="sm">
                            {s.is_active
                              ? t('teacher_students.active')
                              : t('teacher_students.inactive')}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4} wrap="nowrap">
                            <Tooltip label={t('teacher_students.edit_student')}>
                              <ActionIcon color="blue" variant="light" onClick={() => openEdit(s)}>
                                <IconPencil size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Đặt lại mật khẩu">
                              <ActionIcon
                                color="orange"
                                variant="light"
                                onClick={() => openPasswordReset(s)}
                              >
                                <IconKey size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label={t('teacher_students.transcript_btn')}>
                              <ActionIcon
                                color="teal"
                                variant="light"
                                onClick={() => void openTranscript(s.id)}
                              >
                                <IconReportAnalytics size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label={t('common.delete')}>
                              <ActionIcon
                                color="red"
                                variant="light"
                                onClick={() => void handleDelete(s.id)}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                    {students.length === 0 && !refreshing && (
                      <Table.Tr>
                        <Table.Td colSpan={8}>
                          <Text c="dimmed" ta="center" py="md">
                            {t('teacher_students.empty')}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              </Box>

              <ListPaginationBar
                page={page}
                total={total}
                limit={pageSize}
                onPageChange={setPage}
                showPageSize={false}
                bordered={false}
              />
            </Paper>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="grades">
          <Stack gap="md">
            <Paper withBorder radius="md" p="sm">
              <Group justify="space-between" align="flex-end" wrap="wrap">
                <Select
                  label="Lớp hành chính"
                  placeholder="Chọn lớp để xem bảng điểm"
                  data={gradeClassOptions}
                  value={gradeClassId}
                  onChange={setGradeClassId}
                  searchable
                  style={{ minWidth: 280, flex: 1 }}
                />
                <Select
                  label={t('teacher_students.select_exam')}
                  placeholder={t('teacher_students.select_exam_placeholder')}
                  data={gradeExams.map((e) => ({
                    value: e.id,
                    label: `${e.title} (${e.submitted_count} ${t('teacher_students.submitted_short')})`,
                  }))}
                  value={selectedExamId}
                  onChange={setSelectedExamId}
                  disabled={!gradeClassId}
                  searchable
                  style={{ minWidth: 280, flex: 1 }}
                />
                <ButtonLight
                  label={exportLoading ? '...' : t('teacher_students.export_detail_csv')}
                  onClick={handleExportCsv}
                  color="blue"
                  size="sm"
                  leftSection={<IconDownload size={16} />}
                  disabled={!selectedExamId || !gradeClassId || exportLoading}
                />
              </Group>
            </Paper>

            {!gradeClassId ? (
              <Text c="dimmed">Chọn lớp hành chính để xem bảng điểm.</Text>
            ) : !selectedExamId ? (
              <Text c="dimmed">{t('teacher_students.select_exam_hint')}</Text>
            ) : (
              <Paper withBorder radius="md">
                <Box p="sm">
                  <Group justify="space-between" mb="sm" wrap="wrap">
                    <Text size="sm" c="dimmed">
                      {t('teacher_students.grade_title', { class: gradeClassName })} —{' '}
                      {t('teacher_students.grade_summary', {
                        submitted: gradeSubmittedCount,
                        total: gradeClassTotal,
                      })}
                    </Text>
                    <InputText
                      placeholder={t('teacher_students.grade_search_placeholder')}
                      value={gradeSearch}
                      onChange={(e) => setGradeSearch(e.currentTarget.value)}
                      style={{ maxWidth: 320 }}
                    />
                  </Group>
                </Box>
                <ListPaginationBar
                  page={gradePage}
                  total={gradeTotal}
                  limit={gradePageSize}
                  onPageChange={setGradePage}
                  onLimitChange={(n) => {
                    setGradePageSize(n);
                    setGradePage(1);
                  }}
                />
                {gradeLoading ? (
                  <Box p="xl" className="flex justify-center">
                    <Loader size="sm" />
                  </Box>
                ) : (
                  <Table highlightOnHover verticalSpacing="sm" striped>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t('teacher_students.col_code')}</Table.Th>
                        <Table.Th>{t('teacher_students.col_name')}</Table.Th>
                        <Table.Th>{t('teacher_students.col_version')}</Table.Th>
                        <Table.Th>{t('teacher_students.col_score')}</Table.Th>
                        <Table.Th>{t('teacher_students.col_score_percent')}</Table.Th>
                        <Table.Th>{t('teacher_students.col_date')}</Table.Th>
                        <Table.Th>{t('teacher_students.col_grading')}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {gradeRows.map((r) => {
                        const pctVal = scoreToPointPercent(r.score, r.max_points);
                        const pct = pctVal != null ? pctVal.toFixed(1) : '—';
                        const hasSession = Boolean(r.session_id);
                        return (
                          <Table.Tr
                            key={`${r.student_id}-${r.session_id ?? 'none'}`}
                            style={hasSession ? undefined : { opacity: 0.65 }}
                          >
                            <Table.Td>
                              <Text size="sm" ff="monospace">
                                {r.username}
                              </Text>
                            </Table.Td>
                            <Table.Td>{r.full_name || '—'}</Table.Td>
                            <Table.Td>{r.version_code || '—'}</Table.Td>
                            <Table.Td>
                              {hasSession ? formatScoreScale10Pair(r.score, r.max_points) : '—'}
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
                      {!gradeLoading && gradeRows.length === 0 && (
                        <Table.Tr>
                          <Table.Td colSpan={7}>
                            <Text c="dimmed" ta="center" py="md">
                              {gradeSearchDebounced
                                ? t('teacher_students.grade_search_empty')
                                : t('teacher_students.empty')}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </Table.Tbody>
                  </Table>
                )}
              </Paper>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <StudentTranscriptModal
        opened={transcriptOpen}
        onClose={() => setTranscriptOpen(false)}
        loading={transcriptLoading}
        data={transcriptData}
        exportLoading={transcriptExportLoading}
        emailSending={false}
        onExportHtml={() => void handleTranscriptExport('html')}
        onExportCsv={() => void handleTranscriptExport('csv')}
      />

      <Modal
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        title={t('teacher_students.edit_modal_title')}
      >
        <Stack gap="sm">
          <InputText
            label={t('teacher_students.col_name')}
            value={editForm.full_name}
            onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.currentTarget.value }))}
          />
          <InputText
            label={t('teacher_students.col_code')}
            value={editForm.username}
            onChange={(e) => setEditForm((p) => ({ ...p, username: e.currentTarget.value }))}
          />
          <InputText
            label="Email"
            value={editForm.email}
            onChange={(e) => setEditForm((p) => ({ ...p, email: e.currentTarget.value }))}
          />
          <Select
            label={t('teacher_students.col_status')}
            value={editForm.is_active ? 'active' : 'inactive'}
            onChange={(v) => setEditForm((p) => ({ ...p, is_active: v === 'active' }))}
            data={[
              { value: 'active', label: t('teacher_students.status_active') },
              { value: 'inactive', label: t('teacher_students.status_inactive') },
            ]}
            allowDeselect={false}
          />
          <InputText
            label={t('common.password')}
            placeholder={t('teacher_students.password_placeholder')}
            value={editForm.password}
            onChange={(e) => setEditForm((p) => ({ ...p, password: e.currentTarget.value }))}
          />
          {editErr && <Text c="red" size="sm">{editErr}</Text>}
          <ButtonFilled label={t('common.save')} disabled={false} onClick={handleSaveEdit} color="teal" />
        </Stack>
      </Modal>

      <Modal
        opened={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        title="Đặt lại mật khẩu"
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            {editForm.full_name || editForm.username} — {editForm.email}
          </Text>
          <InputText
            label={t('common.password')}
            placeholder="Mật khẩu mới"
            value={editForm.password}
            onChange={(e) => setEditForm((p) => ({ ...p, password: e.currentTarget.value }))}
          />
          {editErr && <Text c="red" size="sm">{editErr}</Text>}
          <ButtonFilled
            label="Lưu mật khẩu"
            disabled={!editForm.password.trim()}
            onClick={handleSaveEdit}
            color="teal"
          />
        </Stack>
      </Modal>

      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('teacher_students.add_modal_title')}
      >
        <Stack gap="sm">
          <InputText
            label={t('teacher_students.col_name')}
            value={createForm.full_name}
            onChange={(e) => setCreateForm((p) => ({ ...p, full_name: e.currentTarget.value }))}
          />
          <InputText
            label={t('teacher_students.col_code')}
            value={createForm.username}
            onChange={(e) => setCreateForm((p) => ({ ...p, username: e.currentTarget.value }))}
          />
          <InputText
            label="Email"
            value={createForm.email}
            onChange={(e) => setCreateForm((p) => ({ ...p, email: e.currentTarget.value }))}
          />
          <InputText
            label={t('common.password')}
            value={createForm.password}
            onChange={(e) => setCreateForm((p) => ({ ...p, password: e.currentTarget.value }))}
          />
          {createErr && <Text c="red" size="sm">{createErr}</Text>}
          <ButtonFilled label={t('common.save')} disabled={false} onClick={handleCreate} color="teal" />
        </Stack>
      </Modal>
    </Box>
  );
};

export default StudentManagement;
