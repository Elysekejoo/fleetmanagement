import { useMemo, useState } from 'react';
import { Search, SearchX } from 'lucide-react';
import { Select } from '@/components/ui/Field';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Pagination, usePagination } from '@/components/ui/Pagination';
import { SkeletonRows } from '@/components/ui/Loading';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: React.ReactNode;
  emptyTitle?: string;
  emptyMessage?: string;
  pageSize?: number;
  onSearch?: (items: T[]) => T[];
  rowKey: (row: T) => string;
}

export function DataTable<T>({
  columns,
  rows,
  loading,
  error,
  onRetry,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  filters,
  emptyTitle = 'No records found',
  emptyMessage,
  pageSize = 10,
  onSearch,
  rowKey,
}: DataTableProps<T>) {
  const [internalSearch, setInternalSearch] = useState('');
  const search = searchValue ?? internalSearch;
  const setSearch = onSearchChange ?? setInternalSearch;

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    if (onSearch) return onSearch(rows);
    const q = search.toLowerCase();
    return rows.filter((row) =>
      columns.some((col) => {
        const value = col.render(row);
        return typeof value === 'string' && value.toLowerCase().includes(q);
      }),
    );
  }, [rows, search, columns, onSearch]);

  const pagination = usePagination(filtered.length, pageSize);
  const pageRows = pagination.slice(filtered);

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      {(searchPlaceholder || filters) && (
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-4 py-3">
          {searchPlaceholder && (
            <div className="flex h-9 items-center gap-2 rounded-lg border border-line-dark bg-white px-2.5 focus-within:border-blue focus-within:ring-[3px] focus-within:ring-blue/10">
              <Search className="h-3.5 w-3.5 text-ink-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-40 bg-transparent text-xs text-ink outline-none placeholder:text-ink-3/70"
              />
            </div>
          )}
          {filters}
        </div>
      )}
      {loading ? (
        <SkeletonRows />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={search ? <SearchX className="h-9 w-9 text-line-dark" /> : undefined}
          title={emptyTitle}
          message={emptyMessage}
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        'whitespace-nowrap border-b border-line bg-bg px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-ink-3',
                        col.className,
                      )}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    className="border-b border-line/60 transition-colors last:border-b-0 hover:bg-bg-2/60"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={cn('px-3.5 py-2.5 text-[13px] text-ink-2 align-middle', col.className)}>
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={filtered.length}
            onPageChange={pagination.setPage}
          />
        </>
      )}
    </div>
  );
}

export function FilterSelect({ value, onChange, options, label }: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  label: string;
}) {
  return (
    <Select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-auto px-2.5 text-xs">
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}