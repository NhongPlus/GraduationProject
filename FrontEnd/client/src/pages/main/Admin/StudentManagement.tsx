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
  Tooltip,
  ActionIcon,
  Select,
  Checkbox,
  Button,
  Center,
} from '@mantine/core';
import {
  IconEye,
  IconEyeOff,
  IconKey,
  IconPencil,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import userApi, { type UserAccount } from '@/services/userApi';
import adminClassApi, { type AdminClassDto } from '@/services/adminClassApi';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import ButtonLight from '@/components/Button/ButtonLight/ButtonLight';
import InputText from '@/components/Input/InputText/InputText';
import { ListPaginationBar } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, pageToOffset } from '@/utils/pagination';
import PageHeader from '@/components/PageHeader/PageHeader';

const StudentManagement = () => {
  const { t } = useTranslation();
  const [students, setStudents] = useState<UserAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchStudent, setSearchStudent] = useState('');
  const [searchTeacher, setSearchTeacher] = useState('');
  const [searchStudentDebounced, setSearchStudentDebounced] = useState('');
  const [searchTeacherDebounced, setSearchTeacherDebounced] = useState('');
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
  const [resettingPasswordId, setResettingPasswordId] = useState<string | null>(null);
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
    role: 'student' as 'student' | 'teacher',
    admin_class_id: '' as string,
  });
  const [createErr, setCreateErr] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchStudentDebounced(searchStudent.trim());
      setSearchTeacherDebounced(searchTeacher.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchStudent, searchTeacher]);

  useEffect(() => {
    void adminClassApi.getClasses().then(setClasses).catch(() => {});
  }, []);

  const loadStudents = useCallback(async () => {
    const isFirst = initialLoading;
    try {
      if (!isFirst) setRefreshing(true);
      const r = await userApi.listUsers({
        limit: pageSize,
        offset: pageToOffset(page, pageSize),
        roles: 'student,teacher',
        search_student: searchStudentDebounced || undefined,
        search_teacher: searchTeacherDebounced || undefined,
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
  }, [page, pageSize, searchStudentDebounced, searchTeacherDebounced, classFilterId, initialLoading, t]);

  useEffect(() => {
    void loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, searchStudentDebounced, searchTeacherDebounced, classFilterId]);

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
    if (!window.confirm(t('admin.confirm_bulk_delete', { count: ids.length }))) {
      return;
    }
    setBulkDeleting(true);
    setError('');
    try {
      const result = await userApi.bulkDeleteUsers(ids);
      setSelectedIds(new Set());
      if (result.failed.length > 0) {
        setNotice(
          t('admin.notice_bulk_delete_partial', {
            deleted: result.deleted,
            failed: result.failed.length,
          }),
        );
        setError(result.failed.slice(0, 3).map((f) => f.reason).join(' · '));
      } else {
        setNotice(t('admin.notice_bulk_deleted', { count: result.deleted }));
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

  const handleAdminResetPassword = async (s: UserAccount) => {
    if (s.role !== 'student' && s.role !== 'teacher' && s.role !== 'admin') return;
    if (
      !window.confirm(
        t('admin.confirm_reset_password', { name: s.full_name || s.username, email: s.email }) +
          (s.role === 'admin' ? t('admin.confirm_reset_password_admin') : ''),
      )
    ) {
      return;
    }
    setResettingPasswordId(s.id);
    setError('');
    try {
      const result = await userApi.adminResetPassword(s.id);
      setNotice(
        result.email_sent
          ? t('admin.notice_password_reset_ok', { email: s.email })
          : t('admin.notice_password_reset_email_fail'),
      );
      void loadStudents();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || t('admin.reset_password_failed'));
    } finally {
      setResettingPasswordId(null);
    }
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
      setNotice(t('admin.notice_updated'));
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
        role: createForm.role,
        admin_class_id:
          createForm.role === 'student' && createForm.admin_class_id
            ? createForm.admin_class_id
            : undefined,
      });
      setCreateOpen(false);
      setCreateForm({
        full_name: '',
        username: '',
        email: '',
        password: 'Test@123',
        role: 'student',
        admin_class_id: '',
      });
      setNotice(
        createForm.role === 'teacher'
          ? t('admin.notice_teacher_created')
          : t('admin.notice_student_created'),
      );
      void loadStudents();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setCreateErr(msg || t('errors.user_add_failed'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('admin.confirm_delete_student'))) return;
    try {
      await userApi.deleteUser(id);
      setNotice(t('admin.notice_student_deleted'));
      void loadStudents();
    } catch {
      setError(t('errors.user_delete_failed'));
    }
  };

  const classFilterOptions = useMemo(
    () => [
      { value: '', label: t('dashboard.filter_class_all') },
      ...classes.map((c) => ({
        value: c.id,
        label: t('admin.class_option', {
          name: c.display_name,
          count: c.student_count ?? 0,
        }),
      })),
    ],
    [classes, t],
  );

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
        title={t('admin.student_management_title')}
        subtitle={t('admin.user_list_subtitle')}
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

      <Stack gap="md">
        <Paper withBorder radius="md" p="sm">
          <Group justify="space-between" wrap="wrap" align="flex-end" gap="sm">
            <Group wrap="wrap" align="flex-end" gap="sm" style={{ flex: 1 }}>
              <InputText
                label={t('admin.search_user')}
                placeholder={t('admin.search_user_placeholder')}
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.currentTarget.value)}
                style={{ minWidth: 220, flex: '1 1 180px' }}
              />
              <InputText
                label={t('admin.search_homeroom')}
                placeholder={t('admin.search_homeroom_placeholder')}
                value={searchTeacher}
                onChange={(e) => setSearchTeacher(e.currentTarget.value)}
                style={{ minWidth: 220, flex: '1 1 180px' }}
              />
              <Select
                label={t('dashboard.filter_class')}
                placeholder={t('dashboard.filter_class_all')}
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
                label={t('admin.add_student')}
                leftSection={<IconPlus size={16} />}
                disabled={false}
                onClick={() => setCreateOpen(true)}
              />
              <ButtonLight
                size="sm"
                label={t('common.refresh')}
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
              {t('common.selected_count', { count: selectedIds.size })}
            </Text>
            <Button
              color="red"
              variant="light"
              leftSection={<IconTrash size={16} />}
              loading={bulkDeleting}
              onClick={() => void handleBulkDelete()}
            >
              {t('common.bulk_delete')}
            </Button>
            <Button variant="subtle" size="compact-sm" onClick={() => setSelectedIds(new Set())}>
              {t('common.clear_selection')}
            </Button>
          </Group>
        )}

        <Paper withBorder radius="md">
          <Box
            px="sm"
            py="xs"
            style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}
          >
            <Select
              label={t('pagination.page_size_label')}
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
          </Box>

          <Box pos="relative" style={{ minHeight: 80 }}>
            {refreshing && (
              <Center
                pos="absolute"
                inset={0}
                style={{ zIndex: 2, background: 'color-mix(in srgb, var(--mantine-color-body) 70%, transparent)' }}
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
                  <Table.Th>{t('common.role')}</Table.Th>
                  <Table.Th>{t('teacher_students.col_code')}</Table.Th>
                  <Table.Th>{t('teacher_students.col_name')}</Table.Th>
                  <Table.Th>{t('common.homeroom_teacher')}</Table.Th>
                  <Table.Th>{t('teacher_students.col_email')}</Table.Th>
                  <Table.Th>{t('teacher_students.col_password')}</Table.Th>
                  <Table.Th>{t('teacher_students.col_status')}</Table.Th>
                  <Table.Th>{t('common.actions')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {students.map((s, idx) => (
                  <Table.Tr key={s.id} bg={selectedIds.has(s.id) ? 'var(--mantine-color-teal-light)' : undefined}>
                    <Table.Td>
                      <Checkbox
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleStudentSelected(s.id)}
                      />
                    </Table.Td>
                    <Table.Td>{(page - 1) * pageSize + idx + 1}</Table.Td>
                    <Table.Td>
                      <Badge
                        size="sm"
                        variant="light"
                        color={s.role === 'teacher' ? 'blue' : 'teal'}
                      >
                        {s.role === 'teacher' ? t('roles.teacher') : t('roles.student')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" ff="monospace">
                        {s.username}
                      </Text>
                    </Table.Td>
                    <Table.Td>{s.full_name || '—'}</Table.Td>
                    <Table.Td>
                      <Text size="sm" lineClamp={2}>
                        {s.role === 'student'
                          ? s.homeroom_teacher_name || '—'
                          : s.managed_class_names || '—'}
                      </Text>
                    </Table.Td>
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
                        {(s.role === 'student' || s.role === 'teacher' || s.role === 'admin') && (
                          <Tooltip label={t('admin.reset_password_tooltip')}>
                            <ActionIcon
                              color="orange"
                              variant="light"
                              loading={resettingPasswordId === s.id}
                              onClick={() => void handleAdminResetPassword(s)}
                            >
                              <IconKey size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
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
                    <Table.Td colSpan={10}>
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
            label={t('common.email')}
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
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('admin.create_user_title')}
      >
        <Stack gap="sm">
          <Select
            label={t('common.role')}
            value={createForm.role}
            onChange={(v) =>
              setCreateForm((p) => ({
                ...p,
                role: (v as 'student' | 'teacher') || 'student',
              }))
            }
            data={[
              { value: 'student', label: t('roles.student') },
              { value: 'teacher', label: t('roles.teacher') },
            ]}
            allowDeselect={false}
          />
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
            label={t('common.email')}
            value={createForm.email}
            onChange={(e) => setCreateForm((p) => ({ ...p, email: e.currentTarget.value }))}
          />
          {createForm.role === 'student' && (
            <Select
              label={t('dashboard.filter_class')}
              placeholder={t('admin.select_class_optional')}
              data={classFilterOptions.filter((o) => o.value !== '')}
              value={createForm.admin_class_id || null}
              onChange={(v) => setCreateForm((p) => ({ ...p, admin_class_id: v ?? '' }))}
              clearable
              searchable
            />
          )}
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
