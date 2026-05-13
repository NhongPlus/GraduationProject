import { useEffect, useState, useCallback } from 'react';
import {
  Box, Title, Text, Loader, Paper, Group, Stack, Button, TextInput, Select,
  Badge, Table, ActionIcon, Modal, Textarea, NumberInput, SegmentedControl,
  Pagination, Tooltip, Alert, FileInput,
} from '@mantine/core';
import {
  IconSearch, IconTrash, IconEdit, IconDownload, IconFilter, IconFileWord,
} from '@tabler/icons-react';
import apiClient from '@/services/apiClient';
import useAuth from '@/hooks/useAuth';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import examApi, { type ExamImportPreview, type ImportedQuestionDraft } from '@/services/examApi';
import subjectApi, { type SubjectDto } from '@/services/subjectApi';
import ExamImportPreviewModal from '@/components/ExamVerifyModal/ExamImportPreviewModal';

type QBDifficulty = 'DE' | 'TRUNGBINH' | 'KHO';
type QuestionType = 'mcq' | 'essay';

interface QBItem {
  id: string;
  content: string;
  question_type: QuestionType;
  options: Record<string, string> | null;
  correct_answer: string | string[] | null;
  points: number;
  difficulty: QBDifficulty;
  chapter: number | null;
  subject_id: string | null;
  tags: string[];
  usage_count: number;
  created_at: string;
}

interface QBFilter {
  search?: string;
  question_type?: QuestionType;
  difficulty?: QBDifficulty;
  subject_id?: string;
  chapter?: number;
}

const DIFFICULTY_COLORS: Record<QBDifficulty, string> = {
  DE: 'green',
  TRUNGBINH: 'yellow',
  KHO: 'red',
};

const DIFFICULTY_LABELS: Record<QBDifficulty, string> = {
  DE: 'Dễ',
  TRUNGBINH: 'Trung bình',
  KHO: 'Khó',
};

