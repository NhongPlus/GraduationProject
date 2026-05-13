import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from '@mantine/form';
import {
  Alert,
  AspectRatio,
  Badge,
  Box,
  Button,
  Collapse,
  Divider,
  Group,
  Image,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
  ActionIcon,
  ThemeIcon,
  FileInput,
} from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import {
  IconFileWord,
  IconUpload,
  IconX,
  IconCheck,
  IconAlertCircle,
  IconChevronDown,
  IconChevronUp,
  IconTrash,
  IconEdit,
} from '@tabler/icons-react';
import classApi, { type ClassDetail } from '@/services/classApi';
import examApi, { type ExamImportPreview, type ImportedQuestionDraft } from '@/services/examApi';
import ExamImportPreviewModal from '@/components/ExamVerifyModal/ExamImportPreviewModal';

type AuthoringQuestion = ImportedQuestionDraft & {
  id?: string;
  media?: { type: 'image' | 'audio' | 'video'; filename: string; url?: string };
  media_url?: string | null;
};

type ExamMetaFormValues = {
  title: string;
  description: string;
  durationMin: number | '';
  closesAt: string;
  classId: string | null;
};

type QuestionEditFormValues = {
  content: string;
  points: number;
  question_type: 'mcq' | 'essay';
  correct_answer: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  media_url: string | null;
};

function guessMediaType(url: string): 'image' | 'audio' | 'video' {
  const u = (url.split('?')[0] ?? url).toLowerCase();
  if (/\.(mp4|webm|mov|m4v)$/.test(u)) return 'video';
  if (/\.(mp3|wav|ogg|m4a|aac)$/.test(u)) return 'audio';
  return 'image';
}

function mediaUrlFromQuestion(q: AuthoringQuestion): string | null {
  return q.media_url ?? q.media?.url ?? null;
}

function AuthoringMediaPreview({ url }: { url: string }) {
  const mt = guessMediaType(url);
  if (mt === 'image') {
    return (
      <Image src={url} alt="media" radius="md" fit="contain" maw={480} mah={280} />
    );
  }
  if (mt === 'audio') {
    return (
      <Box>
        <audio controls src={url} style={{ width: '100%', maxWidth: 480 }} />
      </Box>
    );
  }
  return (
    <AspectRatio ratio={16 / 9} maw={560}>
      <video controls src={url} style={{ width: '100%' }} />
    </AspectRatio>
  );
}

