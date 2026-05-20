import { useCallback, useEffect, useState } from 'react';
import {
  Box, Title, Table, Modal, Group, Stack, Text, Loader, Badge, Paper,
  ActionIcon, TextInput, NumberInput, Select, Switch, MultiSelect,
  Button,
} from '@mantine/core';
import { IconPlus, IconTrash, IconEdit, IconSearch } from '@tabler/icons-react';
import { ListPaginationBar } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, pageToOffset } from '@/utils/pagination';
import subjectApi from '@/services/subjectApi';
import apiClient from '@/services/apiClient';
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
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchSubjects = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      const data = await subjectApi.listSubjects({
        limit: pageSize,
        offset: pageToOffset(page, pageSize),
        search: debouncedSearch || undefined,
      });
      setSubjects(data.items as Subject[]);
      setTotal(data.total);
    } catch {
      setError('Không tải được danh sách môn học.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, pageSize, debouncedSearch]);

  useEffect(() => {
    void fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    if (!accessToken) return;
    void subjectApi.getSubjects().then((list) => setAllSubjects(list as Subject[])).catch(() => {});
  }, [accessToken]);

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa môn học này? Hành động này không thể hoàn tác.')) return;
    try {
      await apiClient.delete(`/subjects/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setNotice('Đã xóa môn học.');
      void fetchSubjects();
    } catch {
      setError('Không xóa được môn học.');
    }
  };

  const openEdit = async (subject: Subject) => {
    try {
      const detail = await subjectApi.getSubject(subject.id);
      setEditingSubject(detail as Subject);
      setEditModalOpen(true);
    } catch {
      setEditingSubject(subject);
      setEditModalOpen(true);
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
        prerequisite_ids: data.prerequisite_ids,
      });
      setCreateModalOpen(false);
      setNotice('Đã tạo môn học.');
      void fetchSubjects();
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
        prerequisite_ids: data.prerequisite_ids,
        is_active: data.is_active,
      });
      setEditModalOpen(false);
      setNotice('Đã cập nhật môn học.');
      void fetchSubjects();
    } catch {
      setError('Không cập nhật được môn học.');
    }
  };

  return (
    <Box className="max-w-[1200px] mx-auto p-4">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>Quản lý môn học</Title>
          <ButtonFilled
            label="Thêm môn học"
            leftSection={<IconPlus size={16} />}
            onClick={() => setCreateModalOpen(true)}
          />
        </Group>

        {error && <Badge color="red" size="lg">{error}</Badge>}
        {notice && <Badge color="green" size="lg">{notice}</Badge>}

        <TextInput
          placeholder="Tìm kiếm tên hoặc mã môn..."
          leftSection={<IconSearch size={14} />}
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ maxWidth: 400 }}
        />

        {loading ? (
          <Loader />
        ) : (
          <>
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
                {subjects.map(subject => (
                  <Table.Tr key={subject.id}>
                    <Table.Td><Text fw={500}>{subject.name}</Text></Table.Td>
                    <Table.Td><Text size="sm" c="dimmed">{subject.code || '—'}</Text></Table.Td>
                    <Table.Td><Text size="sm">{subject.credits}</Text></Table.Td>
                    <Table.Td><Text size="sm">{subject.semester}</Text></Table.Td>
                    <Table.Td><CategoryBadge category={subject.category} /></Table.Td>
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
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          onClick={() => void openEdit(subject)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => void handleDelete(subject.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {subjects.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Text c="dimmed" ta="center">Chưa có môn học nào</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
            </Paper>
          </>
        )}
      </Stack>

      {/* Create Modal */}
      <Modal opened={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Thêm môn học" size="md">
        <SubjectForm
          allSubjects={allSubjects}
          onSubmit={data => void handleCreate(data)}
          onCancel={() => setCreateModalOpen(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal opened={editModalOpen} onClose={() => setEditModalOpen(false)} title="Sửa môn học" size="md">
        {editingSubject && (
          <SubjectForm
            initial={editingSubject}
            allSubjects={allSubjects}
            onSubmit={data => void handleUpdate(editingSubject.id, data)}
            onCancel={() => setEditModalOpen(false)}
          />
        )}
      </Modal>
    </Box>
  );
};

type SubjectFormProps = {
  initial?: Subject;
  allSubjects: Subject[];
  onSubmit: (data: SubjectFormData) => void;
  onCancel: () => void;
};

function SubjectForm({ initial, allSubjects, onSubmit, onCancel }: SubjectFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [credits, setCredits] = useState<number>(initial?.credits ?? 0);
  const [semester, setSemester] = useState<number>(initial?.semester ?? 0);
  const [category, setCategory] = useState(initial?.category ?? 'general');
  const [subCategory, setSubCategory] = useState<string | null>(initial?.sub_category ?? null);
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
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      code: code.trim(),
      credits,
      semester,
      category,
      sub_category: subCategory,
      prerequisite_ids: prerequisiteIds,
      is_active: isActive,
    });
  };

  return (
    <Stack gap="sm">
      <TextInput
        label="Tên môn học"
        value={name}
        onChange={e => setName(e.target.value)}
        required
        placeholder="Ví dụ: Lập trình Python"
      />
      <TextInput
        label="Mã môn"
        value={code}
        onChange={e => setCode(e.target.value)}
        placeholder="Ví dụ: CS101"
      />
      <Group grow>
        <NumberInput
          label="Tín chỉ"
          value={credits}
          onChange={v => setCredits(Number(v))}
          min={0}
          step={0.5}
        />
        <NumberInput
          label="Học kỳ"
          value={semester}
          onChange={v => setSemester(Number(v))}
          min={-1}
        />
      </Group>
      <Select
        label="Loại / Chuyên ngành"
        value={category}
        onChange={v => setCategory(v ?? 'general')}
        data={CATEGORIES}
      />
      <Select
        label="Khối dự đoán (sub_category)"
        description="Dùng nhóm môn trên trang Dự đoán điểm SV"
        value={subCategory}
        onChange={v => setSubCategory(v)}
        data={SUB_CATEGORIES}
        clearable
        placeholder="Chọn khối"
      />
      <MultiSelect
        label="Môn tiên quyết (phụ thuộc)"
        description="SV cần có điểm/bài thi các môn này trước khi dự đoán môn này"
        data={prereqOptions}
        value={prerequisiteIds}
        onChange={setPrerequisiteIds}
        searchable
        clearable
        placeholder="Chọn môn phụ thuộc"
      />
      <Group justify="space-between">
        <Text size="sm" fw={500}>Hoạt động</Text>
        <Switch checked={isActive} onChange={e => setIsActive(e.currentTarget.checked)} />
      </Group>
      <Group justify="flex-end" mt="sm">
        <Button variant="default" onClick={onCancel}>Hủy</Button>
        <Button color="teal" onClick={handleSubmit}>Lưu</Button>
      </Group>
    </Stack>
  );
}

export default SubjectManagementPage;