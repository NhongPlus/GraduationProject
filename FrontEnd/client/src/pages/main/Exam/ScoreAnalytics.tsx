import { useEffect, useMemo, useState } from 'react';
import {
  Box, Text, Loader, Paper, Group, Stack, Alert, SegmentedControl, Badge, SimpleGrid,
} from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { BarChart } from '@mantine/charts';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import scoreAnalyticsApi, {
  type AdminClassScoreDistribution,
  type SubjectScoreDistribution,
} from '@/services/scoreAnalyticsApi';
import EmptyState from '@/components/EmptyState/EmptyState';
import PageHeader from '@/components/PageHeader/PageHeader';
import InputMultiSelect from '@/components/Input/InputMultiSelect/InputMultiSelect';

const PALETTE = ['teal.6', 'blue.6', 'grape.6', 'orange.6', 'pink.6', 'cyan.6'];

type DistributionRow = SubjectScoreDistribution | AdminClassScoreDistribution;

function getRowLabel(row: DistributionRow): string {
  return 'subject_name' in row ? row.subject_name : row.class_label;
}

function buildChartPayload(
  rows: DistributionRow[],
  selectedLabels: string[],
  mode: 'count' | 'percent'
) {
  const active = rows.filter((r) => selectedLabels.includes(getRowLabel(r)));
  if (!active.length) return { data: [] as Record<string, string | number>[], series: [] as { name: string; color: string }[] };

  const bucketLabels = active[0].buckets.map((b) => b.range_label);
  const data = bucketLabels.map((bucket) => {
    const point: Record<string, string | number> = { bucket };
    active.forEach((row) => {
      const label = getRowLabel(row);
      const bucketRow = row.buckets.find((b) => b.range_label === bucket);
      const count = bucketRow?.count ?? 0;
      point[label] =
        mode === 'count'
          ? count
          : row.total_students > 0
            ? Number(((count / row.total_students) * 100).toFixed(1))
            : 0;
    });
    return point;
  });

  const series = active.map((row, idx) => ({
    name: getRowLabel(row),
    color: PALETTE[idx % PALETTE.length],
  }));

  return { data, series };
}