export default function ExamAuthoring() {
  const navigate = useNavigate();
  const { examId } = useParams<{ examId: string }>();
  const isEditMode = Boolean(examId);
  const [classes, setClasses] = useState<ClassDetail[]>([]);
  const examForm = useForm<ExamMetaFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      title: '',
      description: '',
      durationMin: 60,
      closesAt: '',
      classId: null,
    },
  });
  const questionEditForm = useForm<QuestionEditFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      content: '',
      points: 1,
      question_type: 'mcq',
      correct_answer: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      media_url: null,
    },
  });
  const [questions, setQuestions] = useState<AuthoringQuestion[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ExamImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [verifyOpened, setVerifyOpened] = useState(false);
  const [infoCollapsed, setInfoCollapsed] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [mediaUploadLoading, setMediaUploadLoading] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState('');

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [data, existingExam, existingQuestions] = await Promise.all([
          classApi.getClasses(),
          examId ? examApi.getExam(examId) : Promise.resolve(null),
          examId ? examApi.getQuestions(examId) : Promise.resolve([]),
        ]);
        setClasses(data);
        examForm.setValues((prev) => {
          const classIdNext = prev.classId ?? existingExam?.class_id ?? data[0]?.id ?? null;
          if (!existingExam) {
            return { ...prev, classId: classIdNext };
          }
          return {
            ...prev,
            classId: classIdNext,
            title: existingExam.title,
            description: existingExam.description ?? '',
            durationMin: existingExam.duration_min,
            closesAt: existingExam.closes_at ? existingExam.closes_at.slice(0, 16) : '',
          };
        });
        if (existingQuestions.length) {
          setQuestions(
            existingQuestions.map((question, index) => {
              const url = question.media_url ?? null;
              return {
                id: question.id,
                content: question.content,
                question_type: question.question_type,
                points: question.points,
                options: question.options,
                correct_answer: question.correct_answer ?? null,
                display_order: question.display_order ?? index + 1,
                media_url: url,
                media: url
                  ? {
                      type: guessMediaType(url),
                      filename: '',
                      status: 'found' as const,
                      url,
                    }
                  : undefined,
              };
            })
          );
        }
      } catch {
        setError('Không tải được dữ liệu tạo bài thi.');
      } finally {
        setLoading(false);
      }
    };

    void loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync exam meta once per examId; examForm is stable
  }, [examId]);

  const classOptions = useMemo(
    () =>
      classes.map((item) => ({
        value: item.id,
        label: `${item.subject_code} - ${item.subject_name} (${item.semester} ${item.year})`,
      })),
    [classes]
  );

  const normalizeQuestions = (items: AuthoringQuestion[]) =>
    items.map((item, index) => ({ ...item, display_order: index + 1 }));

  const previewWord = async () => {
    if (!file) {
      setError('Vui lòng chọn file .docx.');
      return;
    }
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const data = await examApi.previewWordImport(file);
      setPreview(data);
      const meta = examForm.getValues();
      if (data.exam.title && !meta.title) examForm.setFieldValue('title', data.exam.title);
      if (data.exam.description && !meta.description) examForm.setFieldValue('description', data.exam.description);
      if (data.exam.duration_min) examForm.setFieldValue('durationMin', data.exam.duration_min);
    } catch {
      setError('Không đọc được file Word. Vui lòng kiểm tra đúng template .docx.');
    } finally {
      setLoading(false);
    }
  };

  const applyPreviewQuestions = () => {
    if (!preview || !file) return;
    setVerifyOpened(true);
  };

  const handleVerifyConfirm = (verifiedQuestions: ImportedQuestionDraft[]) => {
    const mapped = (verifiedQuestions as AuthoringQuestion[]).map((q) => ({
      ...q,
      media_url: q.media?.url ?? q.media_url ?? null,
    }));
    setQuestions(normalizeQuestions(mapped));
    setNotice(`Đã xác nhận ${verifiedQuestions.length} câu từ file Word.`);
    setVerifyOpened(false);
  };

  const deleteQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const startEditQuestion = (q: AuthoringQuestion, idx: number) => {
    setMediaUploadError('');
    setEditingQuestionId(q.id ?? String(idx));
    const url = mediaUrlFromQuestion(q);
    questionEditForm.setValues({
      content: q.content,
      points: q.points,
      question_type: q.question_type,
      correct_answer: typeof q.correct_answer === 'string' ? q.correct_answer : '',
      optionA: q.options?.A ?? '',
      optionB: q.options?.B ?? '',
      optionC: q.options?.C ?? '',
      optionD: q.options?.D ?? '',
      media_url: url,
    });
  };

  const cancelEditQuestion = () => {
    setEditingQuestionId(null);
    setMediaUploadError('');
  };

  const handleEditMediaFile = async (file: File | null) => {
    setMediaUploadError('');
    if (!file) {
      questionEditForm.setFieldValue('media_url', null);
      return;
    }
    setMediaUploadLoading(true);
    try {
      const uploaded = await examApi.uploadExamMedia(file);
      const url = uploaded.url;
      questionEditForm.setFieldValue('media_url', url);
    } catch (e: unknown) {
      setMediaUploadError(e instanceof Error ? e.message : 'Không tải được media.');
    } finally {
      setMediaUploadLoading(false);
    }
  };

  const clearEditMedia = () => {
    questionEditForm.setFieldValue('media_url', null);
    setMediaUploadError('');
  };

  const saveEditQuestion = (idx: number) => {
    const v = questionEditForm.getValues();
    const optionsMcq =
      v.question_type === 'mcq'
        ? { A: v.optionA, B: v.optionB, C: v.optionC, D: v.optionD }
        : undefined;
    setQuestions((prev) => {
      const next = [...prev];
      const base = prev[idx];
      next[idx] = {
        ...base,
        content: v.content,
        question_type: v.question_type,
        points: v.points,
        options: optionsMcq,
        correct_answer: v.question_type === 'mcq' ? (v.correct_answer || null) : null,
        media_url: v.media_url,
        media: v.media_url
          ? {
              type: guessMediaType(v.media_url),
              filename: '',
              status: 'found' as const,
              url: v.media_url,
            }
          : undefined,
      };
      return next;
    });
    setEditingQuestionId(null);
  };

  const saveExam = async () => {
    const { title, description, durationMin, closesAt, classId } = examForm.getValues();
    const duration = Number(durationMin);
    if (!title.trim() || !classId || !Number.isFinite(duration) || duration <= 0) {
      setError('Vui lòng nhập tiêu đề, lớp và thời gian làm bài hợp lệ.');
      return;
    }
    if (questions.length === 0) {
      setError('Bài thi cần ít nhất 1 câu hỏi.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (examId) {
        await examApi.updateExam(examId, {
          title: title.trim(),
          duration_min: Math.floor(duration),
          description: description.trim() || null,
          closes_at: closesAt ? new Date(closesAt).toISOString() : null,
        });
        const ordered = normalizeQuestions(questions);
        const existing = ordered.filter((q): q is AuthoringQuestion & { id: string } => Boolean(q.id));
        const newQuestions = ordered.filter((question) => !question.id);

        for (const question of existing) {
          await examApi.updateQuestion(examId, question.id, {
            content: question.content,
            question_type: question.question_type,
            points: question.points,
            options: question.options ?? null,
            correct_answer: question.correct_answer ?? null,
            media_url: question.media_url ?? question.media?.url ?? null,
            display_order: question.display_order,
          });
        }
        for (const question of newQuestions) {
          await examApi.addQuestion(examId, {
            content: question.content,
            question_type: question.question_type,
            points: question.points,
            options: question.options ?? undefined,
            correct_answer: question.correct_answer ?? undefined,
            media_url: question.media_url ?? question.media?.url ?? null,
          });
        }
        setNotice(
          `Đã cập nhật bài thi (${existing.length} câu đã lưu${newQuestions.length ? `, +${newQuestions.length} câu mới` : ''}).`
        );
        window.setTimeout(() => navigate('/exams'), 800);
        return;
      }

      const created = await examApi.commitWordImport({
        title: title.trim(),
        class_id: classId,
        duration_min: Math.floor(duration),
        description: description.trim() || null,
        closes_at: closesAt ? new Date(closesAt).toISOString() : null,
        questions: normalizeQuestions(questions).map((q) => ({
          ...q,
          media_url: q.media_url ?? q.media?.url ?? null,
        })),
      });
      setNotice(`Đã tạo bài thi "${created.exam.title}" với ${created.questions.length} câu.`);
      window.setTimeout(() => navigate('/exams'), 800);
    } catch {
      setError('Không tạo được bài thi. Vui lòng kiểm tra dữ liệu và thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box className="max-w-[1400px] mx-auto p-4">
      {/* Page header */}
      <Group justify="space-between" mb="md" wrap="wrap">
        <Group gap="sm">
          <Title order={2}>{isEditMode ? 'Sửa bài thi' : 'Tạo bài thi mới'}</Title>
          {isEditMode && (
            <Badge size="lg" color="teal" variant="light">{questions.length} câu</Badge>
          )}
        </Group>
        <Group gap="sm">
          <Button variant="default" onClick={() => navigate('/exams')}>Quay lại</Button>
          <Button color="green" loading={saving} onClick={saveExam}>
            {isEditMode ? 'Cập nhật' : 'Lưu bài thi'}
          </Button>
        </Group>
      </Group>

      {!!error && <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />} mb="sm">{error}</Alert>}
      {!!notice && <Alert color="green" variant="light" icon={<IconCheck size={16} />} mb="sm">{notice}</Alert>}

      {/* Two-column layout */}
      <Group align="flex-start" gap="md" wrap="wrap" style={{ rowGap: '12px' }}>
        {/* LEFT COLUMN — Exam info + Import (compact sidebar) */}
        <Stack gap="sm" style={{ minWidth: 320, flex: '0 0 320px' }}>
          {/* Thông tin bài thi — collapsible */}
          <Paper radius="md" withBorder style={{ overflow: 'hidden' }}>
            <Box
              style={{ background: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)', padding: '10px 16px', cursor: 'pointer' }}
              onClick={() => setInfoCollapsed((v) => !v)}
            >
              <Group justify="space-between">
                <Group gap="xs">
                  <Text size="sm" fw={600} c="white">Thông tin bài thi</Text>
                </Group>
                {infoCollapsed ? <IconChevronDown size={14} color="white" /> : <IconChevronUp size={14} color="white" />}
              </Group>
            </Box>
            <Collapse in={!infoCollapsed}>
              <Stack gap="xs" p="sm">
                <TextInput
                  label="Tiêu đề bài thi"
                  size="sm"
                  placeholder="VD: Giữa kỳ - Python cơ bản"
                  key={examForm.key('title')}
                  {...examForm.getInputProps('title')}
                />
                <Select
                  label="Lớp học"
                  size="sm"
                  placeholder={loading ? 'Đang tải...' : 'Chọn lớp'}
                  data={classOptions}
                  searchable
                  disabled={isEditMode}
                  key={examForm.key('classId')}
                  {...examForm.getInputProps('classId')}
                />
                <Group grow>
                  <NumberInput
                    label="Thời gian (phút)"
                    size="sm"
                    min={1}
                    max={300}
                    key={examForm.key('durationMin')}
                    {...examForm.getInputProps('durationMin')}
                  />
                  <TextInput
                    label="Hạn nộp"
                    size="sm"
                    type="datetime-local"
                    key={examForm.key('closesAt')}
                    {...examForm.getInputProps('closesAt')}
                  />
                </Group>
                <Textarea
                  label="Mô tả"
                  size="sm"
                  minRows={2}
                  placeholder="Nội dung, yêu cầu..."
                  key={examForm.key('description')}
                  {...examForm.getInputProps('description')}
                />
              </Stack>
            </Collapse>
          </Paper>

          {/* Import từ Word */}
          <Paper radius="md" withBorder style={{ overflow: 'hidden' }}>
            <Box style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', padding: '10px 16px' }}>
              <Group gap="xs">
                <IconFileWord size={14} color="white" />
                <Text size="sm" fw={600} c="white">Import từ Word (.docx)</Text>
              </Group>
            </Box>
            <Stack gap="xs" p="sm">
              <Text size="xs" c="dimmed">
                Tags: <code>[LOAI:TN]</code> <code>[DIEM:1]</code> <code>[KHO:DE]</code> <code>[DAPAN:A]</code>
              </Text>
              <Dropzone
                onDrop={(files) => setFile(files[0] ?? null)}
                accept={[MIME_TYPES.docx, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
                maxFiles={1}
                radius="md"
                p="xs"
              >
                <Group justify="center" gap="xs" mih={50} style={{ pointerEvents: 'none' }}>
                  <Dropzone.Accept>
                    <IconUpload size={20} color="var(--mantine-color-teal-6)" />
                  </Dropzone.Accept>
                  <Dropzone.Reject>
                    <IconX size={20} color="var(--mantine-color-red-6)" />
                  </Dropzone.Reject>
                  <Dropzone.Idle>
                    <IconFileWord size={20} color="var(--mantine-color-gray-5)" />
                  </Dropzone.Idle>
                  <div>
                    <Text size="xs" c="dimmed" ta="center">
                      {file ? file.name : 'Kéo thả .docx hoặc click'}
                    </Text>
                    {file && (
                      <Text size="xs" c="teal" ta="center">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </Text>
                    )}
                  </div>
                </Group>
              </Dropzone>
              <Group gap="xs">
                <Button size="xs" variant="light" leftSection={<IconFileWord size={12} />} loading={loading} onClick={previewWord} disabled={!file}>
                  Xem trước
                </Button>
                <Button size="xs" variant="light" color="violet" disabled={!preview || !file} onClick={applyPreviewQuestions}>
                  Kiểm tra &amp; Import
                </Button>
              </Group>
              {preview && (
                <Group gap="xs">
                  <Badge color="blue" size="sm">{preview.questions.length} câu</Badge>
                  {preview.parse_summary && preview.parse_summary.needs_review > 0 && (
                    <Badge color="orange" size="sm">{preview.parse_summary.needs_review} cần xem lại</Badge>
                  )}
                  {preview.errors.map((item, i) => (
                    <Text key={i} size="xs" c="red">{item}</Text>
                  ))}
                </Group>
              )}
            </Stack>
          </Paper>
        </Stack>

        {/* RIGHT COLUMN — Questions list (main content) */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          {/* Empty state */}
          {questions.length === 0 && (
            <Paper radius="md" withBorder style={{ overflow: 'hidden' }}>
              <Box style={{ background: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)', padding: '14px 20px' }}>
                <Text size="sm" fw={600} c="white">Danh sách câu hỏi</Text>
              </Box>
              <Stack align="center" gap="sm" py="xl">
                <ThemeIcon size={48} radius="xl" variant="light" color="gray">
                  <IconFileWord size={24} />
                </ThemeIcon>
                <Text fw={500} c="dimmed">
                  {isEditMode ? 'Bài thi chưa có câu hỏi nào' : 'Chưa có câu hỏi nào'}
                </Text>
                <Text size="sm" c="dimmed" ta="center" maw={300}>
                  {isEditMode
                    ? 'Import file Word để thêm câu hỏi vào bài thi này.'
                    : 'Import từ file Word để bắt đầu tạo đề thi.'}
                </Text>
              </Stack>
            </Paper>
          )}

          {/* Questions cards */}
          {questions.length > 0 && (
            <Stack gap="sm">
              {questions.map((q, idx) => {
                const isEditing = editingQuestionId === (q.id ?? String(idx));

                return (
                  <Paper key={q.id ?? idx} radius="md" withBorder style={{ overflow: 'hidden' }}>
                    {/* Card header */}
                    <Box
                      style={{
                        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        padding: '10px 14px',
                        borderBottom: '1px solid #e2e8f0',
                      }}
                    >
                      <Group justify="space-between">
                        <Group gap="xs">
                          <Text size="xs" fw={700} c="dimmed">#{idx + 1}</Text>
                          <Badge
                            color={q.question_type === 'mcq' ? 'blue' : 'grape'}
                            size="sm"
                            variant="light"
                          >
                            {q.question_type === 'mcq' ? 'Trắc nghiệm' : 'Tự luận'}
                          </Badge>
                          <Badge size="xs" variant="outline" color="gray">{q.points} điểm</Badge>
                        </Group>
                        <Group gap={4}>
                          {q.correct_answer && typeof q.correct_answer === 'string' && (
                            <Badge size="xs" color="green" variant="light">Đáp án: {q.correct_answer}</Badge>
                          )}
                          <ActionIcon
                            size="sm"
                            variant="light"
                            color="teal"
                            onClick={() => startEditQuestion(q, idx)}
                          >
                            <IconEdit size={12} />
                          </ActionIcon>
                          <ActionIcon
                            size="sm"
                            variant="light"
                            color="red"
                            onClick={() => deleteQuestion(idx)}
                          >
                            <IconTrash size={12} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    </Box>

                    {/* Card body */}
                    <Box p="sm">
                      {isEditing ? (
                        <Stack gap="xs" key={editingQuestionId ?? idx}>
                          <Textarea
                            label="Nội dung câu hỏi"
                            size="sm"
                            minRows={2}
                            key={questionEditForm.key('content')}
                            {...questionEditForm.getInputProps('content')}
                          />
                          <Group grow>
                            <NumberInput
                              label="Điểm"
                              size="sm"
                              min={0.5}
                              step={0.5}
                              key={questionEditForm.key('points')}
                              {...questionEditForm.getInputProps('points')}
                            />
                            <Select
                              label="Loại"
                              size="sm"
                              data={[
                                { value: 'mcq', label: 'Trắc nghiệm' },
                                { value: 'essay', label: 'Tự luận' },
                              ]}
                              key={questionEditForm.key('question_type')}
                              {...questionEditForm.getInputProps('question_type')}
                            />
                            {questionEditForm.getValues().question_type === 'mcq' && (
                              <Select
                                label="Đáp án"
                                size="sm"
                                data={[
                                  { value: 'A', label: 'A' },
                                  { value: 'B', label: 'B' },
                                  { value: 'C', label: 'C' },
                                  { value: 'D', label: 'D' },
                                ]}
                                key={questionEditForm.key('correct_answer')}
                                {...questionEditForm.getInputProps('correct_answer')}
                              />
                            )}
                          </Group>
                          {questionEditForm.getValues().question_type === 'mcq' && (
                            <>
                              <Text size="xs" fw={600} c="dimmed">Các lựa chọn</Text>
                              {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                                <Group key={opt} gap="xs" align="flex-start">
                                  <Text size="xs" fw={700} c="dimmed" style={{ minWidth: 16, paddingTop: 6 }}>{opt}.</Text>
                                  <TextInput
                                    size="xs"
                                    style={{ flex: 1 }}
                                    placeholder={`Nội dung đáp án ${opt}`}
                                    key={questionEditForm.key(`option${opt}` as keyof QuestionEditFormValues)}
                                    {...questionEditForm.getInputProps(`option${opt}` as keyof QuestionEditFormValues)}
                                  />
                                </Group>
                              ))}
                            </>
                          )}
                          <Divider label="Media (ảnh / âm thanh / video)" labelPosition="left" my="xs" />
                          <FileInput
                            label="Tải media (Cloudinary)"
                            description="JPG, PNG, MP3, MP4… — cần CLOUDINARY_URL trên server"
                            size="sm"
                            accept="image/*,audio/*,video/*"
                            clearable
                            disabled={mediaUploadLoading}
                            onChange={(f) => void handleEditMediaFile(f)}
                          />
                          {mediaUploadLoading && (
                            <Text size="xs" c="dimmed">Đang tải lên…</Text>
                          )}
                          {mediaUploadError && (
                            <Text size="xs" c="red">{mediaUploadError}</Text>
                          )}
                          {questionEditForm.getValues().media_url && (
                            <Group gap="xs" align="flex-end">
                              <Button size="xs" variant="light" color="red" onClick={clearEditMedia}>
                                Xóa media
                              </Button>
                            </Group>
                          )}
                          {questionEditForm.getValues().media_url && (
                            <AuthoringMediaPreview url={questionEditForm.getValues().media_url!} />
                          )}
                          <Group gap="xs" justify="flex-end">
                            <Button size="xs" variant="default" onClick={cancelEditQuestion}>Hủy</Button>
                            <Button size="xs" color="teal" onClick={() => saveEditQuestion(idx)}>Lưu</Button>
                          </Group>
                        </Stack>
                      ) : (
                        <>
                          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }} mb="xs">{q.content}</Text>
                          {mediaUrlFromQuestion(q) && (
                            <Box mb="sm" p="xs" style={{ background: '#f8fafc', borderRadius: 8 }}>
                              <Text size="xs" fw={600} c="dimmed" mb={6}>Media</Text>
                              <AuthoringMediaPreview url={mediaUrlFromQuestion(q)!} />
                            </Box>
                          )}
                          {q.question_type === 'mcq' && q.options && (
                            <Stack gap={2} pl="sm">
                              {['A', 'B', 'C', 'D'].map((opt) =>
                                q.options?.[opt] ? (
                                  <Group key={opt} gap="xs">
                                    <Text size="xs" fw={700} c="dimmed">{opt}.</Text>
                                    <Text size="xs">{q.options[opt]}</Text>
                                    {typeof q.correct_answer === 'string' && q.correct_answer.toUpperCase() === opt && (
                                      <Badge color="green" size="xs" variant="filled">Đáp án</Badge>
                                    )}
                                  </Group>
                                ) : null
                              )}
                            </Stack>
                          )}
                        </>
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Box>
      </Group>

      {verifyOpened && preview && (
        <ExamImportPreviewModal
          preview={preview}
          onConfirm={handleVerifyConfirm}
          onClose={() => setVerifyOpened(false)}
        />
      )}
    </Box>
  );
}