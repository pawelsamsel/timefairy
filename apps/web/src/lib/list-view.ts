export const LIST_PAGE_SIZES = [10, 25, 50] as const;
export type ListPageSize = (typeof LIST_PAGE_SIZES)[number];

export function normalizeListSearch(query: string) {
  return query.trim().toLowerCase();
}

export function matchesListSearch(
  query: string,
  ...fields: (string | null | undefined)[]
) {
  if (!query) return true;
  return fields.some((field) => (field ?? "").toLowerCase().includes(query));
}

export function paginateList<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    totalPages,
    page: safePage,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(safePage * pageSize, total),
  };
}
