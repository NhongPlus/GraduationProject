import { useCallback, useEffect, useState } from 'react';
import {
  Box, Title, Table, Modal, Group, Stack, Text, Loader, Badge, Paper,
  ActionIcon, TextInput, NumberInput, Select, Switch,
  Button,
} from '@mantine/core';
import { IconPlus, IconTrash, IconEdit, IconSearch } from '@tabler/icons-react';
import { ListPaginationBar } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, slicePage } from '@/utils/pagination';
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
  is_active: boolean;
  created_at: string;
}

interface SubjectFormData {
  name: string;
  code: string;
  credits: number;
  semester: number;
  category: string;
  is_active: boolean;
}

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

  const fetchSubjects = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      const res = await apiClient.get<{ success: boolean; data: Subject[] }>(
        '/subjects',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setSubjects(res.data.data);
    } catch {
      setError('Không tải được danh sách môn học.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void fetchSubjects();
  }, [fetchSubjects]);

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

  const handleCreate = async (data: SubjectFormData) => {
    try {
      await apiClient.post('/subjects', data, {
        headers: { Authorization: `Bearer ${accessToken}` },
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
      await apiClient.patch(`/subjects/${id}`, data, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setEditModalOpen(false);
      setNotice('Đã cập nhật môn học.');
      void fetchSubjects();
    } catch {
      setError('Không cập nhật được môn học.');
    }
  };

  const filtered = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  );

  const paginated = slicePage(filtered, page, pageSize);

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
              total={filtered.length}
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
                  <Table.Th>Trạng thái</Table.Th>
                  <Table.Th>Thao tác</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paginated.map(subject => (
                  <Table.Tr key={subject.id}>
                    <Table.Td><Text fw={500}>{subject.name}</Text></Table.Td>
                    <Table.Td><Text size="sm" c="dimmed">{subject.code || '—'}</Text></Table.Td>
                    <Table.Td><Text size="sm">{subject.credits}</Text></Table.Td>
                    <Table.Td><Text size="sm">{subject.semester}</Text></Table.Td>
                    <Table.Td><CategoryBadge category={subject.category} /></Table.Td>
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
                          onClick={() => { setEditingSubject(subject); setEditModalOpen(true); }}
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
                {paginated.length === 0 && (
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
          onSubmit={data => void handleCreate(data)}
          onCancel={() => setCreateModalOpen(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal opened={editModalOpen} onClose={() => setEditModalOpen(false)} title="Sửa môn học" size="md">
        {editingSubject && (
          <SubjectForm
            initial={editingSubject}
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
  onSubmit: (data: SubjectFormData) => void;
  onCancel: () => void;
};

function SubjectForm({ initial, onSubmit, onCancel }: SubjectFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [credits, setCredits] = useState<number>(initial?.credits ?? 0);
  const [semester, setSemester] = useState<number>(initial?.semester ?? 0);
  const [category, setCategory] = useState(initial?.category ?? 'general');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      code: code.trim(),
      credits,
      semester,
      category,
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