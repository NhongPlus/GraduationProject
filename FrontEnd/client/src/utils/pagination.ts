export const DEFAULT_PAGE_SIZE = 20;

export type PaginationMeta = {
  total: number;
  limit: number;
  offset: number;
  page: number;
  total_pages: number;
};

export function pageToOffset(page: number, limit = DEFAULT_PAGE_SIZE): number {
  return Math.max(0, (Math.max(1, page) - 1) * limit);
}

export function calcTotalPages(total: number, limit = DEFAULT_PAGE_SIZE): number {
  if (total <= 0) return 1;
  return Math.ceil(total / limit);
}

export function buildPaginationMeta(
  total: number,
  limit: number,
  offset: number
): PaginationMeta {
  const safeLimit = Math.max(1, limit);
  const page = Math.floor(offset / safeLimit) + 1;
  return {
    total,
    limit: safeLimit,
    offset,
    page,
    total_pages: calcTotalPages(total, safeLimit),
  };
}

/** Hiển thị "21–40 / 156" — from/to là 1-based inclusive */
export function pageItemRange(
  page: number,
  limit: number,
  total: number
): { from: number; to: number; total: number } {
  if (total <= 0) return { from: 0, to: 0, total: 0 };
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * limit + 1;
  const to = Math.min(safePage * limit, total);
  return { from, to, total };
}

export function clampPage(page: number, total: number, limit = DEFAULT_PAGE_SIZE): number {
  return Math.min(Math.max(1, page), calcTotalPages(total, limit));
}

/** Phân trang client-side (slice mảng đã load) */
export function slicePage<T>(items: T[], page: number, limit = DEFAULT_PAGE_SIZE): T[] {
  const start = pageToOffset(page, limit);
  return items.slice(start, start + limit);
}
