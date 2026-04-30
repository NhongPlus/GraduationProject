import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Badge,
  Box,
  Button,
  FileInput,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import classApi, { type ClassDetail } from '@/services/classApi';
import examApi, {
  type ExamImportPreview,
  type ImportedQuestionDraft,
  type QuestionType,
} from '@/services/examApi';

type AuthoringQuestion = ImportedQuestionDraft & { id?: string };

const emptyOptions = () => ({ A: '', B: '', C: '', D: '' });

const ExamAuthoring = () => {
  const navigate = useNavigate();
  const { examId } = useParams<{ examId: string }>();
  const isEditMode = Boolean(examId);
  const [classes, setClasses] = useState<ClassDetail[]>([]);
  const [classId, setClassId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMin, setDurationMin] = useState<number | ''>(60);
  const [closesAt, setClosesAt] = useState('');
  const [questions, setQuestions] = useState<AuthoringQuestion[]>([]);
  const [questionType, setQuestionType] = useState<QuestionType>('mcq');
  const [questionContent, setQuestionContent] = useState('');
  const [questionPoints, setQuestionPoints] = useState<number | ''>(1);
  const [options, setOptions] = useState<Record<string, string>>(emptyOptions);
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ExamImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

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
        setClassId((current) => current ?? existingExam?.class_id ?? data[0]?.id ?? null);
        if (existingExam) {
          setTitle(existingExam.title);
          setDescription(existingExam.description ?? '');
          setDurationMin(existingExam.duration_min);
          setClosesAt(existingExam.closes_at ? existingExam.closes_at.slice(0, 16) : '');
        }
        if (existingQuestions.length) {
          setQuestions(
            existingQuestions.map((question, index) => ({
              id: question.id,
              content: question.content,
              question_type: question.question_type,
              points: question.points,
              options: question.options,
              correct_answer: question.correct_answer ?? null,
              display_order: question.display_order ?? index + 1,
            }))
          );
        }
      } catch {
        setError('Không tải được dữ liệu tạo bài thi.');
      } finally {
        setLoading(false);
      }
    };

    void loadInitialData();
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

  const addManualQuestion = () => {
    setError('');
    const content = questionContent.trim();
    const points = Number(questionPoints);
    if (!content || !Number.isFinite(points) || points <= 0) {
      setError('Vui lòng nhập nội dung câu hỏi và điểm hợp lệ.');
      return;
    }

    if (questionType === 'mcq') {
      const cleanOptions = Object.fromEntries(
        Object.entries(options)
          .map(([key, value]) => [key, value.trim()])
          .filter(([, value]) => value)
      );
      if (Object.keys(cleanOptions).length < 2 || !cleanOptions[correctAnswer]) {
        setError('Câu trắc nghiệm cần ít nhất 2 lựa chọn và đáp án đúng hợp lệ.');
        return;
      }
      setQuestions((prev) =>
        normalizeQuestions([
          ...prev,
          {
            content,
            question_type: 'mcq',
            points,
            options: cleanOptions,
            correct_answer: correctAnswer,
            display_order: prev.length + 1,
          },
        ])
      );
    } else {
      setQuestions((prev) =>
        normalizeQuestions([
          ...prev,
          {
            content,
            question_type: 'essay',
            points,
            options: null,
            correct_answer: null,
            display_order: prev.length + 1,
          },
        ])
      );
    }

    setQuestionContent('');
    setQuestionPoints(1);
    setOptions(emptyOptions());
    setCorrectAnswer('A');
  };

  const removeQuestion = (index: number) => {
    const question = questions[index];
    if (question?.id && !window.confirm('Xóa câu hỏi này khỏi bài thi?')) return;
    if (question?.id && examId) {
      void examApi.deleteQuestion(examId, question.id).catch(() => {
        setError('Không xóa được câu hỏi trên server.');
      });
    }
    setQuestions((prev) => normalizeQuestions(prev.filter((_, idx) => idx !== index)));
  };

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
      if (data.exam.title && !title) setTitle(data.exam.title);
      if (data.exam.description && !description) setDescription(data.exam.description);
      if (data.exam.duration_min) setDurationMin(data.exam.duration_min);
    } catch {
      setError('Không đọc được file Word. Vui lòng kiểm tra đúng template .docx.');
    } finally {
      setLoading(false);
    }
  };

  const applyPreviewQuestions = () => {
    if (!preview || preview.errors.length > 0) return;
    setQuestions((prev) =>
      normalizeQuestions(isEditMode ? [...prev, ...preview.questions] : preview.questions)
    );
    setNotice(`Đã nạp ${preview.questions.length} câu từ file Word.`);
  };

  const saveExam = async () => {
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
        const newQuestions = normalizeQuestions(questions).filter((question) => !question.id);
        for (const question of newQuestions) {
          await examApi.addQuestion(examId, {
            content: question.content,
            question_type: question.question_type,
            points: question.points,
            options: question.options ?? undefined,
            correct_answer: question.correct_answer ?? undefined,
          });
        }
        setNotice(`Đã cập nhật bài thi với ${newQuestions.length} câu mới.`);
        window.setTimeout(() => navigate('/exams'), 800);
        return;
      }

      const created = await examApi.commitWordImport({
        title: title.trim(),
        class_id: classId,
        duration_min: Math.floor(duration),
        description: description.trim() || null,
        closes_at: closesAt ? new Date(closesAt).toISOString() : null,
        questions: normalizeQuestions(questions),
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
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>{isEditMode ? 'Sửa bài thi' : 'Tạo bài thi'}</Title>
          <Button variant="default" onClick={() => navigate('/exams')}>
            Quay lại danh sách
          </Button>
        </Group>

        {!!error && <Alert color="red" variant="light">{error}</Alert>}
        {!!notice && <Alert color="green" variant="light">{notice}</Alert>}

        <Paper withBorder radius="md" p="md">
          <Stack gap="sm">
            <Title order={4}>Thông tin bài thi</Title>
            <TextInput label="Tiêu đề" value={title} onChange={(e) => setTitle(e.currentTarget.value)} />
            <Select
              label="Lớp"
              placeholder={loading ? 'Đang tải lớp...' : 'Chọn lớp'}
              value={classId}
              onChange={setClassId}
              data={classOptions}
              searchable
            />
            <Group grow align="flex-start">
              <NumberInput
                label="Thời gian làm bài (phút)"
                min={1}
                max={300}
                value={durationMin}
                onChange={(value) => setDurationMin(typeof value === 'number' ? value : '')}
              />
              <TextInput
                label="Hạn bắt đầu"
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.currentTarget.value)}
              />
            </Group>
            <Textarea
              label="Mô tả"
              minRows={3}
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
            />
          </Stack>
        </Paper>

        <Paper withBorder radius="md" p="md">
          <Stack gap="sm">
            <Title order={4}>Import từ Word (.docx)</Title>
            <Text size="sm" c="dimmed">
              Template: `Title: ...`, `Duration: ...`, `Q1 [mcq] [1]`, các dòng A/B/C/D và `Answer: B`.
              Câu tự luận dùng `Q2 [essay] [5]` và không cần đáp án.
            </Text>
            <Group align="end">
              <FileInput
                style={{ flex: 1 }}
                label="File Word"
                accept=".docx"
                value={file}
                onChange={setFile}
              />
              <Button loading={loading} onClick={previewWord}>
                Xem trước
              </Button>
              <Button
                variant="light"
                disabled={!preview || preview.errors.length > 0}
                onClick={applyPreviewQuestions}
              >
                Dùng kết quả import
              </Button>
            </Group>
            {preview && (
              <Stack gap={6}>
                <Text size="sm">
                  Đọc được <b>{preview.questions.length}</b> câu.
                </Text>
                {preview.errors.map((item) => (
                  <Text key={item} size="sm" c="red">
                    {item}
                  </Text>
                ))}
                {preview.warnings.map((item) => (
                  <Text key={item} size="sm" c="yellow.8">
                    {item}
                  </Text>
                ))}
              </Stack>
            )}
          </Stack>
        </Paper>

        <Paper withBorder radius="md" p="md">
          <Stack gap="sm">
            <Title order={4}>Thêm câu thủ công</Title>
            <Group grow align="flex-start">
              <Select
                label="Loại câu"
                value={questionType}
                onChange={(value) => setQuestionType((value as QuestionType) || 'mcq')}
                data={[
                  { value: 'mcq', label: 'Trắc nghiệm' },
                  { value: 'essay', label: 'Tự luận' },
                ]}
              />
              <NumberInput
                label="Điểm"
                min={0.25}
                value={questionPoints}
                onChange={(value) => setQuestionPoints(typeof value === 'number' ? value : '')}
              />
            </Group>
            <Textarea
              label="Nội dung câu hỏi"
              minRows={4}
              value={questionContent}
              onChange={(e) => setQuestionContent(e.currentTarget.value)}
            />
            {questionType === 'mcq' && (
              <Stack gap="xs">
                {['A', 'B', 'C', 'D'].map((key) => (
                  <TextInput
                    key={key}
                    label={`Lựa chọn ${key}`}
                    value={options[key] ?? ''}
                    onChange={(e) => setOptions((prev) => ({ ...prev, [key]: e.currentTarget.value }))}
                  />
                ))}
                <Select
                  label="Đáp án đúng"
                  value={correctAnswer}
                  onChange={(value) => setCorrectAnswer(value ?? 'A')}
                  data={['A', 'B', 'C', 'D']}
                />
              </Stack>
            )}
            <Group justify="flex-end">
              <Button onClick={addManualQuestion}>Thêm câu</Button>
            </Group>
          </Stack>
        </Paper>

        <Paper withBorder radius="md" p="md">
          <Stack gap="sm">
            <Group justify="space-between">
              <Title order={4}>Danh sách câu hỏi</Title>
              <Badge>{questions.length} câu</Badge>
            </Group>
            {questions.length === 0 ? (
              <Alert color="blue" variant="light">Chưa có câu hỏi nào.</Alert>
            ) : (
              <Table verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>#</Table.Th>
                    <Table.Th>Loại</Table.Th>
                    <Table.Th>Nội dung</Table.Th>
                    <Table.Th>Điểm</Table.Th>
                    <Table.Th>Đáp án</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {questions.map((item, index) => (
                    <Table.Tr key={`${item.display_order}-${item.content.slice(0, 20)}`}>
                      <Table.Td>{index + 1}</Table.Td>
                      <Table.Td>
                        <Badge color={item.question_type === 'mcq' ? 'blue' : 'grape'}>
                          {item.question_type === 'mcq' ? 'Trắc nghiệm' : 'Tự luận'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" lineClamp={3}>{item.content}</Text>
                      </Table.Td>
                      <Table.Td>{item.points}</Table.Td>
                      <Table.Td>{item.question_type === 'mcq' ? String(item.correct_answer ?? '') : '—'}</Table.Td>
                      <Table.Td>
                        <Button size="xs" color="red" variant="light" onClick={() => removeQuestion(index)}>
                          Xóa
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
            <Group justify="flex-end">
              <Button loading={saving} onClick={saveExam}>
                {isEditMode ? 'Cập nhật bài thi' : 'Lưu bài thi'}
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
};

export default ExamAuthoring;
