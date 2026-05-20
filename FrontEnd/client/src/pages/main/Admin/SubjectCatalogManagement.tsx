import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Title,
  Table,
  Modal,
  Group,
  Stack,
  Text,
  Loader,
  Badge,
  Paper,
  ActionIcon,
  TextInput,
  Textarea,
  NumberInput,
  Select,
  Switch,
  MultiSelect,
  Button,
  Container,
  ScrollArea,
  Divider,
  Checkbox,
  Tabs,
} from '@mantine/core';
import { IconPlus, IconTrash, IconEdit, IconSearch, IconFolders } from '@tabler/icons-react';
import { ListPaginationBar } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, pageToOffset } from '@/utils/pagination';
import subjectApi from '@/services/subjectApi';
import programApi, { type ProgramDto } from '@/services/programApi';
import { useSubjectPickerCatalog } from '@/hooks/useSubjectPickerCatalog';
import useAuth from '@/hooks/useAuth';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';

interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number;
  category: string;
  sub_category?: string | null;
  subject_group_id?: string | null;
  program_id?: string | null;
  prerequisites?: { id: string; name: string; code: string }[];
  is_active: boolean;
  created_at: string;
}

interface SubjectFormData {
  name: string;
  code: string;
  credits: number;
  semester: number;
  category: string;
  sub_category: string | null;
  subject_group_id: string | null;
  program_id: string;
  prerequisite_ids: string[];
  is_active: boolean;
}

type CatalogGroupRow = { id: string; label: string; subject_count: number };

const CATEGORIES = [
  { value: 'general', label: 'Tổng quát' },
  { value: 'programming', label: 'Lập trình' },
  { value: 'math', label: 'Toán' },
  { value: 'english', label: 'Tiếng Anh' },
  { value: 'network', label: 'Mạng' },
  { value: 'ai_ml', label: 'AI / ML' },
  { value: 'software_eng', label: 'Công nghệ phần mềm' },
];

const fullScreenModalProps = {
  fullScreen: true,
  transitionProps: { transition: 'slide-up' as const, duration: 200 },
  padding: 0,
};

const GroupNameBadge = ({
  catalogGroups,
  subCategory,
}: {
  catalogGroups: CatalogGroupRow[];
  subCategory?: string | null;
}) => {
  const g = subCategory ? catalogGroups.find((x) => x.id === subCategory) : null;
  const label = g?.label ?? subCategory ?? null;
  if (!label) {
    return (
      <Badge size="sm" variant="light" color="gray">
        Chưa phân nhóm
      </Badge>
    );
  }
  return (
    <Badge size="sm" variant="light" color="teal">
      {label}
    </Badge>
  );
};

const CategoryBadge = ({ category }: { category: string }) => {
  const colors: Record<string, string> = {
    general: 'gray',
    programming: 'blue',
    math: 'violet',
    english: 'green',
    network: 'orange',
    ai_ml: 'red',
    software_eng: 'teal',
  };
  const labels: Record<string, string> = {
    general: 'Tổng quát',
    programming: 'Lập trình',
    math: 'Toán',
    english: 'Tiếng Anh',
    network: 'Mạng',
    ai_ml: 'AI/ML',
    software_eng: 'CNPM',
  };
  return (
    <Badge size="sm" variant="light" color={colors[category] || 'gray'}>
      {labels[category] || category}
    </Badge>
  );
};

