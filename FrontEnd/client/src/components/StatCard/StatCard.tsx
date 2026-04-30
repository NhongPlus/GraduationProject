import { Box, Group, Paper, Text } from '@mantine/core';
import { IconArrowDownRight, IconArrowUpRight } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import styles from './StatCard.module.scss';

type StatCardProps = {
  title: string;
  value: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'flat';
  icon: ReactNode;
  accent?: 'teal' | 'green' | 'cyan' | 'amber';
};

const accentMap: Record<string, { bg: string; fg: string }> = {
  teal: { bg: '#F0FDFA', fg: '#0D9488' },
  green: { bg: '#DCFCE7', fg: '#16A34A' },
  cyan: { bg: '#CFFAFE', fg: '#0891B2' },
  amber: { bg: '#FEF3C7', fg: '#D97706' },
};

export default function StatCard({
  title,
  value,
  trend,
  trendDirection = 'up',
  icon,
  accent = 'teal',
}: StatCardProps) {
  const palette = accentMap[accent] || accentMap.teal;
  const TrendIcon = trendDirection === 'down' ? IconArrowDownRight : IconArrowUpRight;
  const trendColor =
    trendDirection === 'down' ? '#DC2626' : trendDirection === 'flat' ? '#64748B' : '#16A34A';

  return (
    <Paper radius="xl" withBorder p="md" className={styles.card}>
      <Group align="flex-start" gap="md">
        <Box className={styles.icon} style={{ backgroundColor: palette.bg, color: palette.fg }}>
          {icon}
        </Box>

        <Box className={styles.content}>
          <Text className={styles.value}>{value}</Text>
          <Text className={styles.label}>{title}</Text>

          {trend && trendDirection !== 'flat' && (
            <Group gap={4} className={styles.trend} style={{ color: trendColor }}>
              <TrendIcon size={14} />
              <span>{trend}</span>
            </Group>
          )}
          {trend && trendDirection === 'flat' && (
            <Text size="xs" c="dimmed" mt={4}>
              {trend}
            </Text>
          )}
        </Box>
      </Group>
    </Paper>
  );
}
