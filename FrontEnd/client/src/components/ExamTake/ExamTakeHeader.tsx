import { Avatar, Button, Group, Text } from '@mantine/core';
import { IconCheck, IconClock, IconSchool } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import classes from './ExamTake.module.scss';

type Props = {
  title: string;
  section: string;
  remainingLabel: string;
  onSubmit: () => void;
  submitting?: boolean;
};

export function ExamTakeHeader({ title, section, remainingLabel, onSubmit, submitting = false }: Props) {
  const { t } = useTranslation();

  return (
    <header className={classes.header}>
      <Group gap="sm" wrap="nowrap" align="flex-start" style={{ flex: 1, minWidth: 0 }}>
        <div className={classes.titleBlock}>
          <IconSchool size={28} color="var(--mantine-color-primary-6)" style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div className={classes.title}>{title}</div>
            <div className={classes.subtitle}>{section}</div>
          </div>
        </div>
      </Group>

      <Group gap="md" wrap="wrap" justify="flex-end">
        <div className={classes.timerPill}>
          <IconClock size={18} />
          <Text span fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {remainingLabel}
          </Text>
          <Text span size="xs" c="dimmed" tt="uppercase" fw={600}>
            {t('exam_header.remaining')}
          </Text>
        </div>
        <Group gap="sm" wrap="nowrap">
          <Button
            leftSection={<IconCheck size={18} />}
            radius="md"
            size="md"
            onClick={onSubmit}
            loading={submitting}
            disabled={submitting}
          >
            {t('exam_header.submit')}
          </Button>
          <Avatar radius="xl" size="md" color="primary">
            HV
          </Avatar>
        </Group>
      </Group>
    </header>
  );
}
