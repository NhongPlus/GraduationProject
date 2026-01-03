import { Paper, Group, Text, Progress, Stack } from '@mantine/core';
import type { ReactNode } from 'react';

type StatCardProps = {
  title: string;
  value: string;
  subValue?: string;
  progress?: number;
  icon: ReactNode;
  color?: string;
};

export default function StatCard({
  title,
  value,
  subValue,
  progress,
  icon,
  color = 'blue',
}: StatCardProps) {
  return (
    <Paper radius="xl" withBorder p="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Text size="sm" c="dimmed" fw={500}>
            {title}
          </Text>

          <Paper
            p={6}
            radius="md"
            className={`bg-${color}-100`}
          >
            {icon}
          </Paper>
        </Group>

        <Group align="flex-end" gap="xs">
          <Text size="xl" fw={700}>
            {value}
          </Text>

          {subValue && (
            <Text size="sm" fw={600} c="green">
              {subValue}
            </Text>
          )}
        </Group>

        {typeof progress === 'number' && (
          <Progress value={progress} radius="xl" />
        )}
      </Stack>
    </Paper>
  );
}