const QuestionBankPage = () => {
  const { accessToken } = useAuth();

  const [items, setItems] = useState<QBItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<QBFilter>({});
  const [search, setSearch] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QBItem | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ExamImportPreview | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSubjectId, setImportSubjectId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const LIMIT = 20;

  const fetchItems = useCallback(async (f: QBFilter, p: number) => {
    if (!accessToken) return;
    try {
      setLoading(true);
      const params: Record<string, string> = {
        limit: String(LIMIT),
        offset: String((p - 1) * LIMIT),
      };
      if (f.search) params.search = f.search;
      if (f.question_type) params.question_type = f.question_type;
      if (f.difficulty) params.difficulty = f.difficulty;
      if (f.subject_id) params.subject_id = f.subject_id;
      if (f.chapter != null) params.chapter = String(f.chapter);

      const res = await apiClient.get<{ success: boolean; data: { items: QBItem[]; total: number } }>(
        '/question-bank',
        { params, headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setItems(res.data.data.items);
      setTotal(res.data.data.total);
    } catch {
      setError('Không tải được ngân hàng câu hỏi.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchSubjects = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await subjectApi.getSubjects();
      setSubjects(data);
      if (!importSubjectId && data.length > 0) setImportSubjectId(data[0].id);
    } catch {
      // keep page usable even when subjects fail
    }
  }, [accessToken, importSubjectId]);

  useEffect(() => {
    void fetchItems(filter, page);
  }, [filter, page, fetchItems]);

  useEffect(() => {
    void fetchSubjects();
  }, [fetchSubjects]);

  const handleSearch = () => {
    setPage(1);
    setFilter(prev => ({ ...prev, search: search || undefined }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa câu hỏi khỏi ngân hàng?')) return;
    try {
      await apiClient.delete(`/question-bank/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setNotice('Đã xóa câu hỏi.');
      void fetchItems(filter, page);
    } catch {
      setError('Không xóa được câu hỏi.');
    }
  };

  const handleCreate = async (data: Partial<QBItem>) => {
    try {
      await apiClient.post('/question-bank', data, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setCreateModalOpen(false);
      setNotice('Đã tạo câu hỏi.');
      void fetchItems(filter, page);
    } catch {
      setError('Không tạo được câu hỏi.');
    }
  };

  const handleUpdate = async (id: string, data: Partial<QBItem>) => {
    try {
      await apiClient.patch(`/question-bank/${id}`, data, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setEditModalOpen(false);
      setNotice('Đã cập nhật câu hỏi.');
      void fetchItems(filter, page);
    } catch {
      setError('Không cập nhật được câu hỏi.');
    }
  };

  const handleImportToExam = async (qbId: string, examId: string) => {
    if (!examId) return;
    try {
      await apiClient.post(`/question-bank/${qbId}/import/${examId}`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setNotice('Đã thêm vào đề thi!');
    } catch {
      setError('Không import được câu hỏi vào đề.');
    }
  };

  const handlePreviewImport = async () => {
    if (!importFile) {
      setError('Vui lòng chọn file Word .docx.');
      return;
    }
    try {
      setError('');
      const preview = await examApi.previewWordImport(importFile);
      setImportPreview(preview);
      setImportModalOpen(true);
    } catch {
      setError('Không đọc được file Word.');
    }
  };

  const handleBulkImportConfirm = async (questions: ImportedQuestionDraft[]) => {
    if (!importSubjectId) {
      setError('Vui lòng chọn môn học trước khi import.');
      return;
    }

    setImporting(true);
    setError('');
    try {
      for (const q of questions) {
        await apiClient.post('/question-bank', {
          content: q.content,
          question_type: q.question_type,
          points: q.points,
          options: q.options ?? null,
          correct_answer: q.correct_answer ?? null,
          difficulty: q.difficulty ?? 'TRUNGBINH',
          chapter: q.chapter ?? null,
          tags: [],
          subject_id: importSubjectId,
          answer_hint: q.answer_hint ?? null,
          explanation: q.review_reason ?? null,
        }, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }

      setImportModalOpen(false);
      setImportPreview(null);
      setImportFile(null);
      setNotice(`Đã import ${questions.length} câu hỏi vào ngân hàng.`);
      void fetchItems(filter, page);
    } catch {
      setError('Import hàng loạt thất bại.');
    } finally {
      setImporting(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <Box className="max-w-[1200px] mx-auto p-4">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>Ngân hàng câu hỏi</Title>
          <Group>
            <ButtonFilled
              label="Tạo câu hỏi"
              disabled={false}
              onClick={() => setCreateModalOpen(true)}
            />
          </Group>
        </Group>

        {(error || notice) && (
          <Alert color={error ? 'red' : 'green'} variant="light">
            {error || notice}
          </Alert>
        )}

        <Paper withBorder radius="md" p="md">
          <Stack gap="xs">
            <Text fw={600}>Import hàng loạt từ Word</Text>
            <Group grow>
              <Select
                label="Môn học"
                placeholder="Chọn môn học"
                data={subjects.map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }))}
                value={importSubjectId}
                onChange={setImportSubjectId}
                searchable
              />
              <FileInput
                label="File .docx"
                placeholder="Chọn file Word"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                value={importFile}
                onChange={setImportFile}
                leftSection={<IconFileWord size={14} />}
              />
            </Group>
            <Group justify="flex-end">
              <Button
                variant="light"
                leftSection={<IconFileWord size={14} />}
                onClick={() => void handlePreviewImport()}
                disabled={!importFile || !importSubjectId || importing}
                loading={importing}
              >
                Kiểm tra & Import hàng loạt
              </Button>
            </Group>
          </Stack>
        </Paper>

        {/* Filters */}
        <Paper withBorder radius="md" p="md">
          <Group gap="sm" wrap="wrap">
            <TextInput
              placeholder="Tìm kiếm nội dung..."
              leftSection={<IconSearch size={14} />}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              style={{ flex: 1, minWidth: 200 }}
            />
            <Select
              placeholder="Loại"
              data={[
                { value: 'mcq', label: 'Trắc nghiệm' },
                { value: 'essay', label: 'Tự luận' },
              ]}
              clearable
              value={filter.question_type}
              onChange={v => { setFilter(prev => ({ ...prev, question_type: v as QuestionType || undefined })); setPage(1); }}
              w={140}
            />
            <Select
              placeholder="Độ khó"
              data={[
                { value: 'DE', label: 'Dễ' },
                { value: 'TRUNGBINH', label: 'Trung bình' },
                { value: 'KHO', label: 'Khó' },
              ]}
              clearable
              value={filter.difficulty}
              onChange={v => { setFilter(prev => ({ ...prev, difficulty: v as QBDifficulty || undefined })); setPage(1); }}
              w={140}
            />
            <Button onClick={handleSearch} leftSection={<IconFilter size={14} />}>
              Lọc
            </Button>
          </Group>
        </Paper>

        {loading ? (
          <Loader />
        ) : (
          <Paper withBorder radius="md">
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>#</Table.Th>
                  <Table.Th>Nội dung</Table.Th>
                  <Table.Th>Loại</Table.Th>
                  <Table.Th>Độ khó</Table.Th>
                  <Table.Th>Tags</Table.Th>
                  <Table.Th>Điểm</Table.Th>
                  <Table.Th>Đã dùng</Table.Th>
                  <Table.Th>Thao tác</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map((item, idx) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>{(page - 1) * LIMIT + idx + 1}</Table.Td>
                    <Table.Td style={{ maxWidth: 400 }}>
                      <Text size="sm" lineClamp={2}>{item.content}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={item.question_type === 'mcq' ? 'blue' : 'violet'} size="sm">
                        {item.question_type === 'mcq' ? 'TN' : 'TL'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={DIFFICULTY_COLORS[item.difficulty]} size="sm">
                        {DIFFICULTY_LABELS[item.difficulty]}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        {item.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} size="xs" variant="light">{tag}</Badge>
                        ))}
                        {item.tags.length > 2 && (
                          <Badge size="xs" variant="light">+{item.tags.length - 2}</Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td><Text size="sm">{item.points}</Text></Table.Td>
                    <Table.Td><Text size="sm" c="dimmed">{item.usage_count}</Text></Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Tooltip label="Sửa">
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            onClick={() => { setEditingItem(item); setEditModalOpen(true); }}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Xóa">
                          <ActionIcon variant="subtle" color="red" onClick={() => void handleDelete(item.id)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Thêm vào đề thi">
                          <ActionIcon variant="subtle" color="teal" onClick={() => {
                            const examId = prompt('Nhập exam ID:');
                            if (examId) void handleImportToExam(item.id, examId);
                          }}>
                            <IconDownload size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {items.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={8}>
                      <Text c="dimmed" ta="center">Chưa có câu hỏi nào</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        )}

        {totalPages > 1 && (
          <Group justify="center">
            <Pagination total={totalPages} value={page} onChange={setPage} />
          </Group>
        )}

        <Text size="sm" c="dimmed">Tổng: {total} câu hỏi</Text>
      </Stack>

      {/* Create Modal */}
      <Modal opened={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Tạo câu hỏi mới" size="lg">
        <QBForm
          subjects={subjects}
          onSubmit={data => void handleCreate(data)}
          onCancel={() => setCreateModalOpen(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal opened={editModalOpen} onClose={() => setEditModalOpen(false)} title="Sửa câu hỏi" size="lg">
        {editingItem && (
          <QBForm
            initial={editingItem}
            subjects={subjects}
            onSubmit={data => void handleUpdate(editingItem.id, data)}
            onCancel={() => setEditModalOpen(false)}
          />
        )}
      </Modal>

      {importModalOpen && importPreview && (
        <ExamImportPreviewModal
          preview={importPreview}
          onConfirm={(questions) => void handleBulkImportConfirm(questions)}
          onClose={() => setImportModalOpen(false)}
        />
      )}
    </Box>
  );
};

type QBFormProps = {
  initial?: QBItem;
  subjects: SubjectDto[];
  onSubmit: (data: Partial<QBItem>) => void;
  onCancel: () => void;
};

function QBForm({ initial, subjects, onSubmit, onCancel }: QBFormProps) {
  const [content, setContent] = useState(initial?.content ?? '');
  const [questionType, setQuestionType] = useState<QuestionType>(initial?.question_type ?? 'mcq');
  const [points, setPoints] = useState(initial?.points ?? 1);
  const [difficulty, setDifficulty] = useState<QBDifficulty>(initial?.difficulty ?? 'TRUNGBINH');
  const [options, setOptions] = useState<Record<string, string>>(
    initial?.options ?? { A: '', B: '', C: '', D: '' }
  );
  const [correctAnswer, setCorrectAnswer] = useState<string>('');
  const [tags, setTags] = useState(initial?.tags?.join(', ') ?? '');
  const [chapter, setChapter] = useState<number | ''>(initial?.chapter ?? '');
  const [subjectId, setSubjectId] = useState<string | null>(initial?.subject_id ?? subjects[0]?.id ?? null);

  const handleSubmit = () => {
    const parsedOptions = questionType === 'mcq'
      ? Object.fromEntries(Object.entries(options).filter(([, v]) => v.trim()))
      : null;
    const parsedCorrect = questionType === 'mcq' ? correctAnswer : null;
    onSubmit({
      content,
      question_type: questionType,
      points,
      difficulty,
      subject_id: subjectId ?? undefined,
      options: parsedOptions,
      correct_answer: parsedCorrect,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      chapter: chapter === '' ? undefined : Number(chapter),
    });
  };

  return (
    <Stack gap="sm">
      <Textarea
        label="Nội dung câu hỏi"
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={3}
        required
      />
      <Group grow>
        <Select
          label="Môn học"
          value={subjectId}
          onChange={setSubjectId}
          data={subjects.map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }))}
          searchable
          required
        />
        <Stack gap={4}>
          <Text size="sm" fw={500}>Loại câu hỏi</Text>
          <SegmentedControl
            value={questionType}
            onChange={v => setQuestionType(v as QuestionType)}
            data={[{ value: 'mcq', label: 'Trắc nghiệm' }, { value: 'essay', label: 'Tự luận' }]}
          />
        </Stack>
        <NumberInput label="Điểm" value={points} onChange={v => setPoints(Number(v))} min={0.5} step={0.5} />
        <Select
          label="Độ khó"
          value={difficulty}
          onChange={v => setDifficulty((v ?? 'TRUNGBINH') as QBDifficulty)}
          data={[
            { value: 'DE', label: 'Dễ' },
            { value: 'TRUNGBINH', label: 'Trung bình' },
            { value: 'KHO', label: 'Khó' },
          ]}
        />
      </Group>
      {questionType === 'mcq' && (
        <>
          <Text size="sm" fw={600}>Các lựa chọn</Text>
          {Object.keys(options).map(key => (
            <Group key={key} gap="xs">
              <Badge w={24} ta="center">{key}</Badge>
              <TextInput
                flex={1}
                value={options[key]}
                onChange={e => setOptions(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={`Đáp án ${key}`}
              />
            </Group>
          ))}
          <Select
            label="Đáp án đúng"
            value={correctAnswer}
            onChange={v => setCorrectAnswer(v ?? '')}
            data={Object.keys(options).filter(k => options[k].trim())}
          />
        </>
      )}
      <Group grow>
        <NumberInput label="Chương" value={chapter} onChange={v => setChapter(v === '' ? '' : Number(v))} min={1} />
        <TextInput
          label="Tags (phân cách bằng dấu phẩy)"
          value={tags}
          onChange={e => setTags(e.target.value)}
          placeholder="python, loop, function"
        />
      </Group>
      <Group justify="flex-end" mt="sm">
        <Button variant="default" onClick={onCancel}>Hủy</Button>
        <Button onClick={handleSubmit} color="teal">Lưu</Button>
      </Group>
    </Stack>
  );
}

export default QuestionBankPage;