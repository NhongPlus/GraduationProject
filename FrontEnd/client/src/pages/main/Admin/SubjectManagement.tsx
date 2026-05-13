import { useCallback, useEffect, useState } from 'react';
import {
  Box, Title, Table, Modal, Group, Stack, Text, Loader, Badge,
  ActionIcon, TextInput, NumberInput, Select, Textarea,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconPlus, IconTrash, IconEdit, IconSearch } from '@tabler/icons-react';
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

const SubjectManagementPage = () => {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

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
      // handle error
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void fetchSubjects();
  }, [fetchSubjects]);

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa môn học này?')) return;
    await apiClient.delete(`/subjects/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    void fetchSubjects();
  };

  const handleCreate = async (data: { name: string; code: string }) => {
    await apiClient.post('/subjects', data, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setCreateModalOpen(false);
    void fetchSubjects();
  };

  const handleUpdate = async (id: string, data: { name: string; code: string }) => {
    await apiClient.patch(`/subjects/${id}`, data, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setEditModalOpen(false);
    void fetchSubjects();
  };

  const filtered = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  );

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

        <TextInput
          placeholder="Tìm kiếm tên hoặc mã môn..."
          leftSection={<IconSearch size={14} />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />

        {loading ? (
          <Loader />
        ) : (
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
              {filtered.map(subject => (
                <Table.Tr key={subject.id}>
                  <Table.Td>
                    <Text fw={500}>{subject.name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">{subject.code || '—'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{subject.credits}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{subject.semester}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="sm" variant="light">{subject.category || 'general'}</Badge>
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
              {filtered.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text c="dimmed" ta="center">Chưa có môn học nào</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
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
  onSubmit: (data: { name: string; code: string }) => void;
  onCancel: () => void;
};

function SubjectForm({ initial, onSubmit, onCancel }: SubjectFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [code, setCode] = useState(initial?.code ?? '');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), code: code.trim() });
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
      <Group justify="flex-end" mt="sm">
        <Button variant="default" onClick={onCancel}>Hủy</Button>
        <Button color="teal" onClick={handleSubmit}>Lưu</Button>
      </Group>
    </Stack>
  );
}

export default SubjectManagementPage;