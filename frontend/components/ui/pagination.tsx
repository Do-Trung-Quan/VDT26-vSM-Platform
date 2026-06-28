"use client";
import { cn } from "@/lib/utils";

/** Tính danh sách items hiển thị — tối đa 5 slot (số trang + dấu ...) */
function getPageItems(page: number, total: number): (number | "...")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (page <= 3)        return [1, 2, 3, "...", total];
  if (page >= total - 2) return [1, "...", total - 2, total - 1, total];
  return [1, "...", page, "...", total];
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const items = getPageItems(page, totalPages);
  const btnBase = "w-8 h-8 rounded-[6px] flex items-center justify-center text-[13px] transition-colors";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <button
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className={cn(btnBase, "border border-line hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed")}
      >‹</button>

      {items.map((item, idx) =>
        item === "..."
          ? <span key={`e${idx}`} className="w-6 flex items-center justify-center text-tx-muted select-none">…</span>
          : <button
              key={item}
              onClick={() => onPageChange(item)}
              className={cn(
                btnBase,
                item === page
                  ? "bg-brand text-white font-semibold"
                  : "border border-line hover:bg-surface text-tx-dark",
              )}
            >{item}</button>
      )}

      <button
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        className={cn(btnBase, "border border-line hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed")}
      >›</button>
    </div>
  );
}
