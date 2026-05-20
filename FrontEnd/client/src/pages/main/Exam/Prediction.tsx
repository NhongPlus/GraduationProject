import { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Title, Text, Progress, Table, Loader, Paper, Group, Alert, Stack, Badge, Button } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import examApi, {
  type PredictionResult,
  type PredictionSubject,
  type PredictionRecomputeSummary,
  type PredictionEligibility,
  type PredictionCatalogGroup,
} from '@/services/examApi';
import SubjectCategoryPicker from '@/components/Input/SubjectCategoryPicker';
import { catalogToPickerGroups } from '@/components/Input/SubjectCategoryPicker/predictionSubjectGrouping';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import { useNavigate } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
import { scoreToGrade10, grade10ToLetter } from '@/utils/formatExamScore';

type HistoryRow = { subject: string; score: number; grade: string };

const Prediction = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userRole } = useAuth();

  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [pastGrades, setPastGrades] = useState<HistoryRow[]>([]);
  const [catalog, setCatalog] = useState<PredictionCatalogGroup[]>([]);
  const [targetSubjectId, setTargetSubjectId] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<PredictionEligibility | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [recomputeLoading, setRecomputeLoading] = useState(false);
  const [recomputeSummary, setRecomputeSummary] = useState<PredictionRecomputeSummary | null>(null);
  const [recomputeError, setRecomputeError] = useState('');

  const pickerGroups = useMemo(() => catalogToPickerGroups(catalog), [catalog]);
  const flatSubjects = useMemo(
    () => pickerGroups.flatMap((g) => g.subjects),
    [pickerGroups]
  );
  const selectedSubject = useMemo(
    () => flatSubjects.find((s) => s.id === targetSubjectId) ?? null,
    [flatSubjects, targetSubjectId]
  );

  const loadStudentView = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sessions, exams, catalogData] = await Promise.all([
        examApi.getMySessions(),
        examApi.getExams(),
        examApi.getPredictionSubjectCatalog(),
      ]);
      setCatalog(catalogData);
      const localFlat = catalogToPickerGroups(catalogData).flatMap((g) => g.subjects);

      const completed = sessions.filter(
        (s) => s.status !== 'active' && s.score != null && s.max_points
      );

      const rows: HistoryRow[] = completed
        .slice(0, 20)
        .map((s) => {
          const exam = exams.find((e) => e.id === s.exam_id);
          const g10 = scoreToGrade10(s.score, s.max_points);
          const grade = g10 != null ? grade10ToLetter(g10) : '—';
          return {
            subject: exam?.subject_name || exam?.title || s.exam_id,
            score: g10 ?? 0,
            grade,
          };
        })
        .reverse();

      setPastGrades(rows);

      if (rows.length === 0) {
        setError(t('prediction.no_data'));
        setLoading(false);
        return;
      }

      const cached = await examApi.getMyPredictionCache();
      if (cached) {
        setPredictionResult(cached);
        const match =
          localFlat.find((s) => s.id === cached.target_subject_id) ??
          localFlat.find(
            (s) => s.name === cached.target_subject || cached.predictions[0]?.subject === s.name
          );
        if (match) setTargetSubjectId(match.id);
      }
    } catch {
      setError(t('errors.prediction_failed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (userRole === 'admin') {
      setLoading(false);
      return;
    }
    void loadStudentView();
  }, [userRole, loadStudentView]);

  useEffect(() => {
    if (!targetSubjectId) {
      setEligibility(null);
      return;
    }
    let cancelled = false;
    setEligibilityLoading(true);
    void examApi
      .getPredictionEligibility(targetSubjectId)
      .then((data) => {
        if (!cancelled) setEligibility(data);
      })
      .catch(() => {
        if (!cancelled) setEligibility(null);
      })
      .finally(() => {
        if (!cancelled) setEligibilityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetSubjectId]);

  const handleGenerate = async () => {
    if (!targetSubjectId) return;
    setGenerateLoading(true);
    setGenerateError('');
    try {
      const result = await examApi.generateMyPrediction(targetSubjectId);
      setPredictionResult(result);
    } catch (e: unknown) {
      const resp = e as { response?: { status?: number; data?: { message?: string; code?: string } } };
      const status = resp.response?.status;
      const msg = resp.response?.data?.message;
      if (status === 408 || resp.response?.data?.code === 'prediction_timeout') {
        setGenerateError(t('prediction.generate_timeout'));
      } else {
        setGenerateError(msg || t('errors.prediction_failed'));
      }
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleRecompute = async () => {
    setRecomputeLoading(true);
    setRecomputeError('');
    setRecomputeSummary(null);
    try {
      const summary = await examApi.adminRecomputeAllPredictions();
      setRecomputeSummary(summary);
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' &&
        e !== null &&
        'response' in e &&
        typeof (e as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (e as { response: { data: { message: string } } }).response.data.message
          : t('errors.prediction_failed');
      setRecomputeError(msg);
    } finally {
      setRecomputeLoading(false);
    }
  };

  const canGenerate =
    Boolean(targetSubjectId) &&
    eligibility?.eligible === true &&
    !generateLoading &&
    !eligibilityLoading;

  if (loading) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Loader />
      </Box>
    );
  }

  if (userRole === 'admin') {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Stack gap="md">
          <Title order={2}>{t('prediction.title')}</Title>
          <Text c="dimmed">{t('prediction.admin_intro')}</Text>
          <Alert color="blue" variant="light">
            {t('prediction.admin_note')}
          </Alert>
          <Button loading={recomputeLoading} onClick={() => void handleRecompute()}>
            {t('prediction.admin_recompute')}
          </Button>
          {recomputeError && (
            <Alert color="red" variant="light">
              {recomputeError}
            </Alert>
          )}
          {recomputeSummary && (
            <Paper withBorder radius="md" p="md">
              <Text fw={600} mb="sm">{t('prediction.admin_summary_title')}</Text>
              <Text size="sm">
                {t('prediction.admin_summary_line', {
                  total: recomputeSummary.total_students,
                  computed: recomputeSummary.computed,
                  skipped: recomputeSummary.skipped_no_data,
                  failed: recomputeSummary.failed,
                })}
              </Text>
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

  const targetPrediction =
    predictionResult?.predictions.find(
      (p) => p.subject === predictionResult.target_subject || p.subject === selectedSubject?.name
    ) ?? predictionResult?.predictions[0];

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        <Title order={2}>{t('prediction.title')}</Title>
        <Text c="dimmed">{t('prediction.subtitle_student')}</Text>

        <SubjectCategoryPicker
          label={t('prediction.target_subject_label')}
          placeholder={t('prediction.target_subject_placeholder')}
          subjects={flatSubjects}
          externalGroups={pickerGroups}
          searchMode="global"
          value={targetSubjectId}
          onChange={setTargetSubjectId}
          required
        />

        {eligibilityLoading && (
          <Text size="sm" c="dimmed">{t('prediction.checking_eligibility')}</Text>
        )}

        {eligibility && !eligibility.eligible && (
          <Alert color="orange" variant="light" title={t('prediction.insufficient_title')}>
            {eligibility.message}
            {eligibility.missing_prerequisites.length > 0 && (
              <Text size="sm" mt="xs">
                {t('prediction.missing_prereq', {
                  list: eligibility.missing_prerequisites.join(', '),
                })}
              </Text>
            )}
          </Alert>
        )}

        {eligibility?.eligible && (
          <Alert color="green" variant="light">
            {eligibility.message}
            {eligibility.group_labels.length > 0 && (
              <Text size="xs" mt={4} c="dimmed">
                {t('prediction.group_hint', { groups: eligibility.group_labels.join(', ') })}
              </Text>
            )}
          </Alert>
        )}

        <Group>
          <Button loading={generateLoading} disabled={!canGenerate} onClick={() => void handleGenerate()}>
            {predictionResult ? t('prediction.regenerate') : t('prediction.generate')}
          </Button>
        </Group>

        {generateError && (
          <Alert color="red" variant="light">
            {generateError}
          </Alert>
        )}

        {predictionResult?.target_subject && (
          <Text size="sm" c="dimmed">
            {t('prediction.result_for', { subject: predictionResult.target_subject })}
          </Text>
        )}

        {predictionResult?.just_completed && (
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed" mb="xs">{t('prediction.context_exam')}</Text>
            <Group justify="space-between" mb="xs">
              <Text fw={600}>{predictionResult.just_completed.subject}</Text>
              <Badge>{predictionResult.just_completed.grade}</Badge>
            </Group>
            <Text size="sm" c="dimmed">
              {predictionResult.just_completed.score}/10 — {predictionResult.just_completed.vs_class_avg}
            </Text>
            {predictionResult.just_completed.analysis && (
              <Text size="sm" mt="xs" fs="italic">{predictionResult.just_completed.analysis}</Text>
            )}
          </Paper>
        )}

        {targetPrediction && (
          <Group grow>
            <Paper withBorder radius="md" p="md">
              <Text size="sm" c="dimmed">{t('prediction.predicted_score_label')}</Text>
              <Group gap="xs" align="flex-end">
                <Text fw={700} size="xl">{targetPrediction.predicted_score.toFixed(1)}/10</Text>
                <Badge color={targetPrediction.grade.startsWith('A') ? 'green' : 'blue'}>{targetPrediction.grade}</Badge>
              </Group>
              <Progress
                value={targetPrediction.predicted_score * 10}
                mt="xs"
                color={targetPrediction.predicted_score >= 8 ? 'green' : targetPrediction.predicted_score >= 6 ? 'blue' : 'orange'}
              />
              <Text size="xs" c="dimmed" mt="xs" lineClamp={3}>{targetPrediction.reasoning}</Text>
            </Paper>
            <Paper withBorder radius="md" p="md">
              <Text size="sm" c="dimmed">{t('prediction.readiness')}</Text>
              <Text fw={700} size="xl">
                {targetPrediction.confidence >= 0.8
                  ? t('prediction.readiness_high')
                  : targetPrediction.confidence >= 0.6
                    ? t('prediction.readiness_medium')
                    : t('prediction.readiness_low')}
              </Text>
              <Text size="xs" c="dimmed" mt="xs">R² ≈ {targetPrediction.confidence.toFixed(2)}</Text>
            </Paper>
          </Group>
        )}

        {predictionResult?.improvement && predictionResult.improvement.length > 0 && (
          <Paper withBorder radius="md" p="md">
            <Text fw={600} mb="sm">{t('prediction.improvement_title')}</Text>
            <Stack gap={4}>
              {predictionResult.improvement.map((line, i) => (
                <Text key={i} size="sm">• {line}</Text>
              ))}
            </Stack>
          </Paper>
        )}

        {predictionResult?.wrong_summary && predictionResult.wrong_summary.length > 0 && (
          <Paper withBorder radius="md" p="md">
            <Text fw={600} mb="sm">{t('prediction.wrong_summary_title')}</Text>
            <Stack gap="xs">
              {predictionResult.wrong_summary.map((w) => (
                <Box key={w.q}>
                  <Text size="sm" fw={500}>{t('prediction.wrong_item', { q: w.q })}</Text>
                  <Text size="sm" c="dimmed">{w.stem}</Text>
                </Box>
              ))}
            </Stack>
          </Paper>
        )}

        {predictionResult?.overall_advice && (
          <Alert color="blue" variant="light" title={t('prediction.advice_title')}>
            {predictionResult.overall_advice}
          </Alert>
        )}

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
                    <Table.Td>{item.score > 0 ? `${item.score}/10` : '—'}</Table.Td>
                    <Table.Td>
                      <Badge size="sm">{item.grade}</Badge>
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