const SubjectCatalogManagementPage = () => {
  const { accessToken } = useAuth();
  const [programs, setPrograms] = useState<ProgramDto[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { catalog, loading: catalogLoading, error: catalogError } = useSubjectPickerCatalog();
  const catalogGroups: CatalogGroupRow[] = catalog.map((g) => ({
    id: g.id,
    label: g.label,
    subject_count: g.subjects.length,
  }));
  const [activeTab, setActiveTab] = useState<string | null>('groups');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const loadPrograms = useCallback(async () => {
    try {
      const list = await programApi.getPrograms();
      setPrograms(list);
      setSelectedProgramId((prev) => {
        if (prev && list.some((p) => p.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch {
      setError('Không tải được danh sách chuyên ngành.');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (accessToken) void loadPrograms();
  }, [accessToken, loadPrograms]);

  useEffect(() => {
    if (catalogError) setError(catalogError);
  }, [catalogError]);

  useEffect(() => {
    setSelectedGroupId((prev) => {
      if (prev && catalogGroups.some((g) => g.id === prev)) return prev;
      return null;
    });
  }, [catalogGroups]);

  const fetchSubjects = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      const data = await subjectApi.listSubjects({
        limit: pageSize,
        offset: pageToOffset(page, pageSize),
        search: debouncedSearch || undefined,
        program_id: selectedProgramId ?? undefined,
        catalog_group: selectedGroupId ?? undefined,
      });
      setSubjects(data.items as Subject[]);
      setTotal(data.total);
    } catch {
      setError('Không tải được danh sách môn học.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, pageSize, debouncedSearch, selectedProgramId, selectedGroupId]);

  useEffect(() => {
    void fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, debouncedSearch, selectedProgramId, selectedGroupId]);

  useEffect(() => {
    if (!accessToken) return;
    void subjectApi
      .getSubjects()
      .then((list) => setAllSubjects(list as Subject[]))
      .catch(() => {});
  }, [accessToken]);

  const pageIds = subjects.map((s) => s.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));

  const toggleSelectAllPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (
      !confirm(
        `Xóa ${ids.length} môn đã chọn? Môn đang dùng trong đề thi hoặc lớp học sẽ không xóa được.`
      )
    ) {
      return;
    }
    setBulkDeleting(true);
    setError('');
    try {
      const result = await subjectApi.bulkDeleteSubjects(ids);
      setSelectedIds(new Set());
      if (result.failed.length > 0) {
        setNotice(`Đã xóa ${result.deleted} môn. ${result.failed.length} môn không xóa được.`);
        setError(
          result.failed
            .slice(0, 5)
            .map((f) => f.reason)
            .join(' · ')
        );
      } else {
        setNotice(`Đã xóa ${result.deleted} môn học.`);
      }
      void fetchSubjects();
      void loadPrograms();
      void subjectApi.getSubjects().then((list) => setAllSubjects(list as Subject[]));
    } catch {
      setError('Xóa hàng loạt thất bại.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa môn học này? Hành động này không thể hoàn tác.')) return;
    try {
      await subjectApi.deleteSubject(id);
      setNotice('Đã xóa môn học.');
      void fetchSubjects();
      void loadPrograms();
    } catch {
      setError('Không xóa được môn học.');
    }
  };

  const openEdit = async (subject: Subject) => {
    try {
      const detail = await subjectApi.getSubject(subject.id);
      setEditingSubject(detail as Subject);
      setEditOpen(true);
    } catch {
      setEditingSubject(subject);
      setEditOpen(true);
    }
  };

  const handleCreate = async (data: SubjectFormData) => {
    try {
      await subjectApi.createSubject({
        name: data.name,
        code: data.code,
        credits: data.credits,
        semester: data.semester,
        category: data.category,
        sub_category: data.sub_category,
        subject_group_id: data.subject_group_id,
        program_id: data.program_id,
        prerequisite_ids: data.prerequisite_ids,
      });
      setCreateOpen(false);
      setNotice('Đã tạo môn học.');
      void fetchSubjects();
      void loadPrograms();
    } catch {
      setError('Không tạo được môn học.');
    }
  };

  const handleUpdate = async (id: string, data: SubjectFormData) => {
    try {
      await subjectApi.updateSubject(id, {
        name: data.name,
        code: data.code,
        credits: data.credits,
        semester: data.semester,
        category: data.category,
        sub_category: data.sub_category,
        subject_group_id: data.subject_group_id,
        program_id: data.program_id,
        prerequisite_ids: data.prerequisite_ids,
        is_active: data.is_active,
      });
      setEditOpen(false);
      setNotice('Đã cập nhật môn học.');
      void fetchSubjects();
    } catch {
      setError('Không cập nhật được môn học.');
    }
  };

  const programOptions = programs.map((p) => ({
    value: p.id,
    label: `${p.code} — ${p.name} (${p.subject_count ?? 0} môn)`,
  }));

  const subjectsInProgram = selectedProgramId
    ? allSubjects.filter((s) => s.program_id === selectedProgramId)
    : [];

  const subjectsInGroup = selectedGroupId
    ? subjectsInProgram.filter((s) => s.sub_category === selectedGroupId)
    : subjectsInProgram;

  const groupOptions = catalogGroups.map((g) => ({
    value: g.id,
    label: `${g.label} (${g.subject_count} môn)`,
  }));

  const selectedProgram = programs.find((p) => p.id === selectedProgramId);
  const selectedGroup = catalogGroups.find((g) => g.id === selectedGroupId);
  const canManageSubjects = Boolean(selectedProgramId && selectedGroupId);

  return (
    <Box className="min-h-[calc(100vh-80px)] p-4">
      <Stack gap="md" maw={1400} mx="auto">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Box>
            <Title order={2}>Quản lý nhóm môn & môn học</Title>
            <Text c="dimmed" size="sm" mt={4}>
              Nhóm môn lấy từ catalog thống nhất (API /subjects/picker-catalog) — đồng bộ với dự đoán điểm, ngân hàng câu hỏi và soạn đề.
            </Text>
          </Box>
          {activeTab === 'subjects' && (
            <ButtonFilled
              label="Thêm môn học"
              leftSection={<IconPlus size={16} />}
              disabled={!canManageSubjects}
              onClick={() => setCreateOpen(true)}
            />
          )}
        </Group>

        {error && (
          <Badge color="red" size="lg" style={{ whiteSpace: 'normal', height: 'auto', padding: 8 }}>
            {error}
          </Badge>
        )}
        {notice && (
          <Badge color="green" size="lg" style={{ whiteSpace: 'normal', height: 'auto', padding: 8 }}>
            {notice}
          </Badge>
        )}

        <Paper withBorder radius="md" p="md">
          <Group align="flex-end" wrap="wrap" grow>
            <Select
              label="Chuyên ngành"
              placeholder="Chọn ngành"
              data={programOptions}
              value={selectedProgramId}
              onChange={(v) => {
                setSelectedProgramId(v);
                setSelectedGroupId(null);
                setPage(1);
              }}
              searchable
              style={{ minWidth: 220, flex: 1 }}
            />
          </Group>
          {selectedProgram && (
            <Text size="sm" c="dimmed" mt="sm">
              Chuyên ngành: <strong>{selectedProgram.name}</strong>
              {selectedGroup && (
                <>
                  {' '}
                  › <strong>{selectedGroup.label}</strong>
                </>
              )}
            </Text>
          )}
        </Paper>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="groups" leftSection={<IconFolders size={16} />}>
              Nhóm môn
            </Tabs.Tab>
            <Tabs.Tab value="subjects" leftSection={<IconPlus size={16} />}>
              Môn học
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="groups" pt="md">
            {!selectedProgramId ? (
              <Paper withBorder p="xl">
                <Text c="dimmed" ta="center">
                  Chọn chuyên ngành ở trên để quản lý nhóm môn.
                </Text>
              </Paper>
            ) : catalogLoading ? (
              <Loader />
            ) : (
              <Paper withBorder radius="md">
                <Text size="sm" c="dimmed" p="md">
                  Danh sách nhóm chỉ đọc từ catalog hệ thống. Chỉnh sửa cấu trúc nhóm trong{' '}
                  <Text span ff="monospace" fw={600}>
                    subject_groups.json
                  </Text>{' '}
                  trên server.
                </Text>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Mã nhóm</Table.Th>
                      <Table.Th>Tên nhóm môn</Table.Th>
                      <Table.Th>Số môn</Table.Th>
                      <Table.Th>Thao tác</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {catalogGroups.map((g) => (
                      <Table.Tr key={g.id}>
                        <Table.Td>
                          <Text ff="monospace" fw={600}>
                            {g.id}
                          </Text>
                        </Table.Td>
                        <Table.Td>{g.label}</Table.Td>
                        <Table.Td>{g.subject_count}</Table.Td>
                        <Table.Td>
                          <Button
                            size="compact-sm"
                            variant="light"
                            onClick={() => {
                              setSelectedGroupId(g.id);
                              setActiveTab('subjects');
                            }}
                          >
                            Xem môn
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                    {catalogGroups.length === 0 && (
                      <Table.Tr>
                        <Table.Td colSpan={4}>
                          <Text c="dimmed" ta="center" py="md">
                            Không tải được catalog nhóm môn.
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              </Paper>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="subjects" pt="md">
            {selectedProgramId && (
              <Group align="flex-end" mb="md" wrap="wrap">
                <Select
                  label="Nhóm môn"
                  placeholder="Chọn nhóm để xem môn"
                  data={groupOptions}
                  value={selectedGroupId}
                  onChange={(v) => {
                    setSelectedGroupId(v);
                    setPage(1);
                  }}
                  searchable
                  style={{ minWidth: 280 }}
                />
                <TextInput
                  label="Tìm môn"
                  placeholder="Tên hoặc mã môn..."
                  leftSection={<IconSearch size={14} />}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.currentTarget.value);
                    setPage(1);
                  }}
                  style={{ minWidth: 260 }}
                />
              </Group>
            )}

        {selectedIds.size > 0 && (
          <Group>
            <Text size="sm" c="dimmed">
              Đã chọn {selectedIds.size} môn
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

        {!selectedProgramId ? (
          <Paper withBorder radius="md" p="xl">
            <Text c="dimmed" ta="center">
              Bước 1: Chọn hoặc tạo chuyên ngành để bắt đầu.
            </Text>
          </Paper>
        ) : !selectedGroupId ? (
          <Paper withBorder radius="md" p="xl">
            <Text c="dimmed" ta="center">
              Bước 2: Chọn nhóm môn trong ngành{' '}
              <strong>{selectedProgram?.name ?? ''}</strong> để xem danh sách môn.
            </Text>
          </Paper>
        ) : loading ? (
          <Loader />
        ) : (
          <Paper withBorder radius="md">
            <ListPaginationBar
              page={page}
              total={total}
              limit={pageSize}
              onPageChange={setPage}
              onLimitChange={(next) => {
                setPageSize(next);
                setPage(1);
              }}
            />
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={44}>
                    <Checkbox
                      checked={allPageSelected}
                      indeterminate={somePageSelected && !allPageSelected}
                      onChange={toggleSelectAllPage}
                      aria-label="Chọn tất cả trang này"
                    />
                  </Table.Th>
                  <Table.Th>Tên môn</Table.Th>
                  <Table.Th>Mã</Table.Th>
                  <Table.Th>Tín chỉ</Table.Th>
                  <Table.Th>Học kỳ</Table.Th>
                  <Table.Th>Nhóm môn</Table.Th>
                  <Table.Th>Loại</Table.Th>
                  <Table.Th>Tiên quyết</Table.Th>
                  <Table.Th>Trạng thái</Table.Th>
                  <Table.Th>Thao tác</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {subjects.map((subject) => (
                  <Table.Tr
                    key={subject.id}
                    bg={selectedIds.has(subject.id) ? 'var(--mantine-color-teal-light)' : undefined}
                  >
                    <Table.Td>
                      <Checkbox
                        checked={selectedIds.has(subject.id)}
                        onChange={() => toggleSelectRow(subject.id)}
                        aria-label={`Chọn ${subject.name}`}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500}>{subject.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {subject.code || '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{subject.credits}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{subject.semester}</Text>
                    </Table.Td>
                    <Table.Td>
                      <GroupNameBadge
                        catalogGroups={catalogGroups}
                        subCategory={subject.sub_category}
                      />
                    </Table.Td>
                    <Table.Td>
                      <CategoryBadge category={subject.category} />
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed" lineClamp={2}>
                        {(subject.prerequisites?.length ?? 0) > 0
                          ? subject.prerequisites!.map((p) => p.name).join(', ')
                          : '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={subject.is_active ? 'green' : 'gray'} size="sm">
                        {subject.is_active ? 'Hoạt động' : 'Không hoạt động'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <ActionIcon variant="subtle" color="blue" onClick={() => void openEdit(subject)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="red" onClick={() => void handleDelete(subject.id)}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {subjects.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={10}>
                      <Text c="dimmed" ta="center" py="lg">
                        Chưa có môn trong nhóm «{selectedGroup?.label ?? 'đã chọn'}». Bấm «Thêm môn học».
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        )}
          </Tabs.Panel>
        </Tabs>
      </Stack>

      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Thêm môn học"
        {...fullScreenModalProps}
      >
        <ScrollArea h="100vh" type="auto">
          <Container size="md" py="xl" pb={80}>
            <SubjectForm
              programs={programs}
              catalogGroups={catalogGroups}
              defaultProgramId={selectedProgramId}
              defaultCatalogGroupId={selectedGroupId}
              allSubjects={subjectsInProgram}
              onSubmit={(data) => void handleCreate(data)}
              onCancel={() => setCreateOpen(false)}
            />
          </Container>
        </ScrollArea>
      </Modal>

      <Modal opened={editOpen} onClose={() => setEditOpen(false)} title="Sửa môn học" {...fullScreenModalProps}>
        <ScrollArea h="100vh" type="auto">
          <Container size="md" py="xl" pb={80}>
            {editingSubject && (
              <SubjectForm
                initial={editingSubject}
                programs={programs}
                catalogGroups={catalogGroups}
                defaultProgramId={editingSubject.program_id ?? selectedProgramId}
                defaultCatalogGroupId={editingSubject.sub_category ?? selectedGroupId}
                allSubjects={subjectsInProgram}
                onSubmit={(data) => void handleUpdate(editingSubject.id, data)}
                onCancel={() => setEditOpen(false)}
              />
            )}
          </Container>
        </ScrollArea>
      </Modal>

    </Box>
  );
};

type SubjectFormProps = {
  initial?: Subject;
  programs: ProgramDto[];
  catalogGroups: CatalogGroupRow[];
  defaultProgramId: string | null;
  defaultCatalogGroupId?: string | null;
  allSubjects: Subject[];
  onSubmit: (data: SubjectFormData) => void;
  onCancel: () => void;
};

function SubjectForm({
  initial,
  programs,
  catalogGroups,
  defaultProgramId,
  defaultCatalogGroupId,
  allSubjects,
  onSubmit,
  onCancel,
}: SubjectFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [credits, setCredits] = useState<number>(initial?.credits ?? 0);
  const [semester, setSemester] = useState<number>(initial?.semester ?? 0);
  const [category, setCategory] = useState(initial?.category ?? 'general');
  const [catalogGroupId, setCatalogGroupId] = useState<string | null>(
    initial?.sub_category ?? defaultCatalogGroupId ?? null
  );
  const [programId, setProgramId] = useState(initial?.program_id ?? defaultProgramId ?? '');
  const [prerequisiteIds, setPrerequisiteIds] = useState<string[]>(
    initial?.prerequisites?.map((p) => p.id) ?? []
  );
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  const prereqOptions = allSubjects
    .filter((s) => s.id !== initial?.id && s.program_id === programId)
    .filter((s) => !catalogGroupId || s.sub_category === catalogGroupId)
    .map((s) => ({
      value: s.id,
      label: s.code ? `${s.code} — ${s.name}` : s.name,
    }));

  const handleSubmit = () => {
    if (!name.trim() || !programId || !catalogGroupId) return;
    onSubmit({
      name: name.trim(),
      code: code.trim(),
      credits,
      semester,
      category,
      sub_category: catalogGroupId,
      subject_group_id: null,
      program_id: programId,
      prerequisite_ids: prerequisiteIds,
      is_active: isActive,
    });
  };

  return (
    <Stack gap="lg">
      <Title order={3}>{initial ? 'Sửa môn học' : 'Thêm môn học mới'}</Title>
      <Text c="dimmed" size="sm">
        Thứ tự: Chuyên ngành → Nhóm môn → Thông tin môn
      </Text>
      <Divider />
      <Select
        label="1. Chuyên ngành"
        description="Ngành đào tạo (CNTT, Du lịch, …)"
        required
        data={programs.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
        value={programId || null}
        onChange={(v) => {
          setProgramId(v ?? '');
          if (!initial) setCatalogGroupId(null);
        }}
        searchable
      />
      <Select
        label="2. Nhóm môn (catalog hệ thống)"
        description="Cùng danh sách với picker dự đoán / ngân hàng câu hỏi"
        required
        data={catalogGroups.map((g) => ({ value: g.id, label: g.label }))}
        value={catalogGroupId}
        onChange={setCatalogGroupId}
        searchable
        placeholder={programId ? 'Chọn nhóm môn' : 'Chọn chuyên ngành trước'}
        disabled={!programId || catalogGroups.length === 0}
      />
      <Divider label="3. Thông tin môn" labelPosition="left" />
      <TextInput
        label="Tên môn học"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        required
        size="md"
        placeholder="Ví dụ: Nghiệp vụ lễ tân"
      />
      <TextInput
        label="Mã môn"
        value={code}
        onChange={(e) => setCode(e.currentTarget.value)}
        size="md"
        placeholder="Ví dụ: DL101"
      />
      <Group grow>
        <NumberInput label="Tín chỉ" value={credits} onChange={(v) => setCredits(Number(v))} min={0} step={0.5} size="md" />
        <NumberInput label="Học kỳ" value={semester} onChange={(v) => setSemester(Number(v))} min={-1} size="md" />
      </Group>
      <Select
        label="Loại chi tiết"
        description="Phân loại bổ sung (đại cương, nền tảng, …)"
        value={category}
        onChange={(v) => setCategory(v ?? 'general')}
        data={CATEGORIES}
        size="md"
      />
      <MultiSelect
        label="Môn tiên quyết"
        description="Cùng chuyên ngành và nhóm môn"
        data={prereqOptions}
        value={prerequisiteIds}
        onChange={setPrerequisiteIds}
        searchable
        clearable
        size="md"
        placeholder="Chọn môn phụ thuộc"
      />
      {initial && (
        <Group justify="space-between">
          <Text size="sm" fw={500}>
            Hoạt động
          </Text>
          <Switch checked={isActive} onChange={(e) => setIsActive(e.currentTarget.checked)} />
        </Group>
      )}
      <Group justify="flex-end" mt="xl">
        <Button variant="default" size="md" onClick={onCancel}>
          Hủy
        </Button>
        <Button
          color="teal"
          size="md"
          onClick={handleSubmit}
          disabled={!programId || !catalogGroupId || !name.trim()}
        >
          Lưu
        </Button>
      </Group>
    </Stack>
  );
}

export default SubjectCatalogManagementPage;