const ScoreAnalytics = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bySubject, setBySubject] = useState<SubjectScoreDistribution[]>([]);
  const [byClass, setByClass] = useState<AdminClassScoreDistribution[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [chartMode, setChartMode] = useState<'count' | 'percent'>('count');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [subjects, classes] = await Promise.all([
          scoreAnalyticsApi.getBySubjects(),
          scoreAnalyticsApi.getByAdminClasses(),
        ]);
        setBySubject(subjects);
        setByClass(classes);

        const subjectNames = subjects.map((s) => s.subject_name);
        const classLabels = classes.map((c) => c.class_label);
        const fromUrl = searchParams.get('subject');

        setSelectedSubjects(
          fromUrl && subjectNames.includes(fromUrl) ? [fromUrl] : subjectNames
        );
        setSelectedClasses(classLabels);
      } catch {
        setError(t('score_analytics.load_failed'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [searchParams, t]);

  const totalSessions = useMemo(
    () => bySubject.reduce((sum, s) => sum + s.total_students, 0),
    [bySubject]
  );

  const subjectChart = useMemo(
    () => buildChartPayload(bySubject, selectedSubjects, chartMode),
    [bySubject, selectedSubjects, chartMode]
  );
  const classChart = useMemo(
    () => buildChartPayload(byClass, selectedClasses, chartMode),
    [byClass, selectedClasses, chartMode]
  );

  const subjectOptions = useMemo(
    () => bySubject.map((s) => s.subject_name).sort(),
    [bySubject]
  );
  const classOptions = useMemo(
    () => byClass.map((c) => c.class_label).sort(),
    [byClass]
  );

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
        <Alert color="red" variant="light">{error}</Alert>
      </Box>
    );
  }

  const hasData = totalSessions > 0;

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        <PageHeader
          title={t('score_analytics.title')}
          subtitle={t('score_analytics.subtitle')}
          accent="teal"
        />

        {hasData && (
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <Paper withBorder p="sm" radius="md">
              <Text size="xs" c="dimmed">{t('score_analytics.students_total', { count: totalSessions })}</Text>
              <Text fw={700} size="xl">{totalSessions}</Text>
            </Paper>
            <Paper withBorder p="sm" radius="md">
              <Text size="xs" c="dimmed">{t('score_analytics.by_subject')}</Text>
              <Text fw={700} size="xl">{bySubject.length}</Text>
            </Paper>
            <Paper withBorder p="sm" radius="md">
              <Text size="xs" c="dimmed">{t('score_analytics.by_class')}</Text>
              <Text fw={700} size="xl">{byClass.length}</Text>
            </Paper>
          </SimpleGrid>
        )}

        <Group grow align="end">
          <InputMultiSelect
            label={t('score_analytics.filter_subject')}
            placeholder={t('score_analytics.select_subject')}
            value={selectedSubjects}
            onChange={setSelectedSubjects}
            data={subjectOptions}
            maxVisiblePills={2}
            clearAllLabel={t('score_analytics.hide_all')}
          />
          <InputMultiSelect
            label={t('score_analytics.filter_class')}
            placeholder={t('score_analytics.select_class')}
            value={selectedClasses}
            onChange={setSelectedClasses}
            data={classOptions}
            maxVisiblePills={2}
            clearAllLabel={t('score_analytics.hide_all')}
          />
          <Box>
            <Text size="sm" fw={500} mb={6}>{t('score_analytics.chart_mode')}</Text>
            <SegmentedControl
              fullWidth
              value={chartMode}
              onChange={(v) => setChartMode(v as 'count' | 'percent')}
              data={[
                { value: 'count', label: t('score_analytics.students_count') },
                { value: 'percent', label: t('score_analytics.distribution_percent') },
              ]}
            />
          </Box>
        </Group>

        {!hasData ? (
          <EmptyState
            icon={<Text style={{ fontSize: 36 }}>📊</Text>}
            title={t('score_analytics.empty_title')}
            description={t('score_analytics.empty_desc')}
          />
        ) : (
          <Stack gap="lg">
            <Paper withBorder radius="md" p="md">
              <Group justify="space-between" mb="sm">
                <Text fw={600}>{t('score_analytics.by_subject')}</Text>
                {selectedSubjects.length > 0 && (
                  <Badge variant="light" color="teal">
                    {selectedSubjects.length} {t('score_analytics.filter_subject').toLowerCase()}
                  </Badge>
                )}
              </Group>
              {subjectChart.data.length === 0 || subjectChart.series.length === 0 ? (
                <Text size="sm" c="dimmed">{t('score_analytics.filter_no_match')}</Text>
              ) : (
                <BarChart
                  h={360}
                  data={subjectChart.data}
                  dataKey="bucket"
                  series={subjectChart.series}
                  tickLine="xy"
                  gridAxis="xy"
                  withLegend
                  legendProps={{ verticalAlign: 'bottom' }}
                  xAxisLabel={t('score_analytics.score_bucket')}
                  yAxisLabel={
                    chartMode === 'count'
                      ? t('score_analytics.students_count')
                      : t('score_analytics.distribution_percent')
                  }
                />
              )}
            </Paper>

            <Paper withBorder radius="md" p="md">
              <Group justify="space-between" mb="sm">
                <Text fw={600}>{t('score_analytics.by_class')}</Text>
                {selectedClasses.length > 0 && (
                  <Badge variant="light" color="blue">
                    {selectedClasses.length} {t('score_analytics.filter_class').toLowerCase()}
                  </Badge>
                )}
              </Group>
              {classChart.data.length === 0 || classChart.series.length === 0 ? (
                <Text size="sm" c="dimmed">{t('score_analytics.filter_no_match')}</Text>
              ) : (
                <BarChart
                  h={360}
                  data={classChart.data}
                  dataKey="bucket"
                  series={classChart.series}
                  tickLine="xy"
                  gridAxis="xy"
                  withLegend
                  legendProps={{ verticalAlign: 'bottom' }}
                  xAxisLabel={t('score_analytics.score_bucket')}
                  yAxisLabel={
                    chartMode === 'count'
                      ? t('score_analytics.students_count')
                      : t('score_analytics.distribution_percent')
                  }
                />
              )}
            </Paper>
          </Stack>
        )}
      </Stack>
    </Box>
  );
};

export default ScoreAnalytics;
