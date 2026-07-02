"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Radio, Upload, Lock, Pencil, MoreVertical,
  Trash2, RotateCcw, LockOpen, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { MeetingFormDialog } from "@/components/meeting-form-dialog";
import { MeetingEditDialog } from "@/components/meeting-edit-dialog";
import { DateRangePicker, type DateRange } from "@/components/date-range-picker";
import { useAuth } from "@/lib/auth-context";
import { meetingsApi } from "@/lib/api/meetings";
import { departmentsApi } from "@/lib/api/departments";
import type { MeetingListItem, MeetingStatus, Department } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_ORDER: Record<MeetingStatus, number> = { LIVE: 0, PROCESSING: 1, COMPLETED: 2 };

const STATUS_BADGE: Record<MeetingStatus, { variant: "live" | "processing" | "completed"; dot: string; label: string }> = {
  LIVE:       { variant: "live",       dot: "bg-brand animate-blink", label: "Trực tuyến" },
  PROCESSING: { variant: "processing", dot: "bg-warn",                label: "Đang xử lý" },
  COMPLETED:  { variant: "completed",  dot: "bg-ok",                  label: "Hoàn thành" },
};

const TYPE_LABEL: Record<string, string> = { LIVE: "Trực tuyến", UPLOAD: "Tải lên" };

