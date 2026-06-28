"use client";
import { useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar, X } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  // Internal draft — chỉ commit khi bấm "Áp dụng"
  const [draft, setDraft] = useState<DateRange>({ from: undefined, to: undefined });

  const hasRange = !!value.from;

  const label = value.from && value.to
    ? `${format(value.from, "dd/MM/yy")} – ${format(value.to, "dd/MM/yy")}`
    : value.from
    ? `Từ ${format(value.from, "dd/MM/yy")}`
    : "Khoảng ngày";

  const handleOpen = (next: boolean) => {
    if (next) setDraft({ from: value.from, to: value.to }); // sync draft với value hiện tại
    setOpen(next);
  };

  const handleApply = () => {
    onChange(draft);
    setOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange({ from: undefined, to: undefined });
    setDraft({ from: undefined, to: undefined });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-1.5 h-9 px-3 text-[13px] font-medium transition-colors",
            hasRange
              ? "border-brand bg-brand/[0.06] text-brand"
              : "text-tx-mid",
            className,
          )}
        >
          <Calendar size={14} />
          {label}
          {hasRange && (
            <X size={12} className="ml-0.5 flex-none" onClick={handleClear} />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="p-0 w-auto">
        <DayPicker
          mode="range"
          selected={{ from: draft.from, to: draft.to }}
          onSelect={(range) => setDraft({ from: range?.from, to: range?.to })}
          locale={vi}
          captionLayout="dropdown-years"
          startMonth={new Date(2020, 0)}
          endMonth={new Date(new Date().getFullYear() + 1, 11)}
          className="p-3"
        />

        {/* Footer: preview + actions */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-line">
          <span className="text-[12px] text-tx-muted">
            {draft.from && draft.to
              ? `${format(draft.from, "dd/MM/yyyy")} – ${format(draft.to, "dd/MM/yyyy")}`
              : draft.from
              ? `Từ ${format(draft.from, "dd/MM/yyyy")}`
              : "Chưa chọn khoảng ngày"}
          </span>
          <div className="flex gap-2">
            {/* Chỉ xóa draft, KHÔNG đóng popover */}
            <Button
              variant="outline" size="sm" className="h-7 text-[12px]"
              onClick={() => setDraft({ from: undefined, to: undefined })}
            >
              Xóa
            </Button>
            <Button size="sm" className="h-7 text-[12px]" onClick={handleApply}>
              Áp dụng
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
