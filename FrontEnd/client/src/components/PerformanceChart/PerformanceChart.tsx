import { Paper, Group, Text, Stack, Select, Box } from '@mantine/core';
import { BarChart } from '@mantine/charts';

const data = [
  { month: 'May', value: 65 },
  { month: 'Jun', value: 72 },
  { month: 'Jul', value: 60 },
  { month: 'Aug', value: 85 },
  { month: 'Sep', value: 78 },
  { month: 'Oct', value: 82 },
];

export default function PerformanceChart() {
  return (
    <Paper radius="xl" withBorder p="lg">
      {/* Header */}
      <Group justify="space-between" mb="md">
        <Stack gap={2}>
          <Text fw={700} size="lg">
            Performance Overview
          </Text>
          <Text size="sm" c="dimmed">
            Average scores over the last 6 months
          </Text>
        </Stack>

        <Select
          size="xs"
          data={['Last 6 Months', 'Last Year']}
          defaultValue="Last 6 Months"
          className="w-40"
        />
      </Group>

      {/* Chart */}
      <Box h={260}>
        <BarChart
          h={260}
          data={data}
          dataKey="month"
          series={[
            { name: 'value', color: 'blue.6' },
          ]}
          gridAxis="y"
          withTooltip
          withLegend={false}
          tickLine="y"
          valueFormatter={(v) => `${v}%`}
        />
      </Box>
    </Paper>
  );
}
