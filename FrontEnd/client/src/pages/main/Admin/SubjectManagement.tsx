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
  NumberInput,
  Select,
  Switch,
  MultiSelect,
  Button,
  Container,
  ScrollArea,
  Divider,
  Checkbox,
} from '@mantine/core';
import { IconPlus, IconTrash, IconEdit, IconSearch, IconSchool } from '@tabler/icons-react';
import { ListPaginationBar } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, pageToOffset } from '@/utils/pagination';
import subjectApi from '@/services/subjectApi';
import programApi, { type ProgramDto } from '@/services/programApi';
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
  program_id: string;
  prerequisite_ids: string[];
  is_active: boolean;
}

const SUB_CATEGORIES = [
  { value: 'math', label: 'Đại số / Toán' },
  { value: 'english', label: 'Tiếng Anh' },
  { value: 'programming', label: 'Lập trình' },
  { value: 'software_eng', label: 'Phần mềm' },
  { value: 'ai', label: 'AI / ML' },
  { value: 'network', label: 'Mạng' },
  { value: 'soft_skills', label: 'Kỹ năng mềm' },
  { value: 'national_defense', label: 'Quốc phòng' },
  { value: 'internship', label: 'Thực tập' },
];

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

const SubjectManagementPage = () => {
  const { accessToken } = useAuth();
  const [programs, setPrograms] = useState<ProgramDto[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [programCreateOpen, setProgramCreateOpen] = useState(false);
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

  const fetchSubjects = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      const data = await subjectApi.listSubjects({
        limit: pageSize,
        offset: pageToOffset(page, pageSize),
        search: debouncedSearch || undefined,
        program_id: selectedProgramId ?? undefined,
      });
      setSubjects(data.items as Subject[]);
      setTotal(data.total);
    } catch {
      setError('Không tải được danh sách môn học.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, pageSize, debouncedSearch, selectedProgramId]);

  useEffect(() => {
    void fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, debouncedSearch, selectedProgramId]);

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

  const handleCreateProgram = async (code: string, name: string, description: string) => {
    try {
      const created = await programApi.createProgram({
        code,
        name,
        description: description || null,
      });
      setProgramCreateOpen(false);
      setNotice(`Đã tạo chuyên ngành ${created.name}.`);
      await loadPrograms();
      setSelectedProgramId(created.id);
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' &&
        e !== null &&
        'response' in e &&
        typeof (e as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
          ? (e as { response: { data: { error: string } } }).response.data.error
          : 'Không tạo được chuyên ngành.';
      setError(msg);
    }
  };

  const programOptions = programs.map((p) => ({
    value: p.id,
    label: `${p.code} — ${p.name} (${p.subject_count ?? 0} môn)`,
  }));

  const subjectsInProgram = selectedProgramId
    ? allSubjects.filter((s) => s.program_id === selectedProgramId)
    : allSubjects;

  return (
    <Box className="min-h-[calc(100vh-80px)] p-4">
      <Stack gap="md" maw={1400} mx="auto">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Box>
            <Title order={2}>Quản lý môn học</Title>
            <Text c="dimmed" size="sm" mt={4}>
              Chọn chuyên ngành, sau đó thêm / sửa môn và môn tiên quyết trong ngành đó.
            </Text>
          </Box>
          <Group gap="sm">
            <Button
              variant="light"
              leftSection={<IconSchool size={16} />}
              onClick={() => setProgramCreateOpen(true)}
            >
              Thêm chuyên ngành
            </Button>
            <ButtonFilled
              label="Thêm môn học"
              leftSection={<IconPlus size={16} />}
              disabled={!selectedProgramId}
              onClick={() => setCreateOpen(true)}
            />
          </Group>
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

        <Select
          label="Chuyên ngành"
          placeholder="Chọn ngành để xem môn"
          data={programOptions}
          value={selectedProgramId}
          onChange={(v) => {
            setSelectedProgramId(v);
            setPage(1);
          }}
          searchable
          style={{ maxWidth: 480 }}
        />

        <TextInput
          placeholder="Tìm kiếm tên hoặc mã môn..."
          leftSection={<IconSearch size={14} />}
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            setPage(1);
          }}
          style={{ maxWidth: 400 }}
        />

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

        {loading ? (
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
                    <Table.Td colSpan={9}>
                      <Text c="dimmed" ta="center" py="lg">
                        {selectedProgramId
                          ? 'Chưa có môn trong chuyên ngành này. Bấm «Thêm môn học».'
                          : 'Hãy tạo hoặc chọn một chuyên ngành.'}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        )}
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
              defaultProgramId={selectedProgramId}
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
                defaultProgramId={editingSubject.program_id ?? selectedProgramId}
                allSubjects={subjectsInProgram}
                onSubmit={(data) => void handleUpdate(editingSubject.id, data)}
                onCancel={() => setEditOpen(false)}
              />
            )}
          </Container>
        </ScrollArea>
      </Modal>

      <Modal
        opened={programCreateOpen}
        onClose={() => setProgramCreateOpen(false)}
        title="Thêm chuyên ngành"
        {...fullScreenModalProps}
      >
        <ScrollArea h="100vh" type="auto">
          <Container size="sm" py="xl" pb={80}>
            <ProgramForm
              onSubmit={(code, name, desc) => void handleCreateProgram(code, name, desc)}
              onCancel={() => setProgramCreateOpen(false)}
            />
          </Container>
        </ScrollArea>
      </Modal>
    </Box>
  );
};

