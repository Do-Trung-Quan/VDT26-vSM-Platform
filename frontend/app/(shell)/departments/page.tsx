"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Pencil, Trash2, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { departmentsApi } from "@/lib/api/departments";
import { ApiError } from "@/lib/api";
import type { Department } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "active" | "deleted";

const LIMIT = 20;

export default function DepartmentsPage() {
  const [depts,      setDepts]      = useState<Department[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Pagination
  const [page,       setPage]       = useState(1);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter — default "active" (chỉ hiện phòng ban đang hoạt động)
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("active");

  // Dialog
  const [formOpen,  setFormOpen]  = useState(false);
  const [editDept,  setEditDept]  = useState<Department | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [fname, setFname] = useState("");
  const [faddr, setFaddr] = useState("");
  const [fdesc, setFdesc] = useState("");

  const openCreate = () => {
    setEditDept(null); setFname(""); setFaddr(""); setFdesc(""); setFormError(null); setFormOpen(true);
  };
  const openEdit = (d: Department) => {
    setEditDept(d); setFname(d.name); setFaddr(d.address); setFdesc(d.description ?? ""); setFormError(null); setFormOpen(true);
  };

  const fetchDepts = useCallback(async (pg = 1) => {
    setLoading(true); setError(null);
    try {
      const { data, meta } = await departmentsApi.list({
        status: filter,
        name: search || undefined,
        page: pg,
        limit: LIMIT,
      });
      setDepts(data);
      setTotal((meta as Record<string, number>)?.total       ?? 0);
      setTotalPages((meta as Record<string, number>)?.totalPages ?? 1);
      setPage(pg);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Tải dữ liệu thất bại");
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { fetchDepts(1); }, [filter, search]); // eslint-disable-line

  const handleSave = async () => {
    if (!fname.trim() || !faddr.trim()) { setFormError("Tên và địa chỉ không được để trống"); return; }
    setSubmitting(true); setFormError(null);
    try {
      if (editDept) {
        await departmentsApi.update(editDept.id, { name: fname, address: faddr, description: fdesc || undefined });
      } else {
        await departmentsApi.create({ name: fname, address: faddr, description: fdesc || undefined });
      }
      setFormOpen(false); fetchDepts(1);
    } catch (e) { setFormError(e instanceof ApiError ? e.message : "Thao tác thất bại"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (d: Department) => {
    if (!confirm(`Xóa phòng ban "${d.name}"?`)) return;
    try { await departmentsApi.softDelete(d.id); fetchDepts(page); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Xóa thất bại"); }
  };

  const handleRestore = async (d: Department) => {
    try { await departmentsApi.restore(d.id); fetchDepts(page); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Khôi phục thất bại"); }
  };

  const segBtn = (label: string, val: Filter) => (
    <button key={val} onClick={() => setFilter(val)}
      className={cn("px-3 py-1.5 rounded-[5px] text-xs font-medium cursor-pointer transition-all",
        filter === val ? "bg-white text-navy shadow-sm" : "text-tx-light hover:text-tx-dark")}>
      {label}
    </button>
  );

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <div className="flex items-center gap-2.5 flex-1 flex-wrap">
          <div className="relative min-w-[200px] max-w-[300px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx-muted" />
            <Input className="pl-9" placeholder="Tìm phòng ban…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex bg-surface border border-line rounded-[7px] p-0.5">
            {segBtn("Tất cả",    "all")}
            {segBtn("Hoạt động", "active")}
            {segBtn("Đã xóa",   "deleted")}
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus size={16} /> Thêm phòng ban mới</Button>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-brand/5 border border-brand/20 text-sm text-brand">{error}</div>}

      {/* Table */}
      <div className="bg-white border border-line rounded-[10px] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-line bg-surface/60">
              <TableHead className="font-bold text-tx-dark text-[12px] uppercase tracking-wide">Tên phòng ban</TableHead>
              <TableHead className="font-bold text-tx-dark text-[12px] uppercase tracking-wide">Địa chỉ</TableHead>
              <TableHead className="font-bold text-tx-dark text-[12px] uppercase tracking-wide">Mô tả</TableHead>
              <TableHead className="font-bold text-tx-dark text-[12px] uppercase tracking-wide">Số nhân sự</TableHead>
              <TableHead className="font-bold text-tx-dark text-[12px] uppercase tracking-wide text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-tx-muted">
                  <Loader2 size={20} className="animate-spin inline-block mr-2" />Đang tải…
                </TableCell>
              </TableRow>
            ) : depts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-tx-muted">Không có phòng ban nào</TableCell>
              </TableRow>
            ) : depts.map(d => (
              /* Opacity CHỈ áp dụng trên các cell nội dung, KHÔNG áp dụng trên cell hành động */
              <TableRow key={d.id}>
                <TableCell className={cn(d.deleted && "opacity-50")}>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold">{d.name}</span>
                    {d.deleted && (
                      <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold bg-surface text-tx-muted">ĐÃ XÓA</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className={cn("text-[13px] text-tx-mid", d.deleted && "opacity-50")}>{d.address}</TableCell>
                <TableCell className={cn("text-[13px] text-tx-light leading-snug max-w-[240px]", d.deleted && "opacity-50")}>{d.description}</TableCell>
                <TableCell className={cn(d.deleted && "opacity-50")}>
                  <div className="flex items-center gap-1.5">
                    <span className="w-[26px] h-[26px] rounded-[6px] bg-[#EEF1F5] flex items-center justify-center text-xs font-semibold text-tx-mid">{d.userCount}</span>
                    <span className="text-xs text-tx-muted">người</span>
                  </div>
                </TableCell>
                {/* Cell hành động — LUÔN opacity-100 */}
                <TableCell>
                  <div className="flex items-center justify-end gap-1.5">
                    {d.deleted ? (
                      <Button variant="outline" size="sm"
                        className="gap-1.5 text-ok border-ok/30 hover:bg-ok/5 hover:border-ok"
                        onClick={() => handleRestore(d)}>
                        <RotateCcw size={13} /> Khôi phục
                      </Button>
                    ) : (
                      <>
                        <button onClick={() => openEdit(d)}
                          className="w-[30px] h-[30px] border border-line rounded-[6px] flex items-center justify-center hover:bg-surface hover:border-line-dark transition-colors"
                          title="Sửa">
                          <Pencil size={14} className="text-tx-dim" />
                        </button>
                        <button onClick={() => handleDelete(d)} disabled={d.userCount > 0}
                          title={d.userCount > 0 ? `Không thể xóa: còn ${d.userCount} nhân sự` : "Xóa mềm"}
                          className={cn(
                            "w-[30px] h-[30px] border rounded-[6px] flex items-center justify-center transition-colors",
                            d.userCount > 0
                              ? "border-line opacity-40 cursor-not-allowed"
                              : "border-line hover:bg-brand/5 hover:border-brand cursor-pointer"
                          )}>
                          <Trash2 size={14} className={d.userCount > 0 ? "text-tx-muted" : "text-brand"} />
                        </button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-[18px] py-3.5 border-t border-line">
            <span className="text-[13px] text-tx-light">
              Hiển thị {depts.length} / {total} phòng ban
            </span>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map(p => (
                <button key={p} onClick={() => fetchDepts(p)}
                  className={cn(
                    "w-8 h-8 rounded-[6px] flex items-center justify-center text-[13px] transition-colors",
                    p === page
                      ? "bg-brand text-white font-semibold"
                      : "border border-line hover:bg-surface text-tx-dark"
                  )}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-[440px]"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editDept ? "Sửa phòng ban" : "Thêm phòng ban mới"}</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5 flex flex-col gap-4">
            {formError && (
              <div className="p-3 rounded-lg bg-brand/5 border border-brand/20 text-sm text-brand">{formError}</div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label>Tên phòng ban <span className="text-brand">*</span></Label>
              <Input value={fname} onChange={e => setFname(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Địa chỉ <span className="text-brand">*</span></Label>
              <Input value={faddr} onChange={e => setFaddr(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Mô tả <span className="text-tx-muted font-normal">(tùy chọn)</span></Label>
              <Textarea value={fdesc} onChange={e => setFdesc(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>Hủy</Button>
            <Button onClick={handleSave} disabled={submitting}>
              {submitting ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
              {editDept ? "Lưu thay đổi" : "Lưu phòng ban"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
