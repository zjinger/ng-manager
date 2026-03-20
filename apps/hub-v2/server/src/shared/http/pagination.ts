export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export function normalizePage(page?: number, pageSize?: number) {
  const normalizedPage = Number.isFinite(page) && page && page > 0 ? Math.floor(page) : 1;
  const normalizedPageSize =
    Number.isFinite(pageSize) && pageSize && pageSize > 0 ? Math.min(Math.floor(pageSize), 100) : 20;

  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
    offset: (normalizedPage - 1) * normalizedPageSize
  };
}
