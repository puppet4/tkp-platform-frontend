import { useState, useMemo } from "react";

interface UseTableControlsOptions<T> {
  data: T[];
  pageSize?: number;
  defaultSortField?: keyof T;
  defaultSortDir?: "asc" | "desc";
}

export function useTableControls<T extends Record<string, unknown>>({
  data,
  pageSize = 10,
  defaultSortField,
  defaultSortDir = "desc",
}: UseTableControlsOptions<T>) {
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<keyof T | null>(defaultSortField ?? null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    if (!sortField) return data;
    return [...data].sort((a, b) => {
      const aVal = String(a[sortField] ?? "");
      const bVal = String(b[sortField] ?? "");
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [data, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (field: keyof T) => {
    if (sortField === field) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const sortIndicator = (field: keyof T) =>
    sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (ids: string[]) => {
    const allSelected = ids.every(id => selected.has(id));
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(ids));
  };

  const isAllSelected = (ids: string[]) => ids.length > 0 && ids.every(id => selected.has(id));

  const clearSelection = () => setSelected(new Set());

  return {
    page: safePage,
    setPage,
    totalPages,
    paginated,
    sorted,
    sortField,
    sortDir,
    toggleSort,
    sortIndicator,
    selected,
    toggleSelect,
    toggleSelectAll,
    isAllSelected,
    clearSelection,
    totalItems: data.length,
  };
}
