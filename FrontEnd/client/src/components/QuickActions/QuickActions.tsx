import {
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Box,
} from '@mantine/core';
import {
  IconDownload,
  IconPencil,
  IconMessageCircle,
  IconSettings,
} from '@tabler/icons-react';

type ActionItemProps = {
  label: string;
  icon: React.ReactNode;
};

function ActionItem({ label, icon }: ActionItemProps) {
  return (
    <Paper
      radius="lg"
      p="md"
      className="bg-slate-50 hover:bg-blue-50 transition-colors cursor-pointer"
    >
      <Stack align="center" gap="xs">
        <Box className="text-slate-500 group-hover:text-blue-600">
          {icon}
        </Box>
        <Text size="xs" fw={600} ta="center">
          {label}
        </Text>
      </Stack>
    </Paper>
  );
}

export default function QuickActions() {
  return (
    <Paper radius="xl" withBorder p="md">
      <Text fw={700} size="lg" mb="md">
        Quick Actions
      </Text>

      <SimpleGrid cols={2} spacing="sm">
        <ActionItem
          label="Syllabus"
          icon={<IconDownload size={28} />}
        />
        <ActionItem
          label="Practice"
          icon={<IconPencil size={28} />}
        />
        <ActionItem
          label="Support"
          icon={<IconMessageCircle size={28} />}
        />
        <ActionItem
          label="Settings"
          icon={<IconSettings size={28} />}
        />
      </SimpleGrid>
    </Paper>
  );
}
