import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Title, Text, Loader, Table, Badge, Paper, Group, Alert, Stack, Accordion, ThemeIcon, Progress,
} from '@mantine/core';
import { IconCheck, IconX, IconClock, IconAlertCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import examApi from '@/services/examApi';
import type { MySubmission, Question } from '@/services/examApi';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';

type ResultDetail = {
  question_id: string;
  question_type: 'mcq' | 'essay';
  submitted: string | string[] | null;
  is_correct: boolean;
  points_earned: number | null;
  max_points: number;
  pending_grading?: boolean;
  teacher_comment?: string | null;
};

const ExamResult = () => {
  const { t } = useTranslation();
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<MySubmission | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadResult = async () => {
      if (!examId) return;
      try {
        setLoading(true);
        const data = await examApi.getMySubmission(examId);
        setResult(data);
        const qs = await examApi.getQuestions(examId);
        setQuestions(qs);
      } catch {
        setError(t('errors.result_load_failed'));
      } finally {
        setLoading(false);
      }
    };

    loadResult();
  }, [examId, t]);

  if (!examId) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Title order={2}>{t('exam_result.invalid_exam')}</Title>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Loader />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  if (!result) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Title order={2}>{t('exam_result.no_result')}</Title>
        <ButtonFilled
          style={{ marginTop: 16 }}
          label={t('common.back_exam_list')}
          disabled={false}
          onClick={() => navigate('/exams')}
        />
      </Box>
    );
  }

  const detailsByQuestionId = new Map(result.details.map((d) => [d.question_id, d]));
  const scorePct =
    result.max_points && result.max_points > 0 && result.score != null
      ? Math.round((result.score / result.max_points) * 100)
      : null;
  const correctCount = result.details.filter((d) => d.is_correct).length;
  const scoreColor = scorePct == null ? 'gray' : scorePct >= 80 ? 'green' : scorePct >= 50 ? 'yellow' : 'red';

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        <Title order={2}>{t('exam_result.title', { id: examId })}</Title>

        {/* Summary cards */}
        <Group grow>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">{t('exam_result.correct_label')}</Text>
            <Group gap={4} align="center">
              <Text fw={700} size="xl">{correctCount}/{result.details.length}</Text>
              <ThemeIcon color="green" size="sm" radius="xl" variant="filled">
                <IconCheck size={12} />
              </ThemeIcon>
            </Group>
          </Paper>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">{t('exam_result.score_label')}</Text>
            <Text fw={700} size="xl">
              {result.score != null && result.max_points != null
                ? `${result.score}/${result.max_points}`
                : t('exam_result.pending_score')}
            </Text>
          </Paper>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">{t('exam_result.percentage_label')}</Text>
            <Group gap="xs" align="center">
              <Text fw={700} size="xl" c={scoreColor}>{scorePct != null ? `${scorePct}%` : '—'}</Text>
              {scorePct != null && (
                <Progress value={scorePct} color={scoreColor} size="sm" w={80} />
              )}
            </Group>
          </Paper>
        </Group>

        {result.grading_status === 'pending_manual' && (
          <Alert color="yellow" variant="light" icon={<IconAlertCircle size={16} />}>
            {t('exam_result.pending_manual')}
          </Alert>
        )}

        {/* Question review accordion */}
        <Paper withBorder radius="md" p="md">
          <Title order={4} mb="md">{t('exam_result.review_title', 'Chi tiết bài làm')}</Title>
          <Accordion variant="separated" radius="md" defaultValue={undefined}>
            {questions.map((q, idx) => {
              const detail = result.details.find(d => d.question_id === q.id);
              const isCorrect = detail?.is_correct ?? false;
              const pendingGrading = detail?.pending_grading;
              const pointsEarned = detail?.points_earned;
              const maxPts = detail?.max_points ?? q.points;
              const teacherComment = detail?.teacher_comment;
              const submitted = detail?.submitted;
              const correctAnswer = q.correct_answer;

              // Determine submitted answer display
              const getSubmittedLabel = () => {
                if (pendingGrading) return 'Đang chờ chấm';
                if (submitted == null) return 'Chưa trả lời';
                if (Array.isArray(submitted)) return submitted.join(', ');
                return String(submitted);
              };

              // MCQ option mapping
              const getOptionLabel = (key: string) => {
                if (!q.options) return key;
                return (q.options as Record<string, string>)[key] ?? key;
              };

              return (
                <Accordion.Item key={q.id} value={q.id}>
                  <Accordion.Control
                    icon={
                      <ThemeIcon
                        color={isCorrect ? 'green' : pendingGrading ? 'yellow' : 'red'}
                        size="sm"
                        radius="xl"
                        variant="filled"
                      >
                        {pendingGrading ? <IconClock size={12} /> : isCorrect ? <IconCheck size={12} /> : <IconX size={12} />}
                      </ThemeIcon>
                    }
                  >
                    <Group justify="space-between" pr="md">
                      <Text fw={600} size="sm">Câu {idx + 1}</Text>
                      <Group gap="xs">
                        <Badge size="xs" color={q.question_type === 'mcq' ? 'blue' : 'violet'}>
                          {q.question_type === 'mcq' ? 'Trắc nghiệm' : 'Tự luận'}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          {pointsEarned != null ? `${pointsEarned}/${maxPts}` : `${maxPts} điểm`} điểm
                        </Text>
                      </Group>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="md">
                      {/* Question prompt */}
                      <Box>
                        <Text size="sm" fw={600} mb={4}>{t('exam_result.question_content')}</Text>
                        <Text size="sm">{q.content}</Text>
                      </Box>

                      {/* Options (for MCQ) */}
                      {q.question_type === 'mcq' && q.options && (
                        <Box>
                          <Text size="xs" c="dimmed" mb={6}>{t('exam_result.options_label')}</Text>
                          <Stack gap={4}>
                            {Object.entries(q.options as Record<string, string>).map(([key, label]) => {
                              const isCorrectOption = Array.isArray(correctAnswer)
                                ? correctAnswer.includes(key)
                                : correctAnswer === key;
                              const isSubmittedOption = !pendingGrading && submitted !== null && (
                                Array.isArray(submitted) ? submitted.includes(key) : submitted === key
                              );
                              return (
                                <Group
                                  key={key}
                                  gap="xs"
                                  p="xs"
                                  style={{
                                    borderRadius: 8,
                                    border: isCorrectOption ? '2px solid var(--mantine-color-green-6)' : '1px solid var(--mantine-color-gray-3)',
                                    background: isSubmittedOption ? 'var(--mantine-color-blue-0)' : isCorrectOption ? 'var(--mantine-color-green-0)' : undefined,
                                  }}
                                >
                                  <Badge size="sm" w={24} ta="center" color={isCorrectOption ? 'green' : 'gray'}>
                                    {key}
                                  </Badge>
                                  <Text size="sm" style={{ flex: 1 }}>{label}</Text>
                                  {isCorrectOption && <Badge color="green" size="xs">Đáp án đúng</Badge>}
                                  {isSubmittedOption && !isCorrectOption && <Badge color="red" size="xs">Đã chọn (sai)</Badge>}
                                </Group>
                              );
                            })}
                          </Stack>
                        </Box>
                      )}

                      {/* Answer comparison */}
                      <Group align="flex-start" gap="xl">
                        <Box style={{ flex: 1 }}>
                          <Text size="xs" c="dimmed" mb={4}>{t('exam_result.your_answer', 'Câu trả lời của bạn')}</Text>
                          <Text
                            size="sm"
                            fw={500}
                            c={isCorrect ? 'green' : pendingGrading ? 'yellow' : 'red'}
                          >
                            {q.question_type === 'mcq' && !pendingGrading && submitted != null
                              ? `${submitted} – ${getOptionLabel(String(submitted))}`
                              : getSubmittedLabel()}
                          </Text>
                        </Box>
                        <Box style={{ flex: 1 }}>
                          <Text size="xs" c="dimmed" mb={4}>{t('exam_result.correct_answer', 'Đáp án đúng')}</Text>
                          <Text size="sm" fw={500} c="green">
                            {q.question_type === 'mcq' && correctAnswer != null
                              ? `${Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer} – ${getOptionLabel(String(Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer))}`
                              : '—'}
                          </Text>
                        </Box>
                      </Group>

                      {/* Points earned */}
                      {pointsEarned != null && (
                        <Group gap="xs">
                          <Badge color={pointsEarned === maxPts ? 'green' : pointsEarned > 0 ? 'yellow' : 'red'}>
                            {pointsEarned}/{maxPts} điểm
                          </Badge>
                          {pendingGrading && <Badge color="yellow">Đang chờ chấm tự luận</Badge>}
                        </Group>
                      )}

                      {/* Teacher comment */}
                      {teacherComment && (
                        <Box p="sm" style={{ background: 'var(--mantine-color-blue-0)', borderRadius: 8 }}>
                          <Text size="xs" c="blue" fw={600} mb={4}>Nhận xét của giảng viên:</Text>
                          <Text size="sm">{teacherComment}</Text>
                        </Box>
                      )}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion>
        </Paper>

        <Group>
          <ButtonFilled
            label={t('exam_result.view_prediction')}
            disabled={false}
            onClick={() => navigate('/prediction')}
          />
          <ButtonFilled
            label={t('common.back_exam_list')}
            color="gray"
            disabled={false}
            onClick={() => navigate('/exams')}
          />
        </Group>
      </Stack>
    </Box>
  );
};

export default ExamResult;
