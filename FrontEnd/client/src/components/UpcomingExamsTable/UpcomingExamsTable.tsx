import { Paper, Group, Text, Badge, Stack, Box } from '@mantine/core';
import { IconCalendarEvent, IconClock, IconFileText } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import ButtonTransparent from '@/components/Button/ButtonTransparent/ButtonTransparent';
import type { StudentUpcomingExamDto } from '@/services/dashboardApi';
import styles from './UpcomingExamsTable.module.scss';

const badgeColors: Record<StudentUpcomingExamDto['badge'], string> = {
  soon: 'yellow',
  normal: 'gray',
  active: 'green',
};

type UpcomingExamsTableProps = {
  exams: StudentUpcomingExamDto[];
};

export default function UpcomingExamsTable({ exams }: UpcomingExamsTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Paper radius="xl" withBorder p="md" className={styles.wrapper}>
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconCalendarEvent size={20} color="#0D9488" />
          <Text fw={700} size="lg">
            {t('upcoming.title')}
          </Text>
        </Group>

        <ButtonTransparent
          size="sm"
          label={t('common.view_all')}
          disabled={false}
          onClick={() => navigate('/exams')}
        />
      </Group>

      {exams.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t('dashboard.upcoming_empty')}
        </Text>
      ) : (
        <Stack gap="sm">
          {exams.map((exam) => (
            <Box key={exam.exam_id} className={styles.card}>
              <Group justify="space-between" align="flex-start" mb={6}>
                <Text fw={600} size="sm" className={styles.subject}>
                  {exam.subject}
                </Text>
                <Badge color={badgeColors[exam.badge]} variant="light" size="sm">
                  {exam.badge === 'soon'
                    ? t('upcoming.badge_soon')
                    : exam.badge === 'active'
                      ? t('upcoming.badge_active')
                      : t('upcoming.badge_normal')}
                </Badge>
              </Group>

              <Group className={styles.meta} gap="md">
                <Group gap={6} className={styles.metaItem}>
                  <IconCalendarEvent size={14} className={styles.metaIcon} />
                  <Text size="xs" c="dimmed">
                    {exam.date_label}
                    {exam.time_label ? `, ${exam.time_label}` : ''}
                  </Text>
                </Group>
                <Group gap={6} className={styles.metaItem}>
                  <IconClock size={14} className={styles.metaIcon} />
                  <Text size="xs" c="dimmed">
                    {t('upcoming.duration_minutes', { count: exam.duration_min })}
                  </Text>
                </Group>
                <Group gap={6} className={styles.metaItem}>
                  <IconFileText size={14} className={styles.metaIcon} />
                  <Text size="xs" c="dimmed">
                    {t('upcoming.questions_count', { count: exam.questions })}
                  </Text>
                </Group>
              </Group>

              <Group justify="space-between" mt="sm">
                <Text size="xs" className={styles.countdown}>
                  {exam.countdown_days != null
                    ? t('upcoming.countdown_days', { count: exam.countdown_days })
                    : t('upcoming.countdown_unknown')}
                </Text>
                <ButtonFilled
                  size="xs"
                  color={exam.can_start ? 'teal' : 'gray'}
                  label={exam.can_start ? t('upcoming.start_exam') : t('upcoming.not_open')}
                  disabled={!exam.can_start}
                  onClick={() => exam.can_start && navigate(`/exam/${exam.exam_id}`)}
                />
              </Group>
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
