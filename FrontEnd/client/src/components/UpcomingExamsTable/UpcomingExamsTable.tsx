import {
  Paper,
  Table,
  Group,
  Text,
  Button,
  Badge,
  Box,
  Stack,
} from '@mantine/core';
import {
  IconCalendarEvent,
  IconPlayerPlay,
} from '@tabler/icons-react';

export default function UpcomingExamsTable() {
  return (
    <Paper radius="xl" withBorder>
      {/* Header */}
      <Group justify="space-between" p="lg">
        <Group gap="xs">
          <IconCalendarEvent size={20} />
          <Text fw={700} size="lg">
            Upcoming Exams
          </Text>
        </Group>

        <Button variant="subtle" size="sm">
          See All
        </Button>
      </Group>

      {/* Table */}
      <Table
        horizontalSpacing="lg"
        verticalSpacing="md"
        highlightOnHover
      >
        <Table.Thead className="bg-slate-50">
          <Table.Tr>
            <Table.Th>Subject</Table.Th>
            <Table.Th>Exam Name</Table.Th>
            <Table.Th>Date & Time</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Action</Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {/* Row 1 */}
          <Table.Tr>
            <Table.Td>
              <Group gap="sm">
                <Box
                  w={32}
                  h={32}
                  className="rounded-full bg-blue-100 flex items-center justify-center"
                >
                  <Text size="sm">🧪</Text>
                </Box>
                <Text fw={600}>Physics</Text>
              </Group>
            </Table.Td>

            <Table.Td>
              <Text size="sm">Physics 101 Midterm</Text>
            </Table.Td>

            <Table.Td>
              <Stack gap={2}>
                <Text size="sm" fw={500}>
                  Oct 24, 2023
                </Text>
                <Text size="xs" c="dimmed">
                  10:00 AM
                </Text>
              </Stack>
            </Table.Td>

            <Table.Td>
              <Badge color="yellow" variant="light">
                Scheduled
              </Badge>
            </Table.Td>

            <Table.Td>
              <Button
                size="xs"
                leftSection={<IconPlayerPlay size={14} />}
              >
                Start Exam
              </Button>
            </Table.Td>
          </Table.Tr>

          {/* Row 2 */}
          <Table.Tr>
            <Table.Td>
              <Group gap="sm">
                <Box
                  w={32}
                  h={32}
                  className="rounded-full bg-orange-100 flex items-center justify-center"
                >
                  <Text size="sm">📜</Text>
                </Box>
                <Text fw={600}>History</Text>
              </Group>
            </Table.Td>

            <Table.Td>
              <Text size="sm">World History Final</Text>
            </Table.Td>

            <Table.Td>
              <Stack gap={2}>
                <Text size="sm" fw={500}>
                  Oct 28, 2023
                </Text>
                <Text size="xs" c="dimmed">
                  02:00 PM
                </Text>
              </Stack>
            </Table.Td>

            <Table.Td>
              <Badge variant="light" color="gray">
                Upcoming
              </Badge>
            </Table.Td>

            <Table.Td>
              <Button size="xs" variant="outline">
                View Details
              </Button>
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </Paper>
  );
}
