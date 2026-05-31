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
  ActionIcon,
  Select,
  Button,
  NumberInput,
  Tabs,
  Checkbox,
  FileButton,
} from '@mantine/core';
import {
  IconPlus,
  IconTrash,
  IconArrowLeft,
  IconDownload,
  IconUpload,
} from '@tabler/icons-react';
import PageHeader from '@/components/PageHeader/PageHeader';
import InputText from '@/components/Input/InputText/InputText';
import { ListPaginationBar } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, pageToOffset } from '@/utils/pagination';
import adminClassApi, { type AdminClassDto, type ImportPreviewRow } from '@/services/adminClassApi';
import programApi, { type ProgramDto } from '@/services/programApi';
import userApi from '@/services/userApi';
import { useTranslation } from 'react-i18next';

const AdminClassManagement = () => {
  const { t } = useTranslation();
  const [classes, setClasses] = useState<AdminClassDto[]>([]);
  const [programs, setPrograms] = useState<ProgramDto[]>([]);
  const [teachers, setTeachers] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminClassDto | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [programId, setProgramId] = useState<string | null>(null);
  const [intakeYear, setIntakeYear] = useState(16);
  const [section, setSection] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [managerId, setManagerId] = useState<string | null>(null);
  const [expectedSize, setExpectedSize] = useState(0);

  const [students, setStudents] = useState<{ id: string; username: string; full_name: string | null; email: string }[]>([]);
  const [stuPage, setStuPage] = useState(1);
  const [stuTotal, setStuTotal] = useState(0);
  const [stuSearch, setStuSearch] = useState('');
  const [stuLoading, setStuLoading] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<string | null>('pick');
  const [unassigned, setUnassigned] = useState<{ id: string; username: string; full_name: string | null; email: string }[]>([]);
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [pickIds, setPickIds] = useState<Set<string>>(new Set());
  const [allowTransfer, setAllowTransfer] = useState(false);
  const [transferFromClass, setTransferFromClass] = useState<string | null>(null);
  const [transferStudents, setTransferStudents] = useState<{ id: string; username: string; full_name: string | null; email: string }[]>([]);

  const [manualForm, setManualForm] = useState({ username: '', email: '', full_name: '', password: '' });
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      setClasses(await adminClassApi.getClasses());
      setError('');
    } catch {
      setError('Không tải được danh sách lớp.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
    void programApi.getPrograms().then(setPrograms);
    void userApi.getUsers({ role: 'teacher', limit: 200 }).then((list) =>
      setTeachers(
        list.map((t) => ({
          value: t.id,
          label: `${t.full_name || t.username} (${t.email})`,
        }))
      )
    );
  }, [loadList]);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const d = await adminClassApi.getClass(id);
      setDetail(d);
    } catch {
      setError('Không tải chi tiết lớp.');
    }
  }, []);

  const loadStudents = useCallback(async () => {
    if (!selectedId) return;
    try {
      setStuLoading(true);
      const r = await adminClassApi.listStudents(selectedId, {
        limit: DEFAULT_PAGE_SIZE,
        offset: pageToOffset(stuPage, DEFAULT_PAGE_SIZE),
        search: stuSearch || undefined,
      });
      setStudents(r.items);
      setStuTotal(r.total);
    } finally {
      setStuLoading(false);
    }
  }, [selectedId, stuPage, stuSearch]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (selectedId) void loadStudents();
  }, [loadStudents, selectedId]);

  const openCreate = () => {
    setProgramId(programs[0]?.id ?? null);
    setIntakeYear(16);
    setSection('');
    setDisplayName('');
    setManagerId(null);
    setExpectedSize(0);
    setFormOpen(true);
  };

  const buildDisplayName = () => {
    const p = programs.find((x) => x.id === programId);
    if (!p || !section.trim()) return displayName;
    return `${p.code} ${intakeYear}-${section.trim().padStart(2, '0')}`;
  };

  const handleSaveClass = async () => {
    if (!programId || !section.trim()) return;
    const name = displayName.trim() || buildDisplayName();
    try {
      await adminClassApi.createClass({
        program_id: programId,
        intake_year: intakeYear,
        section: section.trim(),
        display_name: name,
        manager_teacher_id: managerId,
        expected_size: expectedSize,
      });
      setNotice('Đã tạo lớp.');
      setFormOpen(false);
      void loadList();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Tạo lớp thất bại.');
    }
  };

  const openAddStudents = async () => {
    setAddTab('pick');
    setPickIds(new Set());
    setAllowTransfer(false);
    setImportPreview([]);
    setImportFile(null);
    setManualForm({ username: '', email: '', full_name: '', password: '' });
    try {
      const r = await adminClassApi.listUnassigned({ limit: 100, offset: 0 });
      setUnassigned(r.items);
    } catch {
      setUnassigned([]);
    }
    setAddOpen(true);
  };

  const loadTransferStudents = async (fromClassId: string) => {
    try {
      const r = await adminClassApi.listStudents(fromClassId, { limit: 200, offset: 0 });
      setTransferStudents(r.items);
    } catch {
      setTransferStudents([]);
    }
  };

  const handleAssignPicked = async () => {
    if (!selectedId || pickIds.size === 0) return;
    try {
      const result = await adminClassApi.assignStudents(selectedId, [...pickIds], allowTransfer);
      setNotice(`Đã gán ${result.assigned} sinh viên.`);
      setAddOpen(false);
      void loadStudents();
      void loadDetail(selectedId);
      void loadList();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Gán sinh viên thất bại.');
    }
  };

  const handleManualAdd = async () => {
    if (!selectedId) return;
    try {
      await adminClassApi.addManualStudent(selectedId, {
        ...manualForm,
        allow_transfer: allowTransfer,
      });
      setNotice('Đã thêm sinh viên.');
      setAddOpen(false);
      void loadStudents();
      void loadDetail(selectedId);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Thêm thất bại.');
    }
  };

  const handleImportPreview = async (file: File | null) => {
    if (!file || !selectedId) return;
    setImportFile(file);
    try {
      const rows = await adminClassApi.importPreview(selectedId, file, allowTransfer);
      setImportPreview(rows);
      setAddTab('excel');
    } catch {
      setError('Không đọc được file Excel.');
    }
  };

  const importConfirmable = useMemo(
    () =>
      importPreview.filter(
        (r) => r.status === 'ok' || r.status === 'warn_transfer' || r.status === 'will_create'
      ),
    [importPreview]
  );

  const handleImportConfirm = async () => {
    if (!selectedId || importConfirmable.length === 0) return;
    const studentIds = importPreview
      .filter((r) => (r.status === 'ok' || r.status === 'warn_transfer') && r.student_id)
      .map((r) => r.student_id!);
    const creates = importPreview
      .filter((r) => r.status === 'will_create')
      .map((r) => ({
        username: r.username.trim(),
        email: r.email.trim(),
        full_name: r.full_name.trim() || undefined,
      }));
    try {
      const result = await adminClassApi.importConfirm(selectedId, {
        studentIds,
        creates,
        allowTransfer,
      });
      const parts: string[] = [];
      if (result.assigned > 0) parts.push(`gán ${result.assigned}`);
      if (result.created > 0) parts.push(`tạo mới ${result.created}`);
      const errCount =
        result.skipped.length + (result.create_errors?.length ?? 0);
      if (errCount > 0) parts.push(`${errCount} dòng lỗi/bỏ qua`);
      setNotice(parts.length ? `Import: ${parts.join(', ')}.` : 'Không có dòng nào được xử lý.');
      if (result.create_errors?.length) {
        setError(
          result.create_errors.map((e) => `${e.username}: ${e.reason}`).join('; ')
        );
      }
      setAddOpen(false);
      void loadStudents();
      void loadDetail(selectedId);
    } catch {
      setError('Import thất bại.');
    }
  };

  const downloadTemplate = async () => {
    const blob = await adminClassApi.downloadTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mau-import-sinh-vien-lop.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredUnassigned = useMemo(() => {
    const q = unassignedSearch.trim().toLowerCase();
    if (!q) return unassigned;
    return unassigned.filter(
      (s) =>
        s.username.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.full_name ?? '').toLowerCase().includes(q)
    );
  }, [unassigned, unassignedSearch]);

  if (selectedId && detail) {
    const overCapacity =
      detail.expected_size > 0 && (detail.student_count ?? 0) > detail.expected_size;
    return (
      <Box className="max-w-[1200px] mx-auto p-4">
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} mb="md" onClick={() => setSelectedId(null)}>
          Danh sách lớp
        </Button>
        {notice && <Alert color="green" mb="md" onClose={() => setNotice('')}>{notice}</Alert>}
        {error && <Alert color="red" mb="md" onClose={() => setError('')}>{error}</Alert>}

        <PageHeader
          title={detail.display_name}
          subtitle={`${detail.program_name || detail.program_code} · Khóa ${detail.intake_year} · Tổ ${detail.section}`}
          accent="teal"
        />

        <Paper withBorder p="md" mb="md">
          <Group justify="space-between" wrap="wrap">
            <Stack gap={4}>
              <Text size="sm">
                Chủ nhiệm: <strong>{detail.manager_name || '—'}</strong>
              </Text>
              <Text size="sm">
                Sĩ số: <strong>{detail.student_count ?? 0}</strong>
                {detail.expected_size > 0 && (
                  <>
                    {' '}
                    / {detail.expected_size} <Text span size="xs" c="dimmed">(khai báo)</Text>
                  </>
                )}
                {overCapacity && (
                  <Badge color="orange" ml="xs" size="sm">
                    Vượt sĩ số khai báo
                  </Badge>
                )}
              </Text>
            </Stack>
            <Button color="teal" leftSection={<IconPlus size={16} />} onClick={() => void openAddStudents()}>
              Thêm sinh viên
            </Button>
          </Group>
        </Paper>

        <Paper withBorder>
          <Group p="sm" justify="space-between">
            <InputText
              placeholder="Tìm trong lớp..."
              value={stuSearch}
              onChange={(e) => {
                setStuSearch(e.currentTarget.value);
                setStuPage(1);
              }}
              style={{ maxWidth: 280 }}
            />
          </Group>
          {stuLoading ? (
            <Loader p="xl" />
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Mã</Table.Th>
                  <Table.Th>Họ tên</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {students.map((s) => (
                  <Table.Tr key={s.id}>
                    <Table.Td>{s.username}</Table.Td>
                    <Table.Td>{s.full_name || '—'}</Table.Td>
                    <Table.Td>{s.email}</Table.Td>
                    <Table.Td>
                      <ActionIcon
                        color="red"
                        variant="light"
                        onClick={async () => {
                          if (!confirm('Gỡ sinh viên khỏi lớp?')) return;
                          await adminClassApi.removeStudent(selectedId, s.id);
                          void loadStudents();
                          void loadDetail(selectedId);
                        }}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
          <ListPaginationBar page={stuPage} total={stuTotal} limit={DEFAULT_PAGE_SIZE} onPageChange={setStuPage} showPageSize={false} />
        </Paper>

        <Modal opened={addOpen} onClose={() => setAddOpen(false)} title="Thêm sinh viên vào lớp" size="xl">
          <Checkbox
            label="Cho phép chuyển từ lớp khác"
            checked={allowTransfer}
            onChange={(e) => setAllowTransfer(e.currentTarget.checked)}
            mb="md"
          />
          <Tabs value={addTab} onChange={setAddTab}>
            <Tabs.List>
              <Tabs.Tab value="pick">Chọn danh sách</Tabs.Tab>
              <Tabs.Tab value="manual">Thêm tay</Tabs.Tab>
              <Tabs.Tab value="excel">Import Excel</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="pick" pt="md">
              <Select
                label="Hoặc chuyển từ lớp"
                placeholder="Chọn lớp nguồn"
                data={classes.filter((c) => c.id !== selectedId).map((c) => ({ value: c.id, label: c.display_name }))}
                value={transferFromClass}
                onChange={(v) => {
                  setTransferFromClass(v);
                  if (v) void loadTransferStudents(v);
                  else setTransferStudents([]);
                }}
                clearable
                mb="sm"
              />
              {transferFromClass ? (
                <Stack gap="xs" mb="md" mah={200} style={{ overflow: 'auto' }}>
                  {transferStudents.map((s) => (
                    <Checkbox
                      key={s.id}
                      label={`${s.username} — ${s.full_name || s.email}`}
                      checked={pickIds.has(s.id)}
                      onChange={() => {
                        setPickIds((prev) => {
                          const n = new Set(prev);
                          if (n.has(s.id)) n.delete(s.id);
                          else n.add(s.id);
                          return n;
                        });
                      }}
                    />
                  ))}
                </Stack>
              ) : (
                <>
                  <InputText
                    placeholder="Tìm SV chưa có lớp..."
                    value={unassignedSearch}
                    onChange={(e) => setUnassignedSearch(e.currentTarget.value)}
                    mb="sm"
                  />
                  <Stack gap="xs" mah={220} style={{ overflow: 'auto' }}>
                    {filteredUnassigned.map((s) => (
                      <Checkbox
                        key={s.id}
                        label={`${s.username} — ${s.full_name || s.email}`}
                        checked={pickIds.has(s.id)}
                        onChange={() => {
                          setPickIds((prev) => {
                            const n = new Set(prev);
                            if (n.has(s.id)) n.delete(s.id);
                            else n.add(s.id);
                            return n;
                          });
                        }}
                      />
                    ))}
                  </Stack>
                </>
              )}
              <Button mt="md" onClick={() => void handleAssignPicked()} disabled={pickIds.size === 0}>
                Gán {pickIds.size} sinh viên
              </Button>
            </Tabs.Panel>
            <Tabs.Panel value="manual" pt="md">
              <Stack gap="sm">
                <InputText label="Mã SV" value={manualForm.username} onChange={(e) => setManualForm((p) => ({ ...p, username: e.currentTarget.value }))} />
                <InputText label="Email" value={manualForm.email} onChange={(e) => setManualForm((p) => ({ ...p, email: e.currentTarget.value }))} />
                <InputText label="Họ tên" value={manualForm.full_name} onChange={(e) => setManualForm((p) => ({ ...p, full_name: e.currentTarget.value }))} />
                <InputText label="Mật khẩu (nếu tạo mới)" value={manualForm.password} onChange={(e) => setManualForm((p) => ({ ...p, password: e.currentTarget.value }))} />
                <Button onClick={() => void handleManualAdd()}>Thêm</Button>
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value="excel" pt="md">
              <Group mb="md">
                <Button variant="light" leftSection={<IconDownload size={16} />} onClick={() => void downloadTemplate()}>
                  Tải file mẫu
                </Button>
                <FileButton onChange={(f) => void handleImportPreview(f)} accept=".xlsx,.xls">
                  {(props) => (
                    <Button {...props} leftSection={<IconUpload size={16} />}>
                      Chọn file Excel
                    </Button>
                  )}
                </FileButton>
              </Group>
              {importFile && <Text size="sm" mb="xs">{importFile.name}</Text>}
              {importPreview.length > 0 && (
                <>
                  <Text size="sm" c="dimmed" mb="xs">
                    Tên có thể trùng; mã SV và email không được trùng. Dòng lỗi (đỏ) sẽ bỏ qua khi xác nhận.
                  </Text>
                  <Table striped>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Dòng</Table.Th>
                        <Table.Th>Mã SV</Table.Th>
                        <Table.Th>Email</Table.Th>
                        <Table.Th>Trạng thái</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {importPreview.map((r) => (
                        <Table.Tr key={r.row}>
                          <Table.Td>{r.row}</Table.Td>
                          <Table.Td>{r.username || '—'}</Table.Td>
                          <Table.Td>{r.email}</Table.Td>
                          <Table.Td>
                            <Badge
                              color={
                                r.status === 'ok'
                                  ? 'green'
                                  : r.status === 'will_create'
                                    ? 'blue'
                                    : r.status === 'warn_transfer'
                                      ? 'orange'
                                      : 'red'
                              }
                            >
                              {r.message}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                  <Button
                    mt="md"
                    onClick={() => void handleImportConfirm()}
                    disabled={importConfirmable.length === 0}
                  >
                    Xác nhận import ({importConfirmable.length} dòng)
                  </Button>
                </>
              )}
            </Tabs.Panel>
          </Tabs>
        </Modal>
      </Box>
    );
  }

  return (
    <Box className="max-w-[1200px] mx-auto p-4">
      <PageHeader
        title={t('admin_class.title')}
        subtitle={t('admin_class.subtitle')}
        accent="teal"
      />
      {notice && <Alert color="green" mb="md" onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert color="red" mb="md" onClose={() => setError('')}>{error}</Alert>}

      <Group justify="flex-end" mb="md">
        <Button leftSection={<IconPlus size={16} />} color="teal" onClick={openCreate}>
          Tạo lớp
        </Button>
      </Group>

      {loading ? (
        <Loader />
      ) : (
        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Tên lớp</Table.Th>
                <Table.Th>Chuyên ngành</Table.Th>
                <Table.Th>Chủ nhiệm</Table.Th>
                <Table.Th>Sĩ số</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {classes.map((c) => (
                <Table.Tr key={c.id}>
                  <Table.Td>
                    <Text fw={600}>{c.display_name}</Text>
                  </Table.Td>
                  <Table.Td>{c.program_name || c.program_code}</Table.Td>
                  <Table.Td>{c.manager_name || '—'}</Table.Td>
                  <Table.Td>
                    {(() => {
                      const n = c.student_count ?? 0;
                      const cap = c.expected_size ?? 0;
                      return cap > 0 ? `${n}/${cap}` : String(n);
                    })()}
                  </Table.Td>
                  <Table.Td>
                    <Button size="compact-sm" variant="light" onClick={() => setSelectedId(c.id)}>
                      Chi tiết
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      <Modal opened={formOpen} onClose={() => setFormOpen(false)} title="Tạo lớp mới">
        <Stack gap="sm">
          <Select
            label="Chuyên ngành"
            data={programs.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
            value={programId}
            onChange={setProgramId}
            searchable
            required
          />
          <Group grow>
            <NumberInput label="Khóa" value={intakeYear} onChange={(v) => setIntakeYear(Number(v) || 0)} min={1} />
            <InputText label="Tổ" value={section} onChange={(e) => setSection(e.currentTarget.value)} />
          </Group>
          <InputText
            label="Tên hiển thị"
            value={displayName}
            placeholder={buildDisplayName()}
            onChange={(e) => setDisplayName(e.currentTarget.value)}
          />
          <Select
            label="Giáo viên chủ nhiệm"
            data={teachers}
            value={managerId}
            onChange={setManagerId}
            clearable
            searchable
            placeholder="Chọn GV (tối đa 2 lớp/GV)"
          />
          <NumberInput
            label="Sĩ số khai báo (0 = chỉ hiển thị số SV thực tế)"
            value={expectedSize}
            onChange={(v) => setExpectedSize(Math.max(0, Number(v) || 0))}
            min={0}
          />
          <Button color="teal" onClick={() => void handleSaveClass()}>
            Lưu
          </Button>
        </Stack>
      </Modal>
    </Box>
  );
};

export default AdminClassManagement;
