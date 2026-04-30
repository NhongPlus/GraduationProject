import { useEffect, useState } from 'react';
import { Box, Title, Text, Progress, Table, Loader, Paper, Group, Alert, Stack, Badge } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import examApi, { PredictionResult, PredictionSubject } from '@/services/examApi';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import { useNavigate } from 'react-router-dom';

type HistoryRow = { subject: string; score: number; grade: string };

const Prediction = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [pastGrades, setPastGrades] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const getPrediction = async () => {
      try {
        setLoading(true);

        const [sessions, exams] = await Promise.all([examApi.getMySessions(), examApi.getExams()]);
        const completed = sessions.filter(
          (s) => s.status !== 'active' && s.score != null && s.max_points
        );

        // Build history rows (most recent first)
        const rows: HistoryRow[] = completed
          .slice(0, 20)
          .map((s) => {
            const exam = exams.find((e) => e.id === s.exam_id);
            const pct = s.max_points ? Math.round(((s.score || 0) / s.max_points) * 100) : 0;
            const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D+' : 'F';
            return { subject: exam?.subject_name || exam?.title || s.exam_id, score: pct, grade };
          })
          .reverse(); // oldest first for history

        setPastGrades(rows);

        if (rows.length === 0) {
          setError(t('prediction.no_data'));
          setLoading(false);
          return;
        }

        // The most recently completed exam is the last one in the array (after reverse = most recent)
        const latest = rows[rows.length - 1];

        // Call BE AI prediction endpoint — student_id lấy từ JWT token phía server
        const result = await examApi.getPrediction({
          just_completed: { subject: latest.subject, score: latest.score / 10, grade: latest.grade },
          history: rows.map((r) => ({ subject: r.subject, score: r.score / 10, grade: r.grade })),
        });

        setPredictionResult(result);
      } catch {
        setError(t('errors.prediction_failed'));
      } finally {
        setLoading(false);
      }
    };

    getPrediction();
  }, [t]);

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
        <Alert color="red" variant="light">
          {error}
        </Alert>
        <ButtonFilled style={{ marginTop: 8 }} label={t('common.back_main')} disabled={false} onClick={() => navigate('/main')} />
      </Box>
    );
  }

  const topPrediction = predictionResult?.predictions[0];

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        <Title order={2}>{t('prediction.title')}</Title>
        <Text c="dimmed">{t('prediction.subtitle')}</Text>

        {/* Just completed analysis */}
        {predictionResult?.just_completed && (
          <Paper withBorder radius="md" p="md">
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">{t('prediction.last_exam')}</Text>
              <Badge color={predictionResult.just_completed.grade.startsWith('A') ? 'green' : predictionResult.just_completed.grade.startsWith('B') ? 'blue' : 'yellow'}>
                {predictionResult.just_completed.grade}
              </Badge>
            </Group>
            <Text fw={700} size="lg">{predictionResult.just_completed.subject}</Text>
            <Text size="sm" c="dimmed">
              {predictionResult.just_completed.score}/10 — {predictionResult.just_completed.vs_class_avg}
            </Text>
            {predictionResult.just_completed.analysis && (
              <Text size="sm" mt="xs" fs="italic">{predictionResult.just_completed.analysis}</Text>
            )}
          </Paper>
        )}

        {/* Top prediction */}
        {topPrediction && (
          <Group grow>
            <Paper withBorder radius="md" p="md">
              <Text size="sm" c="dimmed">{t('prediction.next_score')}</Text>
              <Group gap="xs" align="flex-end">
                <Text fw={700} size="xl">{Math.round(topPrediction.predicted_score * 10)}%</Text>
                <Badge color={topPrediction.trend === 'up' ? 'green' : topPrediction.trend === 'down' ? 'red' : 'gray'} size="sm">
                  {topPrediction.trend === 'up' ? '↑' : topPrediction.trend === 'down' ? '↓' : '→'} {topPrediction.trend}
                </Badge>
              </Group>
              <Progress value={topPrediction.predicted_score * 10} mt="xs" color={topPrediction.predicted_score >= 8 ? 'green' : topPrediction.predicted_score >= 6 ? 'blue' : 'orange'} />
            </Paper>
            <Paper withBorder radius="md" p="md">
              <Text size="sm" c="dimmed">{t('prediction.readiness')}</Text>
              <Text fw={700} size="xl">
                {topPrediction.confidence >= 0.8
                  ? t('prediction.readiness_high')
                  : topPrediction.confidence >= 0.6
                    ? t('prediction.readiness_medium')
                    : t('prediction.readiness_low')}
              </Text>
            </Paper>
          </Group>
        )}

        {/* Advice */}
        {predictionResult?.overall_advice && (
          <Alert color="blue" variant="light" title={t('prediction.advice_title')}>
            {predictionResult.overall_advice}
          </Alert>
        )}

        {/* All predictions */}
        {predictionResult?.predictions && predictionResult.predictions.length > 0 && (
          <Paper withBorder radius="md" p="sm">
            <Text fw={600} mb="sm">{t('prediction.all_predictions')}</Text>
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('prediction.subject')}</Table.Th>
                  <Table.Th>{t('prediction.semester')}</Table.Th>
                  <Table.Th>{t('prediction.credits')}</Table.Th>
                  <Table.Th>{t('prediction.score')}</Table.Th>
                  <Table.Th>{t('prediction.grade')}</Table.Th>
                  <Table.Th>Độ tin</Table.Th>
                  <Table.Th>Xu hướng</Table.Th>
                  <Table.Th>Ghi chú</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {predictionResult.predictions.map((p: PredictionSubject) => (
                  <Table.Tr key={p.subject}>
                    <Table.Td fw={500}>{p.subject}</Table.Td>
                    <Table.Td>{p.semester}</Table.Td>
                    <Table.Td>{p.credits}</Table.Td>
                    <Table.Td>{Math.round(p.predicted_score * 10)}%</Table.Td>
                    <Table.Td>
                      <Badge color={p.grade.startsWith('A') ? 'green' : p.grade.startsWith('B') ? 'blue' : p.grade.startsWith('C') ? 'yellow' : 'red'} size="sm">
                        {p.grade}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{Math.round(p.confidence * 100)}%</Table.Td>
                    <Table.Td>
                      <Text size="xs" c={p.trend === 'up' ? 'green' : p.trend === 'down' ? 'red' : 'dimmed'}>
                        {p.trend === 'up' ? '↑' : p.trend === 'down' ? '↓' : '→'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed" lineClamp={2}>{p.reasoning}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        )}

        {/* Past grades */}
        {pastGrades.length > 0 && (
          <Paper withBorder radius="md" p="sm">
            <Text fw={600} mb="sm">{t('prediction.history')}</Text>
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('prediction.subject')}</Table.Th>
                  <Table.Th>{t('prediction.score')}</Table.Th>
                  <Table.Th>{t('prediction.grade')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {pastGrades.map((item, i) => (
                  <Table.Tr key={i}>
                    <Table.Td>{item.subject}</Table.Td>
                    <Table.Td>{item.score}%</Table.Td>
                    <Table.Td>
                      <Badge color={item.grade.startsWith('A') ? 'green' : item.grade.startsWith('B') ? 'blue' : item.grade.startsWith('C') ? 'yellow' : 'red'} size="sm">
                        {item.grade}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        )}

        <ButtonFilled
          style={{ marginTop: 8 }}
          label={t('common.back_main')}
          disabled={false}
          onClick={() => navigate('/main')}
        />
      </Stack>
    </Box>
  );
};

export default Prediction;