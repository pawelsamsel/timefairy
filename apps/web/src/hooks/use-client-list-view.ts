import { useEffect, useMemo, useState } from "react";
import {
  LIST_PAGE_SIZES,
  type ListPageSize,
  normalizeListSearch,
  paginateList,
} from "@/lib/list-view";

export function useClientListView<T>(
  items: T[],
  filterFn: (item: T, normalizedQuery: string) => boolean,
  options?: { pageSize?: ListPageSize; paginate?: boolean },
) {
  const paginateEnabled = options?.paginate ?? true;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<ListPageSize>(
    options?.pageSize ?? LIST_PAGE_SIZES[1],
  );

  const filteredItems = useMemo(() => {
    const query = normalizeListSearch(search);
    if (!query) return items;
    return items.filter((item) => filterFn(item, query));
  }, [items, search, filterFn]);

  const pagination = useMemo(
    () => paginateList(filteredItems, page, pageSize),
    [filteredItems, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [search, pageSize, items.length]);

  useEffect(() => {
    if (page > pagination.totalPages) {
      setPage(pagination.totalPages);
    }
  }, [page, pagination.totalPages]);

  return {
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    filteredItems,
    displayItems: paginateEnabled ? pagination.items : filteredItems,
    total: pagination.total,
    totalPages: pagination.totalPages,
    from: pagination.from,
    to: pagination.to,
    paginate: paginateEnabled,
  };
}
