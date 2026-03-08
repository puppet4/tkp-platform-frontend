import { ChevronLeft, ChevronRight } from "lucide-react";

interface TablePaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  selectedCount?: number;
  onClearSelection?: () => void;
  onBulkAction?: (action: string) => void;
  bulkActions?: { key: string; label: string; variant?: "destructive" }[];
}

export function TablePagination({
  page, totalPages, totalItems, onPageChange,
  selectedCount = 0, onClearSelection, onBulkAction, bulkActions,
}: TablePaginationProps) {
  if (totalItems === 0) return null;

  return (
    <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-muted-foreground tabular-nums">共 {totalItems} 条</span>
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 animate-in fade-in duration-150">
            <span className="text-[11px] text-primary font-medium">已选 {selectedCount} 项</span>
            {bulkActions?.map(action => (
              <button key={action.key} onClick={() => onBulkAction?.(action.key)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all duration-150 ${
                  action.variant === "destructive"
                    ? "border-destructive/30 text-destructive hover:bg-destructive/5"
                    : "border-border text-foreground hover:bg-secondary"
                }`}>
                {action.label}
              </button>
            ))}
            <button onClick={onClearSelection} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              取消选择
            </button>
          </div>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}
            className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-30 transition-all duration-150">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-sm text-foreground px-3 tabular-nums">{page} / {totalPages}</span>
          <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}
            className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-30 transition-all duration-150">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}
