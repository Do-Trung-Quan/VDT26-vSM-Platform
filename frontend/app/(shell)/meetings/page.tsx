"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Radio, Upload, Lock, Pencil, Calendar, MoreVertical, Trash2, RotateCcw, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MeetingFormDialog } from "@/components/meeting-form-dialog";
import { MEETINGS } from "@/lib/data";
import type { Meeting, MeetingStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_ORDER: Record<MeetingStatus, number> = { LIVE: 0, PROCESSING: 1, COMPLETED: 2 };

const STATUS_BADGE: Record<MeetingStatus, { variant: "live"|"processing"|"completed"; dot: string }> = {
  LIVE:       { variant: "live",       dot: "bg-brand animate-blink" },
  PROCESSING: { variant: "processing", dot: "bg-warn" },
  COMPLETED:  { variant: "completed",  dot: "bg-ok" },
};

const DEPTS = ["Tất cả", "Phòng Kỹ thuật", "Phòng Nhân sự", "Phòng Tài chính", "Phòng CSKH", "Phòng Marketing", "Phòng Pháp chế", "Phòng Kinh doanh"];

export default function MeetingsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | "ALL">("ALL");
  const [deletedFilter, setDeletedFilter] = useState<"all"|"active"|"deleted">("active");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"live"|"upload">("live");
  const isAdmin = true;

  const filtered = MEETINGS
    .filter(m => statusFilter === "ALL" || m.status === statusFilter)
    .filter(m => !search || m.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  const handleOpen = (m: Meeting) => {
    if (m.status === "COMPLETED") router.push(`/meetings/${m.id}`);
  };

  const filterPill = (label: string, active: boolean, onClick: () => void) => (
    <button key={label} onClick={onClick}
      className={cn(
        "px-3.5 py-2 rounded-[7px] text-[13px] font-medium border transition-colors cursor-pointer",
        active
          ? "border-brand bg-brand/[0.06] text-brand font-semibold"
          : "border-line bg-white text-tx-mid hover:border-line-dark"
      )}>
      {label}
    </button>
  );

  const segBtn = (label: string, active: boolean, onClick: () => void) => (
    <button key={label} onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-[5px] text-xs font-medium cursor-pointer transition-all",
        active ? "bg-white text-navy shadow-sm" : "text-tx-light hover:text-tx-dark"
      )}>
      {label}
    </button>
  );

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <div className="relative flex-1 min-w-[240px] max-w-[360px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx-muted" />
          <Input
            className="pl-9"
            placeholder="Tìm cuộc họp theo tên…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2.5">
          <Button onClick={() => { setFormMode("live"); setFormOpen(true); }}>
            <Radio size={15} /> Tạo cuộc họp trực tuyến
          </Button>
          <Button variant="outline" onClick={() => { setFormMode("upload"); setFormOpen(true); }}>
            <Upload size={15} /> Tải lên file audio
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2.5 flex-wrap mb-4">
        {(["ALL","LIVE","PROCESSING","COMPLETED"] as const).map(s =>
          filterPill(s === "ALL" ? "Tất cả" : s, statusFilter === s, () => setStatusFilter(s))
        )}
        <div className="w-px h-[22px] bg-line mx-0.5" />

        <Button variant="outline" size="sm" className="gap-1.5 h-9 px-3 text-[13px] font-medium text-tx-mid">
          <Calendar size={14} /> Khoảng ngày
        </Button>

        {isAdmin && (
          <>
            <Select>
              <SelectTrigger className="h-9 w-auto gap-1.5 text-[13px] font-medium text-tx-mid min-w-[130px]">
                <SelectValue placeholder="Phòng ban" />
              </SelectTrigger>
              <SelectContent>
                {DEPTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="flex bg-surface border border-line rounded-[7px] p-0.5">
              {([["all","Tất cả"],["active","Hoạt động"],["deleted","Đã xóa"]] as const).map(([k,l]) =>
                segBtn(l, deletedFilter === k, () => setDeletedFilter(k))
              )}
            </div>
          </>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-line rounded-[10px] overflow-hidden">
        {/* Header row */}
        <div className="grid gap-3 px-[18px] py-3.5 border-b border-line text-[11px] font-semibold text-tx-muted uppercase tracking-[.4px]"
          style={{ gridTemplateColumns: "1fr 116px 96px 160px 160px 130px 44px" }}>
          <div>Cuộc họp</div><div>Trạng thái</div><div>Loại</div>
          <div>Host</div><div>Phòng ban</div><div>Thời gian tạo</div><div />
        </div>

        {filtered.map(m => {
          const { variant, dot } = STATUS_BADGE[m.status];
          const canOpen = m.status === "COMPLETED";
          return (
            <div key={m.id}
              onClick={() => handleOpen(m)}
              className={cn(
                "grid gap-3 px-[18px] py-[15px] border-b border-[#F0F2F5] items-center hover:bg-[#FAFBFC] transition-colors",
                canOpen && "cursor-pointer",
                !canOpen && "opacity-90"
              )}
              style={{ gridTemplateColumns: "1fr 116px 96px 160px 160px 130px 44px" }}>

              {/* Title + lock icon */}
              <div className="flex items-center gap-2 min-w-0">
                {m.locked
                  ? <Lock size={13} className="flex-none text-tx-dim" />
                  : <Pencil size={13} className="flex-none text-tx-muted" />
                }
                <span className="text-[14px] font-medium truncate">{m.title}</span>
              </div>

              <div>
                <Badge variant={variant} className="text-[11px]">
                  <span className={cn("w-1.5 h-1.5 rounded-full flex-none", dot)} />
                  {m.status}
                </Badge>
              </div>

              <div>
                <Badge variant="outline" className="text-[11px]">{m.type}</Badge>
              </div>

              <div className="text-[13px] text-tx-mid truncate">{m.host}</div>
              <div className="text-[13px] text-tx-mid truncate">{m.dept}</div>
              <div className="text-[13px] text-tx-light">{m.created}</div>

              {/* 3-dot menu */}
              <div className="flex justify-center" onClick={e => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-[30px] h-[30px] rounded-[6px] flex items-center justify-center hover:bg-[#EEF0F3] transition-colors">
                      <MoreVertical size={16} className="text-tx-dim" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="gap-2 text-brand focus:text-brand focus:bg-brand/5">
                      <Trash2 size={14} /> Xóa mềm
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2"><Pencil size={14} /> Sửa thông tin</DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          {m.locked ? <><LockOpen size={14}/> Mở khóa biên bản</> : <><Lock size={14}/> Khóa biên bản</>}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2"><RotateCcw size={14} /> Khôi phục</DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}

        {/* Pagination */}
        <div className="flex items-center justify-between px-[18px] py-3.5">
          <span className="text-[13px] text-tx-light">Hiển thị 1–{filtered.length} trên 142 cuộc họp</span>
          <div className="flex items-center gap-1.5">
            {["‹","1","2","3","…","16","›"].map((p, i) => (
              <button key={i}
                className={cn(
                  "w-8 h-8 rounded-[6px] flex items-center justify-center text-[13px] transition-colors",
                  p === "1" ? "bg-brand text-white font-semibold"
                    : p === "…" ? "text-tx-muted px-1 w-auto"
                    : "border border-line hover:bg-surface text-tx-dark"
                )}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <MeetingFormDialog open={formOpen} onOpenChange={setFormOpen} mode={formMode} />
    </>
  );
}
