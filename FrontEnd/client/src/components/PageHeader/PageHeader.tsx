import { Box, Title, Text, Stack } from '@mantine/core';
import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  accent?: 'teal' | 'blue' | 'amber';
};

const accentMap = {
  teal: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)',
  blue: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
  amber: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
};

export default function PageHeader({ title, subtitle, action, accent = 'teal' }: PageHeaderProps) {
  return (
    <Box
      style={{
        background: accentMap[accent],
        borderRadius: 12,
        padding: '20px 24px',
        color: '#ffffff',
        marginBottom: 4,
      }}
    >
      <Stack gap={4} align={action ? 'space-between' : 'flex-start'} style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Box>
          <Title order={2} style={{ color: '#ffffff', fontWeight: 700 }}>
            {title}
          </Title>
          {subtitle && (
            <Text size="sm" style={{ opacity: 0.85, marginTop: 2 }}>
              {subtitle}
            </Text>
          )}
        </Box>
        {action && <Box>{action}</Box>}
      </Stack>
    </Box>
  );
}