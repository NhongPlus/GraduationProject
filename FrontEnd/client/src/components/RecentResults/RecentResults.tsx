import {
  Paper,
  Stack,
  Group,
  Text,
  Button,
} from '@mantine/core';
import { IconCircleCheck } from '@tabler/icons-react';

type ResultItemProps = {
  title: string;
  date: string;
  score: string;
  status: 'passed' | 'average';
};

function ResultItem({ title, date, score, status }: ResultItemProps) {
  const color =
    status === 'passed' ? 'green' : 'yellow';

  return (
    <Paper
      radius="lg"
      p="sm"
      className="bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
    >
      <Group justify="space-between">
        <Stack gap={2}>
          <Text fw={600} size="sm">
            {title}
          </Text>
          <Text size="xs" c="dimmed">
            {date}
          </Text>
        </Stack>

        <Stack gap={0} align="flex-end">
          <Text fw={700} size="lg" c={color}>
            {score}
          </Text>
          <Text size="xs" c="dimmed" fw={700} tt="uppercase">
            {status}
          </Text>
        </Stack>
      </Group>
    </Paper>
  );
}

export default function RecentResults() {
  return (
    <Paper radius="xl" withBorder p="md">
      {/* Header */}
      <Group mb="md">
        <IconCircleCheck size={20} color="green" />
        <Text fw={700} size="lg">
          Recent Results
        </Text>
      </Group>

      {/* List */}
      <Stack gap="sm">
        <ResultItem
          title="Calculus Quiz 2"
          date="Oct 15, 2023"
          score="88%"
          status="passed"
        />

        <ResultItem
          title="English Lit Essay"
          date="Oct 10, 2023"
          score="92%"
          status="passed"
        />

        <ResultItem
          title="Bio Lab Report"
          date="Oct 05, 2023"
          score="74%"
          status="average"
        />
      </Stack>

      <Button
        mt="md"
        variant="subtle"
        size="sm"
        fullWidth
      >
        View All Results
      </Button>
    </Paper>
  );
}