type SubjectFormProps = {
  initial?: Subject;
  programs: ProgramDto[];
  defaultProgramId: string | null;
  allSubjects: Subject[];
  onSubmit: (data: SubjectFormData) => void;
  onCancel: () => void;
};

function SubjectForm({
  initial,
  programs,
  defaultProgramId,
  allSubjects,
  onSubmit,
  onCancel,
}: SubjectFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [credits, setCredits] = useState<number>(initial?.credits ?? 0);
  const [semester, setSemester] = useState<number>(initial?.semester ?? 0);
  const [category, setCategory] = useState(initial?.category ?? 'general');
  const [subCategory, setSubCategory] = useState<string | null>(initial?.sub_category ?? null);
  const [programId, setProgramId] = useState(initial?.program_id ?? defaultProgramId ?? '');
  const [prerequisiteIds, setPrerequisiteIds] = useState<string[]>(
    initial?.prerequisites?.map((p) => p.id) ?? []
  );
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  const prereqOptions = allSubjects
    .filter((s) => s.id !== initial?.id)
    .map((s) => ({
      value: s.id,
      label: s.code ? `${s.code} — ${s.name}` : s.name,
    }));

  const handleSubmit = () => {
    if (!name.trim() || !programId) return;
    onSubmit({
      name: name.trim(),
      code: code.trim(),
      credits,
      semester,
      category,
      sub_category: subCategory,
      program_id: programId,
      prerequisite_ids: prerequisiteIds,
      is_active: isActive,
    });
  };

  return (
    <Stack gap="lg">
      <Title order={3}>{initial ? 'Sửa môn học' : 'Thêm môn học mới'}</Title>
      <Divider />
      <Select
        label="Chuyên ngành"
        description="Môn thuộc ngành nào (CNTT, Du lịch, …)"
        required
        data={programs.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
        value={programId || null}
        onChange={(v) => setProgramId(v ?? '')}
        searchable
      />
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
      <Select label="Loại" value={category} onChange={(v) => setCategory(v ?? 'general')} data={CATEGORIES} size="md" />
      <Select
        label="Khối dự đoán"
        description="Nhóm trên trang Dự đoán điểm (nếu bật AI)"
        value={subCategory}
        onChange={setSubCategory}
        data={SUB_CATEGORIES}
        clearable
        size="md"
        placeholder="Chọn khối"
      />
      <MultiSelect
        label="Môn tiên quyết"
        description="Chỉ chọn môn cùng ngành (danh sách đã lọc)"
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
        <Button color="teal" size="md" onClick={handleSubmit} disabled={!programId}>
          Lưu
        </Button>
      </Group>
    </Stack>
  );
}

function ProgramForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (code: string, name: string, description: string) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  return (
    <Stack gap="lg">
      <Title order={3}>Thêm chuyên ngành mới</Title>
      <Text c="dimmed" size="sm">
        Ví dụ: Du lịch (DL), Kế toán (KT), CNTT đã có sẵn. Sau khi tạo ngành, bạn thêm môn và đề thi cho ngành đó.
      </Text>
      <Divider />
      <TextInput
        label="Mã ngành"
        required
        size="md"
        placeholder="VD: DL, KT, CNTT"
        value={code}
        onChange={(e) => setCode(e.currentTarget.value.toUpperCase())}
      />
      <TextInput
        label="Tên chuyên ngành"
        required
        size="md"
        placeholder="VD: Quản trị du lịch"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
      />
      <TextInput
        label="Mô tả (tuỳ chọn)"
        size="md"
        placeholder="Ghi chú cho admin"
        value={description}
        onChange={(e) => setDescription(e.currentTarget.value)}
      />
      <Group justify="flex-end" mt="xl">
        <Button variant="default" size="md" onClick={onCancel}>
          Hủy
        </Button>
        <Button color="teal" size="md" onClick={() => onSubmit(code.trim(), name.trim(), description.trim())} disabled={!code.trim() || !name.trim()}>
          Tạo chuyên ngành
        </Button>
      </Group>
    </Stack>
  );
}

export default SubjectManagementPage;
