import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-line bg-white px-4 py-2.5 text-xs text-ink-3">
      <span>
        Page {page} of {pages} · {total} records
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="rounded border border-line-dark p-1 text-ink-2 transition-colors hover:bg-bg disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          aria-label="Next page"
          className="rounded border border-line-dark p-1 text-ink-2 transition-colors hover:bg-bg disabled:opacity-40"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function usePagination(total: number, pageSize = 10) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pages);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    pageSize,
    start,
    end: start + pageSize,
    setPage,
    slice: <T,>(items: T[]): T[] => items.slice(start, start + pageSize),
  };
}