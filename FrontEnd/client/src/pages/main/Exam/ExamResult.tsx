import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Title, Text, Loader, Badge, Paper, Group, Alert, Stack, Accordion, ThemeIcon, Progress,
} from '@mantine/core';
import { IconCheck, IconX, IconClock, IconAlertCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import examApi from '@/services/examApi';
import type { SessionReview } from '@/services/examApi';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';

const ExamResult = () => {
  const { t } = useTranslation();
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [review, setReview] = useState<SessionReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadResult = async () => {
      if (!examId) return;
      try {
        setLoading(true);
        const submission = await examApi.getMySubmission(examId);
        if (!submission?.session?.id) {
          setReview(null);
          return;
        }
        const data = await examApi.getSessionReview(submission.session.id);
        setReview(data);
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;
        setError(msg?.trim() || t('errors.result_load_failed'));
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

  if (!review) {
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

  const questions = review.questions;
  const mcqQuestions = questions.filter((q) => q.question_type === 'mcq');
  const essayQuestions = questions.filter((q) => q.question_type === 'essay');
  const hasPendingEssay =
    review.grading_status === 'pending_manual' && essayQuestions.length > 0;
  const mcqCorrect = mcqQuestions.filter((q) => q.is_correct).length;
  const mcqScore = mcqQuestions.reduce((s, q) => s + (q.points_earned ?? 0), 0);
  const mcqMax = mcqQuestions.reduce((s, q) => s + q.max_points, 0);
  const scorePct =
    mcqMax > 0 ? Math.round((mcqScore / mcqMax) * 100) : null;
  const scoreColor = scorePct == null ? 'gray' : scorePct >= 80 ? 'green' : scorePct >= 50 ? 'yellow' : 'red';

  const getOptionLabel = (options: Record<string, string> | null, key: string) => {
    if (!options) return key;
    return options[key] ?? key;
  };

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        <Title order={2}>{review.exam.title}</Title>
        <Text size="sm" c="dimmed">{t('exam_result.subtitle')}</Text>

        <Group grow>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">{t('exam_result.correct_label')}</Text>
            <Group gap={4} align="center">
              <Text fw={700} size="xl">{mcqCorrect}/{mcqQuestions.length || questions.length}</Text>
              <ThemeIcon color="green" size="sm" radius="xl" variant="filled">
                <IconCheck size={12} />
              </ThemeIcon>
            </Group>
          </Paper>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">
              {hasPendingEssay ? t('exam_result.mcq_score_label') : t('exam_result.score_label')}
            </Text>
            <Text fw={700} size="xl">
              {hasPendingEssay
                ? `${mcqScore}/${mcqMax}`
                : review.score != null && review.max_points != null
                  ? `${review.score}/${review.max_points}`
                  : t('exam_result.pending_score')}
            </Text>
            {hasPendingEssay && (
              <Text size="xs" c="dimmed" mt={4}>
                {t('exam_result.total_score_after_essay')}
              </Text>
            )}
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

        {hasPendingEssay && (
          <Alert color="yellow" variant="light" icon={<IconAlertCircle size={16} />}>
            {t('exam_result.pending_manual')}
          </Alert>
        )}
        {mcqQuestions.length > 0 && (
          <Alert color="blue" variant="light">
            {t('exam_result.mcq_revealed_hint')}
          </Alert>
        )}

        <Paper withBorder radius="md" p="md">
          <Title order={4} mb="md">{t('exam_result.review_title')}</Title>
          {questions.length === 0 ? (
            <Text c="dimmed">{t('exam_result.no_questions')}</Text>
          ) : (
            <Accordion variant="separated" radius="md" defaultValue={undefined}>
              {questions.map((q, idx) => {
                const isCorrect = q.is_correct;
                const pendingGrading = q.pending_grading;
                const pointsEarned = q.points_earned;
                const maxPts = q.max_points;
                const teacherComment = q.teacher_comment;
                const submitted = q.submitted;
                const correctAnswer = q.correct;

                const getSubmittedLabel = () => {
                  if (pendingGrading) return t('exam_result.pending_grade');
                  if (submitted == null || submitted === '') return t('exam_result.not_answered');
                  if (Array.isArray(submitted)) return submitted.join(', ');
                  return String(submitted);
                };

                const formatMcqAnswer = (key: string | null | undefined) => {
                  if (key == null) return '—';
                  const letter = Array.isArray(key) ? key[0] : key;
                  if (!letter) return '—';
                  return `${letter} – ${getOptionLabel(q.options, String(letter))}`;
                };

                return (
                  <Accordion.Item key={q.question_id} value={q.question_id}>
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
                        <Text fw={600} size="sm">{t('exam_result.question_n', { n: idx + 1 })}</Text>
                        <Group gap="xs">
                          <Badge size="xs" color={q.question_type === 'mcq' ? 'blue' : 'violet'}>
                            {q.question_type === 'mcq' ? t('exam_result.type_mcq') : t('exam_result.type_essay')}
                          </Badge>
                          <Text size="xs" c="dimmed">
                            {pointsEarned != null ? `${pointsEarned}/${maxPts}` : maxPts} {t('exam_result.points_unit')}
                          </Text>
                        </Group>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="md">
                        <Box>
                          <Text size="sm" fw={600} mb={4}>{t('exam_result.question_content')}</Text>
                          <Text size="sm">{q.content}</Text>
                        </Box>

                        {q.question_type === 'mcq' && q.options && (
                          <Box>
                            <Text size="xs" c="dimmed" mb={6}>{t('exam_result.options_label')}</Text>
                            <Stack gap={4}>
                              {Object.entries(q.options).map(([key, label]) => {
                                const correctKey = Array.isArray(correctAnswer)
                                  ? correctAnswer[0]
                                  : correctAnswer;
                                const isCorrectOption = correctKey != null && key === String(correctKey);
                                const submittedKey = Array.isArray(submitted)
                                  ? submitted[0]
                                  : submitted;
                                const isSubmittedOption =
                                  !pendingGrading &&
                                  submittedKey != null &&
                                  key === String(submittedKey);
                                return (
                                  <Group
                                    key={key}
                                    gap="xs"
                                    p="xs"
                                    style={{
                                      borderRadius: 8,
                                      border: isCorrectOption
                                        ? '2px solid var(--mantine-color-green-6)'
                                        : '1px solid var(--mantine-color-gray-3)',
                                      background: isSubmittedOption
                                        ? 'var(--mantine-color-blue-0)'
                                        : isCorrectOption
                                          ? 'var(--mantine-color-green-0)'
                                          : undefined,
                                    }}
                                  >
                                    <Badge size="sm" w={24} ta="center" color={isCorrectOption ? 'green' : 'gray'}>
                                      {key}
                                    </Badge>
                                    <Text size="sm" style={{ flex: 1 }}>{label}</Text>
                                    {isCorrectOption && (
                                      <Badge color="green" size="xs">{t('exam_result.correct_badge')}</Badge>
                                    )}
                                    {isSubmittedOption && !isCorrectOption && (
                                      <Badge color="red" size="xs">{t('exam_result.wrong_choice')}</Badge>
                                    )}
                                  </Group>
                                );
                              })}
                            </Stack>
                          </Box>
                        )}

                        <Group align="flex-start" gap="xl">
                          <Box style={{ flex: 1 }}>
                            <Text size="xs" c="dimmed" mb={4}>{t('exam_result.your_answer')}</Text>
                            <Text
                              size="sm"
                              fw={500}
                              c={isCorrect ? 'green' : pendingGrading ? 'yellow' : 'red'}
                            >
                              {q.question_type === 'mcq' && !pendingGrading
                                ? formatMcqAnswer(
                                    Array.isArray(submitted) ? submitted[0] : (submitted as string | null)
                                  )
                                : getSubmittedLabel()}
                            </Text>
                          </Box>
                          <Box style={{ flex: 1 }}>
                            <Text size="xs" c="dimmed" mb={4}>{t('exam_result.correct_answer')}</Text>
                            <Text size="sm" fw={500} c={q.question_type === 'mcq' ? 'green' : 'dimmed'}>
                              {q.question_type === 'mcq'
                                ? formatMcqAnswer(
                                    Array.isArray(correctAnswer) ? correctAnswer[0] : (correctAnswer as string | null)
                                  )
                                : t('exam_result.essay_no_correct_yet')}
                            </Text>
                          </Box>
                        </Group>

                        {pointsEarned != null && (
                          <Group gap="xs">
                            <Badge color={pointsEarned === maxPts ? 'green' : pointsEarned > 0 ? 'yellow' : 'red'}>
                              {pointsEarned}/{maxPts} {t('exam_result.points_unit')}
                            </Badge>
                            {pendingGrading && (
                              <Badge color="yellow">{t('exam_result.pending_essay')}</Badge>
                            )}
                          </Group>
                        )}

                        {teacherComment && (
                          <Box p="sm" style={{ background: 'var(--mantine-color-blue-0)', borderRadius: 8 }}>
                            <Text size="xs" c="blue" fw={600} mb={4}>{t('exam_result.teacher_comment')}</Text>
                            <Text size="sm">{teacherComment}</Text>
                          </Box>
                        )}

                        {q.explanation && (
                          <Box p="sm" style={{ background: 'var(--mantine-color-teal-0)', borderRadius: 8 }}>
                            <Text size="xs" c="teal" fw={600} mb={4}>{t('exam_result.explanation')}</Text>
                            <Text size="sm">{q.explanation}</Text>
                          </Box>
                        )}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                );
              })}
            </Accordion>
          )}
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
