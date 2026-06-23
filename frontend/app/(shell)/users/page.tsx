"use client";
import { useState } from "react";
import { Search, Plus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { USERS, DEPARTMENTS } from "@/lib/data";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [activeMap, setActiveMap] = useState<Record<string, boolean>>({});

  const users = USERS.filter(u =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.empId.toLowerCase().includes(search.toLowerCase())
  );

  const isActive = (u: User) => activeMap[u.id] !== undefined ? activeMap[u.id] : u.active;
  const toggle = (u: User) => setActiveMap(m => ({ ...m, [u.id]: !isActive(u) }));

  const initials = (name: string) =>
    name.split(" ").slice(-2).map(w => w[0]).join("").toUpperCase();

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <div className="flex items-center gap-2.5 flex-1 flex-wrap">
          <div className="relative min-w-[240px] max-w-[340px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx-muted" />
            <Input className="pl-9" placeholder="Tìm theo tên, email, Employee ID…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select>
            <SelectTrigger className="h-10 w-auto min-w-[140px] text-[13px]">
              <SelectValue placeholder="Phòng ban" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {DEPARTMENTS.filter(d => !d.deleted).map(d =>
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="h-10 w-auto min-w-[130px] text-[13px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus size={16} /> Thêm tài khoản mới
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white border border-line rounded-[10px] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-line">
              <TableHead>Họ tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Emp. ID</TableHead>
              <TableHead>Phòng ban</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className="text-center">Kích hoạt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(u => {
              const active = isActive(u);
              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex-none flex items-center justify-center text-white text-xs font-semibold"
                        style={{ background: u.color }}>
                        {initials(u.name)}
                      </div>
                      <span className="text-[14px] font-medium">{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[13px] text-tx-mid">{u.email}</TableCell>
                  <TableCell className="font-mono text-[12px] text-tx-light">{u.empId}</TableCell>
                  <TableCell className="text-[13px] text-tx-mid">{u.dept}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "ADMIN" ? "admin" : "user"} className="text-[11px]">
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={active ? "active" : "inactive"} className="text-[11px]">
                      <span className={cn("w-1.5 h-1.5 rounded-full flex-none",
                        active ? "bg-ok" : "bg-tx-muted")} />
                      {active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[13px] text-tx-light">{u.created}</TableCell>
                  <TableCell className="text-center">
                    <Switch checked={active} onCheckedChange={() => toggle(u)} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-[18px] py-3.5 border-t border-line">
          <span className="text-[13px] text-tx-light">Hiển thị 1–{users.length} trên 87 nhân sự</span>
          <div className="flex items-center gap-1.5">
            {["‹","1","2","3","›"].map((p, i) => (
              <button key={i} className={cn("w-8 h-8 rounded-[6px] flex items-center justify-center text-[13px] transition-colors",
                p === "1" ? "bg-brand text-white font-semibold" : "border border-line hover:bg-surface text-tx-dark")}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Thêm tài khoản mới</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Email <span className="text-brand">*</span></Label>
              <Input type="email" placeholder="ten@viettel.com.vn" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Họ và tên <span className="text-brand">*</span></Label>
                <Input />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Employee ID <span className="text-brand">*</span></Label>
                <Input placeholder="VT-XXXXX" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Phòng ban <span className="text-brand">*</span></Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.filter(d => !d.deleted).map(d =>
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Vai trò <span className="text-brand">*</span></Label>
              <RadioGroup defaultValue="USER" className="grid grid-cols-2 gap-3">
                {(["USER","ADMIN"] as const).map(r => (
                  <Label key={r} htmlFor={`role-${r}`}
                    className={cn(
                      "flex items-center gap-2.5 border rounded-[6px] px-3 py-2.5 cursor-pointer font-normal",
                      r === "USER" ? "border-brand bg-brand/5" : "border-line"
                    )}>
                    <RadioGroupItem value={r} id={`role-${r}`} />
                    {r}
                  </Label>
                ))}
              </RadioGroup>
            </div>
            <div className="flex gap-2.5 items-start bg-surface rounded-[7px] px-3.5 py-3">
              <Info size={14} className="text-tx-muted flex-none mt-0.5" />
              <p className="text-xs text-tx-light leading-[1.55]">
                Mật khẩu ban đầu được sinh ngẫu nhiên và gửi tới email người dùng. Admin không nhìn thấy mật khẩu.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Hủy</Button>
            <Button onClick={() => setFormOpen(false)}>Tạo tài khoản</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
