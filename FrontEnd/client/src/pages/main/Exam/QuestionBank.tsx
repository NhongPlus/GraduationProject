import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Title, Text, Loader, Paper, Group, Stack, Button, TextInput, Select,
  Badge, Table, ActionIcon, Modal, Textarea, NumberInput, SegmentedControl,
  Tooltip, Alert, FileInput,
} from '@mantine/core';
import {
  IconSearch, IconTrash, IconEdit, IconDownload, IconFilter, IconFileWord,
} from '@tabler/icons-react';
import apiClient from '@/services/apiClient';
import useAuth from '@/hooks/useAuth';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import examApi, { type ExamImportPreview, type ImportedQuestionDraft } from '@/services/examApi';
import subjectApi, { type SubjectDto } from '@/services/subjectApi';
import questionBankApi from '@/services/questionBankApi';
import ListPaginationBar from '@/components/ListPagination/ListPaginationBar';
import { DEFAULT_PAGE_SIZE, pageToOffset, clampPage } from '@/utils/pagination';
import ExamImportPreviewModal from '@/components/ExamVerifyModal/ExamImportPreviewModal';
import SubjectCategoryPicker from '@/components/Input/SubjectCategoryPicker/SubjectCategoryPicker';

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
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const [examIdInputOpen, setExamIdInputOpen] = useState(false);
  const [importingQbId, setImportingQbId] = useState<string | null>(null);
  const [examIdInput, setExamIdInput] = useState('');

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

  const LIMIT = DEFAULT_PAGE_SIZE;

  const fetchItems = useCallback(async (f: QBFilter, p: number) => {
    if (!accessToken) return;
    try {
      setLoading(true);
      const data = await questionBankApi.list({
        limit: LIMIT,
        offset: pageToOffset(p, LIMIT),
        search: f.search,
        question_type: f.question_type,
        difficulty: f.difficulty,
        subject_id: f.subject_id,
        chapter: f.chapter,
      });
      setItems(data.items as QBItem[]);
      setTotal(data.total);
      if (data.items.length === 0 && data.total > 0 && p > 1) {
        setPage(clampPage(p - 1, data.total, LIMIT));
      }
    } catch {
      setError(t('question_bank.error_load_failed'));
    } finally {
      setLoading(false);
    }
  }, [accessToken, t]);

  const fetchSubjects = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await subjectApi.getSubjects();
      setSubjects(data);
      setImportSubjectId((prev) => prev ?? data[0]?.id ?? null);
    } catch {
      // keep page usable even when subjects fail
    }
  }, [accessToken]);

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
    if (!confirm(t('question_bank.confirm_delete'))) return;
    try {
      await apiClient.delete(`/question-bank/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setNotice(t('question_bank.notice_deleted'));
      void fetchItems(filter, page);
    } catch {
      setError(t('question_bank.error_delete_failed'));
    }
  };

  const handleCreate = async (data: Partial<QBItem>) => {
    try {
      await apiClient.post('/question-bank', data, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setCreateModalOpen(false);
      setNotice(t('question_bank.notice_created'));
      void fetchItems(filter, page);
    } catch {
      setError(t('question_bank.error_create_failed'));
    }
  };

  const handleUpdate = async (id: string, data: Partial<QBItem>) => {
    try {
      await apiClient.patch(`/question-bank/${id}`, data, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setEditModalOpen(false);
      setNotice(t('question_bank.notice_updated'));
      void fetchItems(filter, page);
    } catch {
      setError(t('question_bank.error_update_failed'));
    }
  };

  const handleImportToExam = async (qbId: string, examId: string) => {
    if (!examId) return;
    try {
      await apiClient.post(`/question-bank/${qbId}/import/${examId}`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setNotice(t('question_bank.notice_imported'));
    } catch {
      setError(t('question_bank.error_import_failed'));
    }
  };

  const handlePreviewImport = async () => {
    if (!importFile) {
      setError(t('question_bank.error_select_file'));
      return;
    }
    try {
      setError('');
      const preview = await examApi.previewWordImport(importFile);
      setImportPreview(preview);
      setImportModalOpen(true);
    } catch {
      setError(t('question_bank.error_read_file'));
    }
  };

  const handleBulkImportConfirm = async (questions: ImportedQuestionDraft[]) => {
    if (!importSubjectId) {
      setError(t('question_bank.error_select_subject'));
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
      setNotice(t('question_bank.notice_bulk_imported', { count: questions.length }));
      void fetchItems(filter, page);
    } catch {
      setError(t('question_bank.error_bulk_import_failed'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <Box className="max-w-[1200px] mx-auto p-4">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>{t('question_bank.title')}</Title>
          <Group>
            <ButtonFilled
              label={t('question_bank.create_question')}
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
            <Text fw={600}>{t('question_bank.bulk_import_title')}</Text>
            <Group grow align="flex-start">
              <SubjectCategoryPicker
                label={t('question_bank.subject')}
                size="sm"
                subjects={subjects}
                placeholder={
                  loading ? t('exam_authoring.loading') : t('question_bank.select_subject')
                }
                disabled={loading || subjects.length === 0}
                value={importSubjectId}
                onChange={setImportSubjectId}
                required
              />
              <FileInput
                label={t('question_bank.docx_file')}
                placeholder={t('question_bank.select_word_file')}
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
                {t('question_bank.preview_import')}
              </Button>
            </Group>
          </Stack>
        </Paper>

        {/* Filters */}
        <Paper withBorder radius="md" p="md">
          <Group gap="sm" wrap="wrap" align="flex-end">
            <SubjectCategoryPicker
              label={t('question_bank.subject')}
              size="sm"
              subjects={subjects}
              placeholder={t('question_bank.select_subject')}
              disabled={loading || subjects.length === 0}
              value={filter.subject_id ?? null}
              onChange={(id) => {
                setFilter((prev) => ({ ...prev, subject_id: id ?? undefined }));
                setPage(1);
              }}
            />
            <TextInput
              placeholder={t('question_bank.search_placeholder')}
              leftSection={<IconSearch size={14} />}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              style={{ flex: 1, minWidth: 200 }}
            />
            <Select
              placeholder={t('question_bank.type_placeholder')}
              data={[
                { value: 'mcq', label: t('question_bank.type_mcq') },
                { value: 'essay', label: t('question_bank.type_essay') },
              ]}
              clearable
              value={filter.question_type}
              onChange={v => { setFilter(prev => ({ ...prev, question_type: v as QuestionType || undefined })); setPage(1); }}
              w={140}
            />
            <Select
              placeholder={t('question_bank.difficulty_placeholder')}
              data={[
                { value: 'DE', label: t('question_bank.difficulty_easy') },
                { value: 'TRUNGBINH', label: t('question_bank.difficulty_medium') },
                { value: 'KHO', label: t('question_bank.difficulty_hard') },
              ]}
              clearable
              value={filter.difficulty}
              onChange={v => { setFilter(prev => ({ ...prev, difficulty: v as QBDifficulty || undefined })); setPage(1); }}
              w={140}
            />
            <Button onClick={handleSearch} leftSection={<IconFilter size={14} />}>
              {t('question_bank.filter')}
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
                  <Table.Th>{t('question_bank.col_content')}</Table.Th>
                  <Table.Th>{t('question_bank.col_type')}</Table.Th>
                  <Table.Th>{t('question_bank.col_difficulty')}</Table.Th>
                  <Table.Th>{t('question_bank.col_tags')}</Table.Th>
                  <Table.Th>{t('question_bank.col_points')}</Table.Th>
                  <Table.Th>{t('question_bank.col_usage')}</Table.Th>
                  <Table.Th>{t('question_bank.col_actions')}</Table.Th>
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
                        {item.question_type === 'mcq' ? t('question_bank.type_mcq') : t('question_bank.type_essay')}
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
                        <Tooltip label={t('question_bank.action_edit')}>
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            onClick={() => { setEditingItem(item); setEditModalOpen(true); }}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label={t('question_bank.action_delete')}>
                          <ActionIcon variant="subtle" color="red" onClick={() => void handleDelete(item.id)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label={t('question_bank.add_to_exam')}>
                          <ActionIcon variant="subtle" color="teal" onClick={() => {
                            setImportingQbId(item.id);
                            setExamIdInput('');
                            setExamIdInputOpen(true);
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
                      <Text c="dimmed" ta="center">{t('question_bank.empty')}</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        )}

        <ListPaginationBar
          page={page}
          total={total}
          limit={LIMIT}
          onPageChange={setPage}
        />
      </Stack>

      {/* Create Modal */}
      <Modal opened={createModalOpen} onClose={() => setCreateModalOpen(false)} title={t('question_bank.create_modal_title')} size="lg">
        <QBForm
          subjects={subjects}
          onSubmit={data => void handleCreate(data)}
          onCancel={() => setCreateModalOpen(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal opened={editModalOpen} onClose={() => setEditModalOpen(false)} title={t('question_bank.edit_modal_title')} size="lg">
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

      {/* Import to exam ID input modal */}
      <Modal
        opened={examIdInputOpen}
        onClose={() => setExamIdInputOpen(false)}
        title={t('question_bank.import_exam_modal_title')}
        size="sm"
        centered
      >
        <Stack gap="sm">
          <TextInput
            label={t('question_bank.exam_id_label')}
            placeholder={t('question_bank.exam_id_placeholder')}
            value={examIdInput}
            onChange={(e) => setExamIdInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && examIdInput.trim()) {
                void handleImportToExam(importingQbId!, examIdInput.trim());
                setExamIdInputOpen(false);
              }
            }}
            autoFocus
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setExamIdInputOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              color="teal"
              disabled={!examIdInput.trim()}
              onClick={() => {
                if (importingQbId && examIdInput.trim()) {
                  void handleImportToExam(importingQbId, examIdInput.trim());
                  setExamIdInputOpen(false);
                }
              }}
            >
              {t('question_bank.confirm_import')}
            </Button>
          </Group>
        </Stack>
      </Modal>
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
  const { t } = useTranslation();
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
        label={t('question_bank.form_content_label')}
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={3}
        required
      />
      <SubjectCategoryPicker
        label={t('question_bank.form_subject')}
        size="sm"
        subjects={subjects}
        placeholder={t('question_bank.select_subject')}
        disabled={subjects.length === 0}
        value={subjectId}
        onChange={setSubjectId}
        required
      />
      <Group grow>
        <Stack gap={4}>
          <Text size="sm" fw={500}>{t('question_bank.form_question_type')}</Text>
          <SegmentedControl
            value={questionType}
            onChange={v => setQuestionType(v as QuestionType)}
            data={[{ value: 'mcq', label: t('question_bank.type_mcq') }, { value: 'essay', label: t('question_bank.type_essay') }]}
          />
        </Stack>
        <NumberInput label={t('question_bank.form_points')} value={points} onChange={v => setPoints(Number(v))} min={0.5} step={0.5} />
        <Select
          label={t('question_bank.form_difficulty')}
          value={difficulty}
          onChange={v => setDifficulty((v ?? 'TRUNGBINH') as QBDifficulty)}
          data={[
            { value: 'DE', label: t('question_bank.difficulty_easy') },
            { value: 'TRUNGBINH', label: t('question_bank.difficulty_medium') },
            { value: 'KHO', label: t('question_bank.difficulty_hard') },
          ]}
        />
      </Group>
      {questionType === 'mcq' && (
        <>
          <Text size="sm" fw={600}>{t('question_bank.form_options')}</Text>
          {Object.keys(options).map(key => (
            <Group key={key} gap="xs">
              <Badge w={24} ta="center">{key}</Badge>
              <TextInput
                flex={1}
                value={options[key]}
                onChange={e => setOptions(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={t('question_bank.form_option_placeholder', { key })}
              />
            </Group>
          ))}
          <Select
            label={t('question_bank.form_correct_answer')}
            value={correctAnswer}
            onChange={v => setCorrectAnswer(v ?? '')}
            data={Object.keys(options).filter(k => options[k].trim())}
          />
        </>
      )}
      <Group grow>
        <NumberInput label={t('question_bank.form_chapter')} value={chapter} onChange={v => setChapter(v === '' ? '' : Number(v))} min={1} />
        <TextInput
          label={t('question_bank.form_tags')}
          value={tags}
          onChange={e => setTags(e.target.value)}
          placeholder="python, loop, function"
        />
      </Group>
      <Group justify="flex-end" mt="sm">
        <Button variant="default" onClick={onCancel}>{t('common.cancel')}</Button>
        <Button onClick={handleSubmit} color="teal">{t('common.save')}</Button>
      </Group>
    </Stack>
  );
}

export default QuestionBankPage;