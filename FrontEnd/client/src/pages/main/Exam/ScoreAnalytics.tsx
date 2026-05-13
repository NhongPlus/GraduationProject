import { useEffect, useMemo, useState } from 'react';
import {
  Box, Text, Loader, Paper, Group, Stack, Alert, SegmentedControl,
} from '@mantine/core';
import '@mantine/core/styles.css';
// ‼️ import dates styles after core package styles
import '@mantine/dates/styles.css';
import { LineChart } from '@mantine/charts';
import { DatePickerInput } from '@mantine/dates';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import classApi from '@/services/classApi';
import examApi from '@/services/examApi';
import subjectApi from '@/services/subjectApi';
import EmptyState from '@/components/EmptyState/EmptyState';
import PageHeader from '@/components/PageHeader/PageHeader';
import InputMultiSelect from '@/components/Input/InputMultiSelect/InputMultiSelect';

type SessionStat = {
  exam_id: string;
  exam_title: string;
  class_id: string;
  subject_name: string;
  class_label: string;
  submitted_at: string;
  score_pct: number;
};

type SubjectOption = { id: string; name: string };
type ClassOption = { id: string; label: string };

const BUCKETS = ['0-20%', '20-40%', '40-60%', '60-80%', '80-100%'] as const;
const PALETTE = ['blue.6', 'teal.6', 'grape.6', 'orange.6', 'pink.6', 'cyan.6', 'lime.6', 'red.6'];
const TOOLTIP_MAX_ITEMS = 10;

