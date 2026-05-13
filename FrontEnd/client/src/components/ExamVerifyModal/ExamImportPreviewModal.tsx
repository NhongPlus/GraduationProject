import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Box,
  Paper,
  Group,
  Stack,
  Text,
  Title,
  Badge,
  SimpleGrid,
  ThemeIcon,
  SegmentedControl,
  Image,
  AspectRatio,
  Button,
  Select,
  NumberInput,
  Textarea,
  Alert,
  Loader,
  FileInput,
} from '@mantine/core';
import {
  IconCheck,
  IconAlertCircle,
  IconWand,
  IconPhoto,
  IconMicrophone,
  IconVideo,
} from '@tabler/icons-react';
import type { ExamImportPreview, ImportedQuestionDraft } from '@/services/examApi';
import examApi from '@/services/examApi';

interface ExamImportPreviewModalProps {
  preview: ExamImportPreview;
  onConfirm: (questions: ImportedQuestionDraft[]) => void;
  onClose: () => void;
}

const TYPE_META: Record<string, { color: string; label: string; accent: string }> = {
  mcq: { color: 'blue', label: 'TN', accent: '#3B82F6' },
  essay: { color: 'grape', label: 'TL', accent: '#10B981' },
  'TN-ANH': { color: 'orange', label: 'TN-ANH', accent: '#F59E0B' },
  'TN-AUDIO': { color: 'violet', label: 'TN-AUDIO', accent: '#8B5CF6' },
  'TN-VIDEO': { color: 'red', label: 'TN-VIDEO', accent: '#EF4444' },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  DE: 'teal',
  TRUNGBINH: 'yellow',
  KHO: 'red',
};

type MediaPreview = {
  url: string;
  type: 'image' | 'audio' | 'video';
  name: string;
};

const ensureMcqOptions = (options?: Record<string, string> | null) => ({
  A: options?.A ?? '',
  B: options?.B ?? '',
  C: options?.C ?? '',
  D: options?.D ?? '',
});

