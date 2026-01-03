import { SimpleGrid } from '@mantine/core';
import {
  IconTrendingUp,
  IconChecklist,
  IconClock,
} from '@tabler/icons-react';
import StatCard from '../StatCard/StatCard';
import { Paper, Stack, Text } from '@mantine/core';

export default function StatsSection() {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
      <StatCard
        title="Average Score"
        value="85%"
        subValue="+5%"
        progress={85}
        icon={<IconTrendingUp size={18} />}
        color="green"
      />

      <StatCard
        title="Exams Taken"
        value="12"
        subValue="Total"
        progress={60}
        icon={<IconChecklist size={18} />}
        color="blue"
      />

      <StatCard
        title="Study Hours"
        value="42h"
        subValue="+12%"
        progress={75}
        icon={<IconClock size={18} />}
        color="violet"
      />

      {/* Special card */}
      <Paper
        radius="xl"
        p="md"
        className="bg-blue-600 text-white"
      >
        <Stack gap="sm">
          <Text size="sm" fw={500} className="opacity-80">
            Next Exam In
          </Text>

          <Text size="xl" fw={700}>
            2d 4h
          </Text>

          <Text size="sm" className="opacity-80">
            Physics 101 Midterm
          </Text>
        </Stack>
      </Paper>
    </SimpleGrid>
  );
}
