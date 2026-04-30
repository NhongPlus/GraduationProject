import { Paper, Group, Text, Stack, Box } from '@mantine/core';
import { LineChart } from '@mantine/charts';
import { useTranslation } from 'react-i18next';
import ButtonTransparent from '@/components/Button/ButtonTransparent/ButtonTransparent';
import type { PerformancePointDto } from '@/services/dashboardApi';

type PerformanceChartProps = {
  data: PerformancePointDto[];
};

export default function PerformanceChart({ data }: PerformanceChartProps) {
  const { t } = useTranslation();

  const hasClassAvg = data.some((row) => row.class_avg != null && Number.isFinite(row.class_avg));

  const chartData = hasClassAvg
    ? data.map((row) => ({
        subject: row.label,
        score: row.score,
        classAvg:
          row.class_avg != null && Number.isFinite(row.class_avg) ? row.class_avg : row.score,
      }))
    : data.map((row) => ({
        subject: row.label,
        score: row.score,
      }));

  return (
    <Paper radius="xl" withBorder p="lg">
      <Group justify="space-between" mb="md">
        <Stack gap={2}>
          <Text fw={700} size="lg">
            {t('performance.title')}
          </Text>
          <Text size="sm" c="dimmed">
            {t('performance.subtitle')}
          </Text>
        </Stack>

        <ButtonTransparent size="sm" label={t('common.details')} disabled={false} />
      </Group>

      {chartData.length === 0 ? (
        <Text size="sm" c="dimmed" py="xl">
          {t('dashboard.chart_empty')}
        </Text>
      ) : (
        <Box h={240}>
          <LineChart
            h={240}
            data={chartData}
            dataKey="subject"
            series={
              hasClassAvg
                ? [
                    { name: 'score', color: 'teal.6', label: t('performance.score') },
                    { name: 'classAvg', color: 'gray.5', label: t('performance.class_avg') },
                  ]
                : [{ name: 'score', color: 'teal.6', label: t('performance.score') }]
            }
            type="gradient"
            gradientStops={[
              { offset: 0, color: 'teal.6' },
              { offset: 100, color: 'teal.0' },
            ]}
            curveType="monotone"
            withLegend
            withTooltip
            withDots
            strokeWidth={2.5}
            gridAxis="y"
            tickLine="y"
            yAxisProps={{ domain: [0, 100] }}
            lineProps={(series) =>
              hasClassAvg && series.name === 'classAvg' ? { strokeDasharray: '6 4' } : {}
            }
            valueFormatter={(value) => (typeof value === 'number' ? value.toFixed(1) : String(value))}
          />
        </Box>
      )}
    </Paper>
  );
}
