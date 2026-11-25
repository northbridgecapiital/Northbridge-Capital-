import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState, TableSkeleton } from './StateDisplay';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  loading = false,
  emptyTitle = 'No Records Found',
  emptyDescription = 'No database records match the active filter criteria.',
  emptyAction,
  defaultPageSize = 10,
  onRowClick,
  selectedRowKey,
}: {
  rows: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  defaultPageSize?: number;
  onRowClick?: (row: T) => void;
  selectedRowKey?: string | null;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return rows;
    const getter = col.sortValue;
    return [...rows].sort((a, b) => {
      const av = getter(a);
      const bv = getter(b);
      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, columns, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pagedRows = sortedRows.slice(startIdx, startIdx + pageSize);

  function handleSort(colKey: string) {
    setPage(1);
    if (sortKey === colKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(colKey);
      setSortDir('asc');
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <TableSkeleton rows={6} cols={Math.min(columns.length, 6)} />
      </div>
    );
  }

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto border border-[#E2E8F0] bg-white">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]">
              {columns.map((col) => {
                const isSortable = Boolean(col.sortValue);
                const isActive = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    className={`px-3.5 py-2.5 font-semibold whitespace-nowrap ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    } ${col.headerClassName || ''}`}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className={`inline-flex items-center gap-1 hover:text-[#0B1320] ${
                          col.align === 'right' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <span>{col.header}</span>
                        {isActive ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="h-3 w-3 text-[#0B1320]" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-[#0B1320]" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {pagedRows.map((row) => {
              const key = rowKey(row);
              const isSelected = selectedRowKey === key;
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${isSelected ? 'bg-[#F1F5F9]' : 'hover:bg-[#F8FAFC]'}`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3.5 py-3 align-middle ${
                        col.align === 'right' ? 'text-right' : 'text-left'
                      } ${col.cellClassName || ''}`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#475569]">
        <div className="flex items-center gap-3">
          <span className="tabular-nums">
            Showing {startIdx + 1}–{Math.min(startIdx + pageSize, sortedRows.length)} of{' '}
            {sortedRows.length} records
          </span>
          <label className="inline-flex items-center gap-1.5">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Rows per page"
              className="border border-[#CBD5E1] bg-white px-2 py-1 text-xs text-[#0B1320]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 border border-[#CBD5E1] bg-white px-2.5 py-1 text-xs font-medium text-[#0B1320] hover:border-[#0B1320] disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Prev</span>
          </button>
          <span className="px-2 font-mono tabular-nums text-[#0B1320]">
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex items-center gap-1 border border-[#CBD5E1] bg-white px-2.5 py-1 text-xs font-medium text-[#0B1320] hover:border-[#0B1320] disabled:opacity-40"
          >
            <span>Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