const ScoreAnalytics = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rawStats, setRawStats] = useState<SessionStat[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [chartMode, setChartMode] = useState<'count' | 'percent'>('count');
  const [visibleSubjects, setVisibleSubjects] = useState<string[]>([]);
  const [visibleClasses, setVisibleClasses] = useState<string[]>([]);
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [subjects, classes] = await Promise.all([
          subjectApi.getSubjects(),
          classApi.getClasses(),
        ]);
        setSubjectOptions(subjects.map((s) => ({ id: s.id, name: s.name })));
        const classesMapped = classes.map((c) => ({
          id: c.id,
          label: `${c.subject_name} - ${c.semester} ${c.year} - ${c.id.slice(0, 6)}`,
        }));
        setClassOptions(classesMapped);
        const classLabelById = new Map(classesMapped.map((c) => [c.id, c.label]));

        const exams = await examApi.getExams();
        const sessionsByExam = await Promise.allSettled(exams.map((exam) => examApi.getExamSessions(exam.id)));
        const rows: SessionStat[] = [];

        sessionsByExam.forEach((result, index) => {
          if (result.status !== 'fulfilled') return;
          const exam = exams[index];
          const classLabel = classLabelById.get(exam.class_id)
            || [
              exam.subject_name || '',
              exam.class_semester || '',
              exam.class_year ? String(exam.class_year) : '',
            ].filter(Boolean).join(' - ');

          result.value.forEach((session) => {
            if (session.status !== 'submitted') return;
            if (session.score == null || !session.max_points || session.max_points <= 0) return;
            const submittedAt = session.submitted_at || session.finished_at;
            if (!submittedAt) return;
            rows.push({
              exam_id: exam.id,
              exam_title: exam.title,
              class_id: exam.class_id,
              subject_name: exam.subject_name || t('common.subject'),
              class_label: classLabel,
              submitted_at: submittedAt,
              score_pct: (session.score / session.max_points) * 100,
            });
          });
        });

        setRawStats(rows);
      } catch {
        setError(t('score_analytics.load_failed'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [t]);

  const allSubjects = useMemo(
    () => subjectOptions.map((s) => s.name).sort(),
    [subjectOptions]
  );
  const allClasses = useMemo(
    () => classOptions.map((c) => c.label).sort(),
    [classOptions]
  );

  useEffect(() => {
    if (filtersInitialized) return;
    if (!allSubjects.length || !allClasses.length) return;

    const subjectFromUrl = searchParams.get('subject');
    if (subjectFromUrl) {
      setSelectedSubjects([subjectFromUrl]);
      setVisibleSubjects([subjectFromUrl]);
    } else {
      setSelectedSubjects(allSubjects);
      setVisibleSubjects(allSubjects);
    }

    setSelectedClasses(allClasses);
    setVisibleClasses(allClasses);
    setFiltersInitialized(true);
  }, [allSubjects, allClasses, searchParams, filtersInitialized]);

  const filteredStats = useMemo(() => {
    const [from, to] = dateRange;
    const fromMs = from ? new Date(from).setHours(0, 0, 0, 0) : null;
    const toMs = to ? new Date(to).setHours(23, 59, 59, 999) : null;

    return rawStats.filter((row) => {
      if (selectedSubjects.length && !selectedSubjects.includes(row.subject_name)) return false;
      if (selectedClasses.length && !selectedClasses.includes(row.class_label)) return false;
      const submittedMs = new Date(row.submitted_at).getTime();
      if (fromMs != null && submittedMs < fromMs) return false;
      if (toMs != null && submittedMs > toMs) return false;
      return true;
    });
  }, [rawStats, selectedSubjects, selectedClasses, dateRange]);

  const buildDistribution = (
    rows: SessionStat[],
    key: 'subject_name' | 'class_label',
    entities: string[],
    visibleEntities: string[]
  ) => {
    const source = BUCKETS.map((bucket) => ({ bucket }));
    const entityToScores = new Map<string, number[]>();
    rows.forEach((row) => {
      const entity = row[key];
      if (!entities.includes(entity)) return;
      if (!entityToScores.has(entity)) entityToScores.set(entity, []);
      entityToScores.get(entity)!.push(row.score_pct);
    });

    entities.forEach((entity) => {
      const scores = entityToScores.get(entity) || [];
      const counts = BUCKETS.map((bucket) => {
        const [start, end] = bucket.replace('%', '').split('-').map(Number);
        return scores.filter((s) => (bucket === '80-100%' ? s >= start && s <= end : s >= start && s < end)).length;
      });
      source.forEach((item, idx) => {
        const value = chartMode === 'count'
          ? counts[idx]
          : (scores.length ? Number(((counts[idx] / scores.length) * 100).toFixed(2)) : 0);
        (item as Record<string, number | string | null>)[entity] = visibleEntities.includes(entity)
          ? value
          : null;
      });
    });

    return source;
  };

  const subjectSeries = useMemo(
    () => selectedSubjects.map((name, idx) => ({
      name,
      color: visibleSubjects.includes(name) ? PALETTE[idx % PALETTE.length] : 'gray.5',
    })),
    [selectedSubjects, visibleSubjects]
  );
  const classSeries = useMemo(
    () => selectedClasses.map((name, idx) => ({
      name,
      color: visibleClasses.includes(name) ? PALETTE[idx % PALETTE.length] : 'gray.5',
    })),
    [selectedClasses, visibleClasses]
  );
  const subjectData = useMemo(
    () => buildDistribution(filteredStats, 'subject_name', selectedSubjects, visibleSubjects),
    [filteredStats, selectedSubjects, visibleSubjects, chartMode]
  );
  const classData = useMemo(
    () => buildDistribution(filteredStats, 'class_label', selectedClasses, visibleClasses),
    [filteredStats, selectedClasses, visibleClasses, chartMode]
  );

  const renderTooltip = (label: unknown, payload: Array<Record<string, unknown>> | undefined) => {
    if (!payload || payload.length === 0) return null;
    const normalized = payload
      .filter((item) => item.value !== null && item.value !== undefined)
      .slice(0, TOOLTIP_MAX_ITEMS);
    if (!normalized.length) return null;

    const restCount = Math.max(0, payload.length - normalized.length);
    return (
      <Paper withBorder shadow="sm" p="xs">
        <Text fw={600} size="sm" mb={4}>{String(label)}</Text>
        {normalized.map((item) => (
          <Group key={String(item.name)} justify="space-between" gap="xs" wrap="nowrap">
            <Text size="xs" c={String(item.color || 'dark')}>
              {String(item.name)}
            </Text>
            <Text size="xs" fw={500}>{String(item.value)}</Text>
          </Group>
        ))}
        {restCount > 0 && (
          <Text size="xs" c="dimmed" mt={4}>
            +{restCount} {t('score_analytics.tooltip_more')}
          </Text>
        )}
      </Paper>
    );
  };

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

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        <PageHeader
          title={t('score_analytics.title')}
          subtitle={t('score_analytics.subtitle')}
          accent="teal"
        />

        <Group grow align="end">
          <InputMultiSelect
            label={t('score_analytics.filter_subject')}
            placeholder={t('score_analytics.select_subject')}
            value={selectedSubjects}
            onChange={(next) => {
              setSelectedSubjects(next);
              setVisibleSubjects((prev) => prev.filter((x) => next.includes(x)));
            }}
            data={allSubjects}
            maxVisiblePills={1}
            clearAllLabel={t('score_analytics.hide_all')}
          />
          <InputMultiSelect
            label={t('score_analytics.filter_class')}
            placeholder={t('score_analytics.select_class')}
            value={selectedClasses}
            onChange={(next) => {
              setSelectedClasses(next);
              setVisibleClasses((prev) => prev.filter((x) => next.includes(x)));
            }}
            data={allClasses}
            maxVisiblePills={1}
            clearAllLabel={t('score_analytics.hide_all')}
          />
          <Box>
            <Text size="sm" fw={500} mb={6}>{t('score_analytics.chart_mode')}</Text>
            <SegmentedControl
              fullWidth
              value={chartMode}
              onChange={(value) => setChartMode(value as 'count' | 'percent')}
              data={[
                { value: 'count', label: t('score_analytics.students_count') },
                { value: 'percent', label: t('score_analytics.distribution_percent') },
              ]}
            />
          </Box>
        </Group>
        <DatePickerInput
          type="range"
          numberOfColumns={2}
          clearable
          label={t('score_analytics.filter_time')}
          placeholder={t('score_analytics.filter_time_placeholder')}
          value={dateRange}
          onChange={(value) => setDateRange(value as [Date | null, Date | null])}
        />

        {filteredStats.length === 0 ? (
          <EmptyState
            icon={<Text style={{ fontSize: 36 }}>📊</Text>}
            title={t('score_analytics.empty_title') || 'Chưa có dữ liệu thống kê'}
            description={t('score_analytics.empty_desc') || 'Chưa có dữ liệu điểm thi. Hãy hoàn thành một số bài thi trước.'}
          />
        ) : (
          <Stack gap="lg">
            <Paper withBorder radius="md" p="md">
              <Text fw={600} mb="xs">{t('score_analytics.by_subject')}</Text>
              <LineChart
                h={420}
                style={{ width: '100%', minWidth: 0 }}
                data={subjectData}
                dataKey="bucket"
                withLegend
                legendProps={{
                  verticalAlign: 'bottom',
                  height: 110,
                  wrapperStyle: {
                    maxHeight: 110,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    paddingTop: 8,
                  },
                  onClick: (payload: any) => {
                    const name = (payload?.value || payload?.dataKey) as string | undefined;
                    if (!name) return;
                    setVisibleSubjects((prev) => (prev.includes(name)
                      ? prev.filter((x) => x !== name)
                      : [...prev, name]));
                  },
                  formatter: (value: string) => (
                    <span
                      style={{
                        opacity: visibleSubjects.includes(value) ? 1 : 0.45,
                        textDecoration: visibleSubjects.includes(value) ? 'none' : 'line-through',
                      }}
                    >
                      {value}
                    </span>
                  ),
                }}
                curveType="linear"
                tickLine="xy"
                gridAxis="xy"
                xAxisLabel={t('score_analytics.score_bucket')}
                yAxisLabel={chartMode === 'count' ? t('score_analytics.students_count') : t('score_analytics.distribution_percent')}
                series={subjectSeries}
                tooltipProps={{
                  content: ({ label, payload }) => renderTooltip(label, payload as Array<Record<string, unknown>>),
                }}
              />
            </Paper>

            <Paper withBorder radius="md" p="md">
              <Text fw={600} mb="xs">{t('score_analytics.by_class')}</Text>
              <LineChart
                h={420}
                style={{ width: '100%', minWidth: 0 }}
                data={classData}
                dataKey="bucket"
                withLegend
                legendProps={{
                  verticalAlign: 'bottom',
                  height: 110,
                  wrapperStyle: {
                    maxHeight: 110,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    paddingTop: 8,
                  },
                  onClick: (payload: any) => {
                    const name = (payload?.value || payload?.dataKey) as string | undefined;
                    if (!name) return;
                    setVisibleClasses((prev) => (prev.includes(name)
                      ? prev.filter((x) => x !== name)
                      : [...prev, name]));
                  },
                  formatter: (value: string) => (
                    <span
                      style={{
                        opacity: visibleClasses.includes(value) ? 1 : 0.45,
                        textDecoration: visibleClasses.includes(value) ? 'none' : 'line-through',
                      }}
                    >
                      {value}
                    </span>
                  ),
                }}
                curveType="linear"
                tickLine="xy"
                gridAxis="xy"
                xAxisLabel={t('score_analytics.score_bucket')}
                yAxisLabel={chartMode === 'count' ? t('score_analytics.students_count') : t('score_analytics.distribution_percent')}
                series={classSeries}
                tooltipProps={{
                  content: ({ label, payload }) => renderTooltip(label, payload as Array<Record<string, unknown>>),
                }}
              />
            </Paper>
          </Stack>
        )}
      </Stack>
    </Box>
  );
};

export default ScoreAnalytics;