function QuestionCard({
  q,
  idx,
  updateQuestion,
  mediaPreview,
  mediaFile,
  onMediaChange,
  uploading,
  uploadError,
}: {
  q: ImportedQuestionDraft;
  idx: number;
  updateQuestion: (idx: number, updated: ImportedQuestionDraft) => void;
  mediaPreview?: MediaPreview;
  mediaFile?: File | null;
  onMediaChange: (idx: number, file: File | null) => void;
  uploading?: boolean;
  uploadError?: string;
}) {
  const meta = TYPE_META[q.question_type] || TYPE_META.mcq;
  const confidence = q.ai_confidence ?? 100;
  const isMcq = q.question_type === 'mcq';
  const difficultyKey = (q.difficulty || 'DE') as keyof typeof DIFFICULTY_COLORS;
  const confidenceColor = confidence >= 80 ? 'teal' : confidence >= 60 ? 'yellow' : 'red';
  const mediaUrl = mediaPreview?.url || q.media?.url;
  const mediaType = mediaPreview?.type || q.media?.type;
  const mediaName = mediaPreview?.name || q.media?.filename;
  const needsMediaUpload = q.media?.status === 'missing' && !mediaPreview;

  const handleTypeChange = (value: string) => {
    if (value === q.question_type) return;
    if (value === 'mcq') {
      updateQuestion(idx, {
        ...q,
        question_type: 'mcq',
        options: ensureMcqOptions(q.options),
        correct_answer: q.correct_answer || 'A',
      });
      return;
    }

    updateQuestion(idx, {
      ...q,
      question_type: 'essay',
      options: null,
      correct_answer: null,
    });
  };

  return (
    <Paper
      withBorder
      radius="lg"
      p="md"
    >
      <Stack gap="sm">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap="xs" wrap="wrap">
            <Badge variant="filled" color={meta.color}>
              #{q.display_order}
            </Badge>
            <Badge variant="light" color={meta.color}>
              {meta.label}
            </Badge>
            <Badge variant="light" color="gray">
              {q.points} pts
            </Badge>
            <Badge variant="light" color={DIFFICULTY_COLORS[difficultyKey]}>
              {q.difficulty === 'DE' ? 'Dễ' : q.difficulty === 'TRUNGBINH' ? 'Trung bình' : 'Khó'}
            </Badge>
            <Badge variant="light" color="gray">
              Ch.{q.chapter || 1}
            </Badge>
          </Group>

          <Group gap="xs" wrap="nowrap">
            <Badge variant="light" color={confidenceColor}>
              {confidence}%
            </Badge>
            <Badge
              variant="light"
              color={q.needs_review ? 'red' : 'teal'}
              leftSection={q.needs_review ? <IconAlertCircle size={12} /> : <IconCheck size={12} />}
            >
              {q.needs_review ? 'Review' : 'OK'}
            </Badge>
          </Group>
        </Group>

        <Textarea
          size="sm"
          minRows={2}
          value={q.content}
          onChange={(e) => updateQuestion(idx, { ...q, content: e.currentTarget.value })}
          variant="unstyled"
        />

        <Group gap="sm" align="flex-end" wrap="wrap">
          <Stack gap={4}>
            <Text size="xs" c="dimmed">
              Loại câu
            </Text>
            <SegmentedControl
              size="xs"
              value={q.question_type}
              onChange={handleTypeChange}
              data={[
                { value: 'mcq', label: 'Trắc nghiệm' },
                { value: 'essay', label: 'Tự luận' },
              ]}
            />
          </Stack>

          <FileInput
            size="xs"
            label="Tải media"
            placeholder="Chọn ảnh/audio/video"
            value={mediaFile ?? null}
            accept="image/*,audio/*,video/*"
            clearable
            onChange={(file) => onMediaChange(idx, file)}
          />
        </Group>

        {uploading && (
          <Text size="xs" c="dimmed">
            Đang tải media lên Cloudinary...
          </Text>
        )}
        {uploadError && (
          <Alert color="red" variant="light" icon={<IconAlertCircle size={14} />}>
            {uploadError}
          </Alert>
        )}

        {q.media && (
          <Badge
            variant="light"
            color="yellow"
            leftSection={
              q.media.type === 'image' ? <IconPhoto size={12} /> : q.media.type === 'audio' ? <IconMicrophone size={12} /> : <IconVideo size={12} />
            }
          >
            {q.media.filename}
          </Badge>
        )}

        {mediaUrl && mediaType === 'image' && (
          <Image
            src={mediaUrl}
            alt={mediaName || 'media'}
            radius="md"
            fit="contain"
            maw={520}
            mah={280}
          />
        )}
        {mediaUrl && mediaType === 'audio' && (
          <Box>
            <audio controls src={mediaUrl} style={{ width: '100%' }} />
          </Box>
        )}
        {mediaUrl && mediaType === 'video' && (
          <AspectRatio ratio={16 / 9} maw={720}>
            <video controls src={mediaUrl} style={{ width: '100%' }} />
          </AspectRatio>
        )}
        {needsMediaUpload && (
          <Alert color="red" variant="light" icon={<IconAlertCircle size={14} />}>
            Thiếu file {q.media?.type ?? 'media'} - vui lòng tải lên.
          </Alert>
        )}

        {isMcq ? (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
            {['A', 'B', 'C', 'D'].map((key) => (
              <Paper
                key={key}
                withBorder
                radius="md"
                p="xs"
              >
                <Group align="flex-start" gap="xs" wrap="nowrap">
                  <ThemeIcon size={22} radius="sm" variant="light" color="gray">
                    <Text size="xs" fw={700}>
                      {key}
                    </Text>
                  </ThemeIcon>
                  <Textarea
                    size="xs"
                    minRows={1}
                    value={q.options && q.options[key] ? q.options[key] : ''}
                    onChange={(e) => {
                      const opts = q.options ? { ...q.options } : {};
                      opts[key] = e.currentTarget.value;
                      if (!e.currentTarget.value) delete opts[key];
                      updateQuestion(idx, { ...q, options: opts });
                    }}
                    variant="unstyled"
                  />
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        ) : (
          <Box>
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">
              Gợi ý / đáp án mẫu
            </Text>
            <Textarea
              size="xs"
              minRows={2}
              value={q.answer_hint || ''}
              onChange={(e) => updateQuestion(idx, { ...q, answer_hint: e.currentTarget.value })}
              placeholder="Nhập gợi ý / đáp án mẫu..."
            />
          </Box>
        )}

        <Group gap="sm" align="flex-end" wrap="wrap">
          <Select
            size="xs"
            label="Độ khó"
            value={q.difficulty || 'DE'}
            onChange={(v) => updateQuestion(idx, { ...q, difficulty: (v as 'DE' | 'TRUNGBINH' | 'KHO') })}
            data={[
              { value: 'DE', label: 'Dễ' },
              { value: 'TRUNGBINH', label: 'Trung bình' },
              { value: 'KHO', label: 'Khó' },
            ]}
          />
          <NumberInput
            size="xs"
            label="Chương"
            min={1}
            value={q.chapter || 1}
            onChange={(v) => updateQuestion(idx, { ...q, chapter: typeof v === 'number' ? v : 1 })}
          />
          {isMcq && (
            <Select
              size="xs"
              label="Đáp án đúng"
              value={Array.isArray(q.correct_answer) ? q.correct_answer.join(',') : q.correct_answer || ''}
              onChange={(v) => updateQuestion(idx, { ...q, correct_answer: v || null })}
              data={['A', 'B', 'C', 'D', 'A,B', 'A,C', 'B,D', 'A,B,C', 'A,B,D', 'B,C,D', 'A,C,D', 'A,B,C,D']}
              allowDeselect={false}
            />
          )}
        </Group>

        {q.needs_review && q.review_reason && (
          <Alert
            color="red"
            variant="light"
            icon={<IconAlertCircle size={14} />}
          >
            {q.review_reason}
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}

export default function ExamImportPreviewModal({
  preview,
  onConfirm,
  onClose,
}: ExamImportPreviewModalProps) {
  const [questions, setQuestions] = useState<ImportedQuestionDraft[]>(preview.questions);
  const [recomposing, setRecomposing] = useState(false);
  const [recomposeError, setRecomposeError] = useState('');
  const [recomposeFile, setRecomposeFile] = useState<File | null>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<Record<number, File | null>>({});
  const [mediaPreviews, setMediaPreviews] = useState<Record<number, MediaPreview>>({});
  const [mediaUploading, setMediaUploading] = useState<Record<number, boolean>>({});
  const [mediaErrors, setMediaErrors] = useState<Record<number, string>>({});
  const mediaPreviewRef = useRef<Record<number, MediaPreview>>({});
  const mediaUploadTokenRef = useRef<Record<number, string>>({});

  const needsReviewCount = questions.filter((q) => q.needs_review).length;
  const mcqCount = questions.filter((q) => q.question_type === 'mcq').length;
  const essayCount = questions.filter((q) => q.question_type === 'essay').length;

  useEffect(() => {
    mediaPreviewRef.current = mediaPreviews;
  }, [mediaPreviews]);

  useEffect(() => () => {
    Object.values(mediaPreviewRef.current).forEach((item) => {
      if (item.url.startsWith('blob:')) URL.revokeObjectURL(item.url);
    });
  }, []);

  const detectMediaType = (file: File): MediaPreview['type'] | null => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.startsWith('video/')) return 'video';
    return null;
  };

  const handleMediaChange = async (idx: number, file: File | null) => {
    setMediaFiles((prev) => ({ ...prev, [idx]: file }));
    setMediaErrors((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
    setMediaUploading((prev) => ({ ...prev, [idx]: false }));

    const type = file ? detectMediaType(file) : null;

    setMediaPreviews((prev) => {
      const next = { ...prev };
      const existing = next[idx];
      if (existing?.url?.startsWith('blob:')) URL.revokeObjectURL(existing.url);

      if (!file || !type) {
        delete next[idx];
        return next;
      }

      next[idx] = { url: URL.createObjectURL(file), type, name: file.name };
      return next;
    });

    setQuestions((prev) =>
      prev.map((item, index) => {
        if (index !== idx) return item;
        if (!file || !type) {
          return { ...item, media: null };
        }
        return {
          ...item,
          media: {
            type,
            filename: file.name,
            status: 'embedded',
          },
        };
      })
    );

    if (!file) {
      delete mediaUploadTokenRef.current[idx];
      return;
    }
    if (!type) {
      setMediaErrors((prev) => ({ ...prev, [idx]: 'Định dạng media không hỗ trợ.' }));
      return;
    }

    const token = `${file.name}-${file.size}-${file.lastModified}`;
    mediaUploadTokenRef.current[idx] = token;
    setMediaUploading((prev) => ({ ...prev, [idx]: true }));

    try {
      const uploaded = await examApi.uploadExamMedia(file);
      if (mediaUploadTokenRef.current[idx] !== token) return;

      setQuestions((prev) =>
        prev.map((item, index) => {
          if (index !== idx) return item;
          return {
            ...item,
            media: {
              type,
              filename: file.name,
              status: 'found',
              url: uploaded.url,
            },
          };
        })
      );

      setMediaPreviews((prev) => {
        const next = { ...prev };
        const existing = next[idx];
        if (existing?.url?.startsWith('blob:')) URL.revokeObjectURL(existing.url);
        next[idx] = { url: uploaded.url, type, name: file.name };
        return next;
      });
    } catch (err: unknown) {
      if (mediaUploadTokenRef.current[idx] !== token) return;
      const message = err instanceof Error ? err.message : 'Không thể tải media lên Cloudinary.';
      setMediaErrors((prev) => ({ ...prev, [idx]: message }));
    } finally {
      if (mediaUploadTokenRef.current[idx] === token) {
        setMediaUploading((prev) => ({ ...prev, [idx]: false }));
      }
    }
  };

  const handleRecompose = async () => {
    if (!recomposeFile) {
      setShowFileUpload(true);
      return;
    }
    setRecomposing(true);
    setRecomposeError('');
    try {
      const result = await examApi.aiRecomposeExam({ file: recomposeFile, examInfo: preview.exam });
      setQuestions(result.questions);
      setShowFileUpload(false);
      setMediaFiles({});
      setMediaPreviews({});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'AI xử lý thất bại. Thử lại.';
      setRecomposeError(message);
    } finally {
      setRecomposing(false);
    }
  };

  const handleConfirm = () => {
    onConfirm(questions);
  };

  const updateQuestion = (idx: number, updated: ImportedQuestionDraft) => {
    const newQuestions = [...questions];
    newQuestions[idx] = updated;
    setQuestions(newQuestions);
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={null}
      size="95%"
      fullScreen
      styles={{
        body: {
          padding: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        },
        content: { height: '100vh' },
        header: { display: 'none' },
      }}
    >
      {/* Header */}
      <Paper
        radius={0}
        p="sm"
        withBorder
      >
        <Group justify="space-between" align="center" wrap="nowrap">
          <Stack gap={4} style={{ flex: 1 }}>
            <Title order={4}>
              {preview.exam.title || 'Xem trước đề thi'}
            </Title>
            <Group gap="xs" wrap="wrap">
              {preview.exam.duration_min && (
                <Badge variant="light" color="gray">
                  {preview.exam.duration_min} phút
                </Badge>
              )}
              <Badge variant="light" color="gray">
                {questions.length} câu
              </Badge>
              <Badge variant="light" color="blue">
                TN {mcqCount}
              </Badge>
              <Badge variant="light" color="green">
                TL {essayCount}
              </Badge>
              {needsReviewCount > 0 && (
                <Badge variant="light" color="red">
                  {needsReviewCount} cần xem lại
                </Badge>
              )}
              {preview.parse_summary && (
                <Text size="xs" c="dimmed">
                  Parse {preview.parse_summary.parse_time_ms}ms
                </Text>
              )}
            </Group>
          </Stack>

          <Group gap="xs" wrap="nowrap">
            {showFileUpload && (
              <FileInput
                size="xs"
                placeholder="Chọn file docx..."
                accept=".docx"
                value={recomposeFile}
                onChange={setRecomposeFile}
                style={{ minWidth: 160 }}
              />
            )}
            <Button
              size="xs"
              variant="light"
              color="teal"
              leftSection={recomposing ? <Loader size={12} color="#fff" /> : <IconWand size={12} />}
              onClick={handleRecompose}
              disabled={recomposing || (showFileUpload && !recomposeFile)}
            >
              AI Sửa Lại
            </Button>
            <Button
              size="xs"
              color="cyan"
              onClick={handleConfirm}
            >
              Xác nhận ({questions.length})
            </Button>
            <Button
              size="xs"
              variant="default"
              onClick={onClose}
            >
              Hủy
            </Button>
          </Group>
        </Group>

        {recomposeError && (
          <Alert
            mt="xs"
            color="red"
            variant="light"
          >
            {recomposeError}
          </Alert>
        )}
      </Paper>

      {/* Questions list */}
      <Box style={{ overflow: 'auto', flex: 1, minHeight: 0, padding: '16px 32px' }}>
        <Stack gap="md">
          {questions.map((q, idx) => (
            <QuestionCard
              key={`${q.display_order}-${idx}`}
              q={q}
              idx={idx}
              updateQuestion={updateQuestion}
              mediaPreview={mediaPreviews[idx]}
              mediaFile={mediaFiles[idx] ?? null}
              onMediaChange={handleMediaChange}
            />
          ))}
        </Stack>
      </Box>
    </Modal>
  );
}
