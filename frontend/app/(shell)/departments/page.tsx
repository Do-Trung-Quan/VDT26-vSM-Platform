"use client";
import { useState } from "react";
import { Search, Plus, Pencil, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEPARTMENTS } from "@/lib/data";
import type { Department } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "active" | "deleted";

export default function DepartmentsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);

  const depts = DEPARTMENTS.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || (filter === "deleted" ? d.deleted : !d.deleted);
    return matchSearch && matchFilter;
  });

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
            <Input className="pl-9" placeholder="Tìm phòng ban…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex bg-surface border border-line rounded-[7px] p-0.5">
            {segBtn("Tất cả","all")}
            {segBtn("Hoạt động","active")}
            {segBtn("Đã xóa","deleted")}
          </div>
        </div>
        <Button onClick={() => { setEditDept(null); setFormOpen(true); }} className="gap-2">
          <Plus size={16} /> Thêm phòng ban mới
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white border border-line rounded-[10px] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-line">
              <TableHead>Tên phòng ban</TableHead>
              <TableHead>Địa chỉ</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Số nhân sự</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {depts.map(d => (
              <TableRow key={d.id} className={cn(d.deleted && "opacity-60")}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold">{d.name}</span>
                    {d.deleted && (
                      <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold bg-surface text-tx-muted">
                        ĐÃ XÓA
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-[13px] text-tx-mid">{d.address}</TableCell>
                <TableCell className="text-[13px] text-tx-light leading-snug max-w-[240px]">{d.description}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="w-[26px] h-[26px] rounded-[6px] bg-[#EEF1F5] flex items-center justify-center text-xs font-semibold text-tx-mid">
                      {d.userCount}
                    </span>
                    <span className="text-xs text-tx-muted">người</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1.5">
                    {d.deleted ? (
                      <Button variant="outline" size="sm" className="gap-1.5 text-ok border-ok/30 hover:bg-ok/5 hover:border-ok">
                        <RotateCcw size={13} /> Khôi phục
                      </Button>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditDept(d); setFormOpen(true); }}
                          className="w-[30px] h-[30px] border border-line rounded-[6px] flex items-center justify-center hover:bg-surface hover:border-line-dark transition-colors"
                          title="Sửa">
                          <Pencil size={14} className="text-tx-dim" />
                        </button>
                        <button
                          disabled={d.userCount > 0}
                          title={d.userCount > 0 ? `Không thể xóa: vẫn còn ${d.userCount} nhân sự thuộc phòng ban` : "Xóa mềm"}
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
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{editDept ? "Sửa phòng ban" : "Thêm phòng ban mới"}</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Tên phòng ban <span className="text-brand">*</span></Label>
              <Input defaultValue={editDept?.name} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Địa chỉ <span className="text-brand">*</span></Label>
              <Input defaultValue={editDept?.address} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Mô tả <span className="text-tx-muted font-normal">(tùy chọn)</span></Label>
              <Textarea defaultValue={editDept?.description} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Hủy</Button>
            <Button onClick={() => setFormOpen(false)}>
              {editDept ? "Lưu thay đổi" : "Lưu phòng ban"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