export default function MeetingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  // --- Filters ---
  const [titleSearch, setTitleSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | "ALL">("ALL");
  const [deletedStatus, setDeletedStatus] = useState<"all" | "active" | "deleted">("active");
  const [departmentId, setDepartmentId] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [page, setPage] = useState(1);

  // --- Data ---
  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [allSearchResults, setAllSearchResults] = useState<MeetingListItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  // --- Dialogs ---
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"live" | "upload">("live");
  const [editMeeting, setEditMeeting] = useState<MeetingListItem | null>(null);

  // --- Fetch meetings ---
  const fetchMeetings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (debouncedSearch.trim()) {
        const { data } = await meetingsApi.search(debouncedSearch.trim());
        setAllSearchResults(data ?? []);
      } else {
        const params = {
          page,
          limit: 20,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          departmentId: departmentId !== "all" ? departmentId : undefined,
          fromDate: dateRange.from?.toISOString(),
          toDate: dateRange.to?.toISOString(),
          deletedStatus: isAdmin ? deletedStatus : undefined,
        };
        const { data, meta: m } = isAdmin
          ? await meetingsApi.listAll(params)
          : await meetingsApi.list(params);
        setMeetings(data ?? []);
        setMeta({ total: Number(m?.total) || 0, totalPages: Number(m?.totalPages) || 1 });
      }
    } catch {
      if (debouncedSearch.trim()) {
        setAllSearchResults([]);
      } else {
        setMeetings([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, page, statusFilter, deletedStatus, departmentId, dateRange, debouncedSearch]);

  // Debounce titleSearch 400ms trước khi gọi API
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(titleSearch), 400);
    return () => clearTimeout(timer);
  }, [titleSearch]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  // --- Client-side filtering & pagination for search results ---
  useEffect(() => {
    if (!debouncedSearch.trim()) return;

    let filtered = [...allSearchResults];

    // 1. Filter by status
    if (statusFilter !== "ALL") {
      filtered = filtered.filter(m => m.status === statusFilter);
    }

    // 2. Filter by department
    if (departmentId !== "all") {
      filtered = filtered.filter(m => m.departmentId === departmentId);
    }

    // 3. Filter by date range
    if (dateRange.from) {
      const fromTime = new Date(dateRange.from).getTime();
      filtered = filtered.filter(m => new Date(m.createdAt).getTime() >= fromTime);
    }
    if (dateRange.to) {
      const toTime = new Date(dateRange.to).getTime();
      filtered = filtered.filter(m => new Date(m.createdAt).getTime() <= toTime);
    }

    // 4. Filter by deleted status
    if (isAdmin) {
      if (deletedStatus === "active") {
        filtered = filtered.filter(m => !m.deletedAt);
      } else if (deletedStatus === "deleted") {
        filtered = filtered.filter(m => !!m.deletedAt);
      }
    } else {
      filtered = filtered.filter(m => !m.deletedAt);
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / 20) || 1;

    // Slice for pagination (20 items per page)
    const paginated = filtered.slice((page - 1) * 20, page * 20);

    setMeetings(paginated);
    setMeta({ total, totalPages });
  }, [allSearchResults, page, statusFilter, deletedStatus, departmentId, dateRange, debouncedSearch, isAdmin]);

  // Reset page khi thay filter (ngoại trừ page)
  useEffect(() => { setPage(1); }, [statusFilter, deletedStatus, departmentId, dateRange, debouncedSearch]);

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
    try {
      const { data } = await departmentsApi.list({ status: "active", limit: 100 });
      setDepartments(data ?? []);
    } catch {}
  }, []);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  // Poll upload progress for PROCESSING meetings (every 1s, auto-refresh khi 100%)
  useEffect(() => {
    const processingIds = meetings
      .filter(m => m.status === "PROCESSING" && !m.deletedAt)
      .map(m => m.id);

    if (processingIds.length === 0) {
      setProgressMap({});
      return;
    }

    let refreshScheduled = false;

    const poll = async () => {
      const results = await Promise.all(
        processingIds.map(id =>
          meetingsApi.getUploadProgress(id)
            .then(r => ({ id, percent: r.data?.percent ?? 0 }))
            .catch(() => null),
        ),
      );
      setProgressMap(prev => {
        const next = { ...prev };
        results.forEach(r => { if (r) next[r.id] = r.percent; });
        return next;
      });
      // Khi có meeting đạt 100%, re-fetch danh sách để cập nhật status sang COMPLETED
      if (!refreshScheduled && results.some(r => r && r.percent >= 100)) {
        refreshScheduled = true;
        setTimeout(() => fetchMeetings(), 1500);
      }
    };

    poll();
    const interval = setInterval(poll, 1000);
    return () => clearInterval(interval);
  }, [meetings, fetchMeetings]);

  // --- Actions ---
  const handleDelete = async (id: string) => {
    try { await meetingsApi.softDelete(id); fetchMeetings(); } catch {}
  };

  const handleRestore = async (id: string) => {
    try { await meetingsApi.restore(id); fetchMeetings(); } catch {}
  };

  const handleToggleLock = async (m: MeetingListItem) => {
    try { await meetingsApi.setLocked(m.id, !m.isLocked); fetchMeetings(); } catch {}
  };

  // --- Render helpers ---
  const filterPill = (label: string, active: boolean, onClick: () => void) => (
    <button key={label} onClick={onClick}
      className={cn(
        "px-3.5 py-2 rounded-[7px] text-[13px] font-medium border transition-colors cursor-pointer",
        active
          ? "border-brand bg-brand/[0.06] text-brand font-semibold"
          : "border-line bg-white text-tx-mid hover:border-line-dark",
      )}>
      {label}
    </button>
  );

  const segBtn = (label: string, active: boolean, onClick: () => void) => (
    <button key={label} onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-[5px] text-xs font-medium cursor-pointer transition-all",
        active ? "bg-white text-navy shadow-sm" : "text-tx-light hover:text-tx-dark",
      )}>
      {label}
    </button>
  );

  const getMenuActions = (m: MeetingListItem) => {
    const isDeleted = !!m.deletedAt;
    const isHost = m.hostId === user?.id;

    if (isDeleted) {
      return isAdmin ? ["restore"] : [];
    }

    const actions: string[] = [];
    if (isAdmin) {
      actions.push("edit");
      if (m.status === "COMPLETED") actions.push("lock");
      actions.push("delete");
    } else if (isHost) {
      actions.push("delete");
    }
    return actions;
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <div className="relative flex-1 min-w-[240px] max-w-[360px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx-muted" />
          <Input
            className="pl-9"
            placeholder="Tìm kiếm theo tên cuộc họp…"
            value={titleSearch}
            onChange={e => setTitleSearch(e.target.value)}
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
        {(["ALL", "LIVE", "PROCESSING", "COMPLETED"] as const).map(s =>
          filterPill(
            s === "ALL" ? "Tất cả" : STATUS_BADGE[s].label,
            statusFilter === s,
            () => setStatusFilter(s),
          )
        )}

        <div className="w-px h-[22px] bg-line mx-0.5" />

        <DateRangePicker value={dateRange} onChange={setDateRange} />

        {isAdmin && (
          <>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger className="h-9 w-auto gap-1.5 text-[13px] font-medium text-tx-mid min-w-[140px]">
                <SelectValue placeholder="Tất cả phòng ban" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả phòng ban</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex bg-surface border border-line rounded-[7px] p-0.5">
              {([["all", "Tất cả"], ["active", "Hoạt động"], ["deleted", "Đã xóa"]] as const).map(([k, l]) =>
                segBtn(l, deletedStatus === k, () => setDeletedStatus(k))
              )}
            </div>
          </>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-line rounded-[10px] overflow-hidden">
        {/* Header row */}
        <div
          className="grid gap-3 px-[18px] py-3.5 border-b border-line bg-surface/60 text-[12px] font-bold text-tx-dark uppercase tracking-wide"
          style={{ gridTemplateColumns: "1fr 150px 96px 160px 160px 130px 44px" }}>
          <div>Cuộc họp</div><div>Trạng thái</div><div>Loại</div>
          <div>Host</div><div>Phòng ban</div><div>Thời gian tạo</div><div />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-tx-muted gap-2">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-[13px]">Đang tải…</span>
          </div>
        )}

        {!loading && meetings.length === 0 && (
          <div className="text-center py-16 text-[13px] text-tx-muted">
            Không có cuộc họp nào
          </div>
        )}

        {!loading && meetings.map(m => {
          const { variant, dot, label: statusLabel } = STATUS_BADGE[m.status];
          const isDeleted = !!m.deletedAt;
          const canOpen = m.status === "COMPLETED" && !isDeleted;
          const menuActions = getMenuActions(m);
          const pct = progressMap[m.id];
          const showPct = m.status === "PROCESSING" && !isDeleted && pct !== undefined && pct >= 0;

          return (
            <div key={m.id}
              onClick={() => canOpen && router.push(`/meetings/${m.id}`)}
              className={cn(
                "grid gap-3 px-[18px] py-[15px] border-b border-[#F0F2F5] items-center hover:bg-[#FAFBFC] transition-colors",
                canOpen && "cursor-pointer",
                isDeleted && "bg-[#FAFAFA]",
              )}
              style={{ gridTemplateColumns: "1fr 150px 96px 160px 160px 130px 44px" }}>

              {/* Title + lock icon */}
              <div className="flex items-center gap-2 min-w-0">
                {m.isLocked
                  ? <Lock size={13} className="flex-none text-tx-dim" />
                  : <Pencil size={13} className="flex-none text-tx-muted" />
                }
                <span className="text-[14px] font-medium truncate">{m.title}</span>
              </div>

              <div>
                {isDeleted ? (
                  <Badge variant="outline" className="text-[11px] border-red-200 text-red-500 bg-red-50">
                    <span className="w-1.5 h-1.5 rounded-full flex-none bg-red-400" />
                    Đã xóa
                  </Badge>
                ) : (
                  <Badge variant={variant} className="text-[11px]">
                    <span className={cn("w-1.5 h-1.5 rounded-full flex-none", dot)} />
                    {statusLabel}{showPct ? ` · ${pct}%` : ""}
                  </Badge>
                )}
              </div>

              <div>
                <Badge variant="outline" className="text-[11px]">{TYPE_LABEL[m.type] ?? m.type}</Badge>
              </div>

              <div className="text-[13px] text-tx-mid truncate">{m.hostName}</div>
              <div className="text-[13px] text-tx-mid truncate">{m.departmentName}</div>
              <div className="text-[13px] text-tx-light">
                {new Date(m.createdAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </div>

              {/* 3-dot menu */}
              <div className="flex justify-center" onClick={e => e.stopPropagation()}>
                {menuActions.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-[30px] h-[30px] rounded-[6px] border border-line flex items-center justify-center hover:bg-[#EEF0F3] hover:border-line-dark transition-colors">
                        <MoreVertical size={16} className="text-tx-mid" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {menuActions.includes("restore") && (
                        <DropdownMenuItem className="gap-2" onClick={() => handleRestore(m.id)}>
                          <RotateCcw size={14} /> Khôi phục
                        </DropdownMenuItem>
                      )}
                      {menuActions.includes("edit") && (
                        <DropdownMenuItem className="gap-2" onClick={() => setEditMeeting(m)}>
                          <Pencil size={14} /> Sửa thông tin
                        </DropdownMenuItem>
                      )}
                      {menuActions.includes("lock") && (
                        <DropdownMenuItem className="gap-2" onClick={() => handleToggleLock(m)}>
                          {m.isLocked
                            ? <><LockOpen size={14} /> Mở khóa biên bản</>
                            : <><Lock size={14} /> Khóa biên bản</>}
                        </DropdownMenuItem>
                      )}
                      {menuActions.includes("delete") && (
                        <>
                          {menuActions.length > 1 && <DropdownMenuSeparator />}
                          <DropdownMenuItem
                            className="gap-2 text-red-500 focus:text-red-500 focus:bg-red-50"
                            onClick={() => handleDelete(m.id)}>
                            <Trash2 size={14} /> Xóa cuộc họp
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}

        {/* Pagination */}
        <div className="flex items-center justify-between px-[18px] py-3.5 border-t border-line">
          <span className="text-[13px] text-tx-light">Hiển thị {meetings.length} / {meta.total} cuộc họp</span>
          <Pagination page={page} totalPages={meta.totalPages} onPageChange={setPage} />
        </div>
      </div>

      <MeetingFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        onSuccess={fetchMeetings}
      />

      <MeetingEditDialog
        meeting={editMeeting}
        onOpenChange={open => { if (!open) setEditMeeting(null); }}
        onSuccess={fetchMeetings}
      />
    </>
  );
}
