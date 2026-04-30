import { useEffect, useState } from 'react';
import { Box, Title, Text, Progress, Table, Loader, Paper, Group, Alert, Stack } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import examApi from '@/services/examApi';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import { useNavigate } from 'react-router-dom';

type GradeRow = { subject: string; score: number };

const Prediction = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [prediction, setPrediction] = useState<number>(0);
  const [pastGrades, setPastGrades] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const getPrediction = async () => {
      try {
        setLoading(true);
        const [sessions, exams] = await Promise.all([examApi.getMySessions(), examApi.getExams()]);
        const completed = sessions.filter((s) => s.status !== 'active' && s.score != null && s.max_points);
        const rows = completed.slice(0, 6).map((s) => {
          const exam = exams.find((e) => e.id === s.exam_id);
          const pct = s.max_points ? Math.round(((s.score || 0) / s.max_points) * 100) : 0;
          return { subject: exam?.subject_name || exam?.title || s.exam_id, score: pct };
        });

        const avg = rows.length ? Math.round(rows.reduce((acc, x) => acc + x.score, 0) / rows.length) : 0;
        const trendBoost = rows.length >= 3 ? Math.min(5, Math.round((rows[0].score - rows[rows.length - 1].score) / 5)) : 0;
        setPastGrades(rows);
        setPrediction(Math.max(0, Math.min(100, avg + trendBoost)));
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
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        <Title order={2}>{t('prediction.title')}</Title>
        <Text c="dimmed">{t('prediction.subtitle')}</Text>

        <Group grow>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">{t('prediction.next_score')}</Text>
            <Text fw={700} size="xl">{prediction}%</Text>
            <Progress value={prediction} mt="xs" />
          </Paper>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">{t('prediction.readiness')}</Text>
            <Text fw={700} size="xl">
              {prediction >= 80
                ? t('prediction.readiness_high')
                : prediction >= 60
                  ? t('prediction.readiness_medium')
                  : t('prediction.readiness_low')}
            </Text>
          </Paper>
        </Group>

        {pastGrades.length === 0 ? (
          <Alert color="yellow" variant="light">
            {t('prediction.no_data')}
          </Alert>
        ) : (
          <Paper withBorder radius="md" p="sm">
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('prediction.subject')}</Table.Th>
                  <Table.Th>{t('prediction.score')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {pastGrades.map((item) => (
                  <Table.Tr key={item.subject}>
                    <Table.Td>{item.subject}</Table.Td>
                    <Table.Td>{item.score}%</Table.Td>
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
