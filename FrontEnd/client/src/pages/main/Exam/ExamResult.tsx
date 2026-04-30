import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Title, Text, Loader, Table, Badge, Paper, Group, Alert, Stack } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import examApi from '@/services/examApi';
import type { MySubmission, Question } from '@/services/examApi';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';

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

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        <Title order={2}>{t('exam_result.title', { id: examId })}</Title>

        <Group grow>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">{t('exam_result.correct_label')}</Text>
            <Text fw={700} size="xl">
              {correctCount}/{result.details.length}
            </Text>
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
            <Text fw={700} size="xl">{scorePct != null ? `${scorePct}%` : '—'}</Text>
          </Paper>
        </Group>

        {result.grading_status === 'pending_manual' && (
          <Alert color="yellow" variant="light">
            {t('exam_result.pending_manual')}
          </Alert>
        )}

        <Paper withBorder radius="md" p="sm">
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('exam_result.question')}</Table.Th>
                <Table.Th>{t('exam_result.selected_answer')}</Table.Th>
                <Table.Th>{t('exam_result.correct_answer')}</Table.Th>
                <Table.Th>{t('exam_result.status')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {questions.map((q, idx) => {
                const detail = detailsByQuestionId.get(q.id);
                const submitted = detail?.submitted;
                const selectedText =
                  submitted == null
                    ? '—'
                    : Array.isArray(submitted)
                      ? submitted.join(', ')
                      : String(submitted);
                const correctText =
                  q.correct_answer == null
                    ? '—'
                    : Array.isArray(q.correct_answer)
                      ? q.correct_answer.join(', ')
                      : String(q.correct_answer);
                return (
                  <Table.Tr key={q.id}>
                    <Table.Td>{idx + 1}</Table.Td>
                    <Table.Td>{selectedText}</Table.Td>
                    <Table.Td>{correctText}</Table.Td>
                    <Table.Td>
                      <Badge color={detail?.is_correct ? 'green' : 'red'}>
                        {detail?.is_correct ? t('exam_result.correct') : t('exam_result.wrong')}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
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
