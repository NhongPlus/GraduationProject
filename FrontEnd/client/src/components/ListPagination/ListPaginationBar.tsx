import { Group, Pagination, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { calcTotalPages, pageItemRange } from '@/utils/pagination';

type Props = {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  /** Luôn hiện summary dù chỉ 1 trang */
  alwaysShowSummary?: boolean;
  size?: 'xs' | 'sm' | 'md';
};

export default function ListPaginationBar({
  page,
  total,
  limit,
  onPageChange,
  alwaysShowSummary = true,
  size = 'sm',
}: Props) {
  const { t } = useTranslation();
  const totalPages = calcTotalPages(total, limit);
  const range = pageItemRange(page, limit, total);

  if (total <= 0 && !alwaysShowSummary) return null;

  return (
    <Group justify="space-between" wrap="wrap" gap="xs">
      <Text size={size} c="dimmed">
        {total > 0
          ? t('pagination.showing_range', { from: range.from, to: range.to, total: range.total })
          : t('pagination.empty')}
      </Text>
      {totalPages > 1 && (
        <Pagination total={totalPages} value={page} onChange={onPageChange} size={size} />
      )}
    </Group>
  );
}
