import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportCsv } from "@/lib/csv";
import {
  Pagination, PaginationContent, PaginationItem,
} from "@/components/ui/pagination";

// Generic sortable + paginated table.
// columns: [{ key, header, render?(row), sortValue?(row), sortable?, className, align }]
export const DataTable = ({
  rows, columns, pageSize = 10, onRowClick, rowTestId, testId, emptyLabel = "No records match your filters.",
  exportable = false, exportFilename = "export.csv", exportColumns = [],
}) => {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    const val = col?.sortValue || ((r) => r[sortKey]);
    const arr = [...rows].sort((a, b) => {
      const av = val(a), bv = val(b);
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      return String(av).localeCompare(String(bv));
    });
    return sortDir === "asc" ? arr : arr.reverse();
  }, [rows, sortKey, sortDir, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  return (
    <div data-testid={testId}>
      {exportable && (
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={() => exportCsv(exportFilename, exportColumns, sorted)}
            data-testid="export-csv-button"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      )}
      <div className="overflow-x-auto scrollbar-thin rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm border-collapse min-w-[640px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "px-3.5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap",
                    c.align === "right" && "text-right",
                    c.sortable && "cursor-pointer select-none hover:text-slate-800",
                    c.className
                  )}
                  onClick={c.sortable ? () => toggleSort(c.key) : undefined}
                  data-testid={c.sortable ? `sort-${c.key}` : undefined}
                >
                  <span className={cn("inline-flex items-center gap-1", c.align === "right" && "flex-row-reverse")}>
                    {c.header}
                    {c.sortable && (
                      sortKey === c.key
                        ? (sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)
                        : <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-400">{emptyLabel}</td></tr>
            )}
            {pageRows.map((row, ri) => (
              <tr
                key={row.id || ri}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                data-testid={rowTestId ? rowTestId(row) : undefined}
                className={cn(
                  "border-b border-slate-100 last:border-0 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-slate-50"
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-3.5 py-3 text-slate-700 align-middle", c.align === "right" && "text-right", c.cellClassName)}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length > pageSize && (
        <div className="flex items-center justify-between mt-3 text-sm">
          <span className="text-xs text-slate-400">
            Showing {safePage * pageSize + 1}–{Math.min(sorted.length, (safePage + 1) * pageSize)} of {sorted.length}
          </span>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <button
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-40 hover:bg-slate-50"
                  disabled={safePage === 0}
                  onClick={() => setPage(safePage - 1)}
                  data-testid="table-prev-page"
                >Prev</button>
              </PaginationItem>
              <PaginationItem>
                <span className="px-2 text-xs text-slate-500">{safePage + 1} / {pageCount}</span>
              </PaginationItem>
              <PaginationItem>
                <button
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-40 hover:bg-slate-50"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage(safePage + 1)}
                  data-testid="table-next-page"
                >Next</button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};
