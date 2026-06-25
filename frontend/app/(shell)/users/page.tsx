"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Info, MoreVertical, Pencil, UserCheck, UserX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usersApi } from "@/lib/api/users";
import { departmentsApi } from "@/lib/api/departments";
import { ApiError } from "@/lib/api";
import type { User, Department, Role } from "@/lib/types";
import { getAvatarColor, getInitials, formatDate } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function UsersPage() {
  const [users,      setUsers]      = useState<User[]>([]);
  const [depts,      setDepts]      = useState<Department[]>([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search,     setSearch]     = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialogs
  const [formOpen,  setFormOpen]  = useState(false);
  const [editUser,  setEditUser]  = useState<User | null>(null);

  // Create form state
  const [createEmail,   setCreateEmail]   = useState("");
  const [createName,    setCreateName]    = useState("");
  const [createEmpId,   setCreateEmpId]   = useState("");
  const [createDeptId,  setCreateDeptId]  = useState("");
  const [createRole,    setCreateRole]    = useState<Role>("USER");
  const [createError,   setCreateError]   = useState<string | null>(null);

  // Edit form state
  const [editDeptId, setEditDeptId] = useState("");
  const [editRole,   setEditRole]   = useState<Role>("USER");
  const [editError,  setEditError]  = useState<string | null>(null);

  const LIMIT = 10;

  const fetchUsers = useCallback(async (pg = page) => {
    setLoading(true); setError(null);
    try {
      const params: Record<string, any> = { page: pg, limit: LIMIT };
      if (search)                            params.keyword      = search;
      if (deptFilter  !== "all")             params.departmentId = deptFilter;
      if (statusFilter === "active")         params.isActive     = true;
      else if (statusFilter === "inactive")  params.isActive     = false;
      // data = User[] (interceptor đã tách items → data)
      // meta = { total, page, limit, totalPages }
      const { data, meta } = await usersApi.list(params);
      setUsers(data);
      setTotal((meta as Record<string,number>)?.total       ?? 0);
      setTotalPages((meta as Record<string,number>)?.totalPages ?? 1);
      setPage(pg);
    } catch (e) { setError(e instanceof ApiError ? e.message : "Tải danh sách thất bại"); }
    finally { setLoading(false); }
  }, [search, deptFilter, statusFilter, page]);

  const fetchDepts = useCallback(async () => {
    try {
      const { data } = await departmentsApi.list({ status: "active", limit: 100 });
      setDepts(data); // data = Department[] sau khi interceptor tách
    } catch {}
  }, []);

  useEffect(() => { fetchDepts(); }, [fetchDepts]);
  useEffect(() => { fetchUsers(1); }, [search, deptFilter, statusFilter]); // eslint-disable-line

  const toggleStatus = async (u: User) => {
    try {
      await usersApi.setStatus(u.id, !u.isActive);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, isActive: !x.isActive } : x));
    } catch (e) { alert(e instanceof ApiError ? e.message : "Lỗi"); }
  };

  const openEdit = (u: User) => {
    setEditUser(u); setEditDeptId(u.departmentId); setEditRole(u.role); setEditError(null);
  };

  const handleCreate = async () => {
    if (!createEmail || !createName || !createEmpId || !createDeptId) {
      setCreateError("Vui lòng điền đầy đủ thông tin"); return;
    }
    setSubmitting(true); setCreateError(null);
    try {
      await usersApi.create({ email: createEmail, fullName: createName, employeeId: createEmpId, departmentId: createDeptId, role: createRole });
      setFormOpen(false);
      setCreateEmail(""); setCreateName(""); setCreateEmpId(""); setCreateDeptId(""); setCreateRole("USER");
      fetchUsers(1);
    } catch (e) { setCreateError(e instanceof ApiError ? e.message : "Tạo tài khoản thất bại"); }
    finally { setSubmitting(false); }
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    setSubmitting(true); setEditError(null);
    try {
      await usersApi.update(editUser.id, { role: editRole, departmentId: editDeptId });
      setEditUser(null); fetchUsers(page);
    } catch (e) { setEditError(e instanceof ApiError ? e.message : "Cập nhật thất bại"); }
    finally { setSubmitting(false); }
  };

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
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="h-10 w-auto min-w-[140px] text-[13px]">
              <SelectValue placeholder="Phòng ban" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phòng ban</SelectItem>
              {depts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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
        <Button onClick={() => { setFormOpen(true); setCreateError(null); }} className="gap-2">
          <Plus size={16} /> Thêm tài khoản mới
        </Button>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-brand/5 border border-brand/20 text-sm text-brand">{error}</div>}

      {/* Table */}
      <div className="bg-white border border-line rounded-[10px] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-line bg-surface/60">
              <TableHead className="font-bold text-tx-dark text-[12px] uppercase tracking-wide">Họ tên</TableHead>
              <TableHead className="font-bold text-tx-dark text-[12px] uppercase tracking-wide">Email</TableHead>
              <TableHead className="font-bold text-tx-dark text-[12px] uppercase tracking-wide">Emp. ID</TableHead>
              <TableHead className="font-bold text-tx-dark text-[12px] uppercase tracking-wide">Phòng ban</TableHead>
              <TableHead className="font-bold text-tx-dark text-[12px] uppercase tracking-wide">Vai trò</TableHead>
              <TableHead className="font-bold text-tx-dark text-[12px] uppercase tracking-wide">Trạng thái</TableHead>
              <TableHead className="font-bold text-tx-dark text-[12px] uppercase tracking-wide">Ngày tạo</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-tx-muted">
                <Loader2 size={20} className="animate-spin inline-block mr-2" />Đang tải…
              </TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-tx-muted">Không có nhân sự nào</TableCell></TableRow>
            ) : users.map(u => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="avatar"
                        className="w-8 h-8 rounded-full flex-none object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex-none flex items-center justify-center text-white text-xs font-semibold"
                        style={{ background: getAvatarColor(u.id) }}>
                        {getInitials(u.fullName)}
                      </div>
                    )}
                    <span className="text-[14px] font-medium">{u.fullName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-[13px] text-tx-mid">{u.email}</TableCell>
                <TableCell className="font-mono text-[12px] text-tx-light">{u.employeeId}</TableCell>
                <TableCell className="text-[13px] text-tx-mid">{u.departmentName}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "ADMIN" ? "admin" : "user"} className="text-[11px]">{u.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={u.isActive ? "active" : "inactive"} className="text-[11px]">
                    <span className={cn("w-1.5 h-1.5 rounded-full flex-none", u.isActive ? "bg-ok" : "bg-tx-muted")} />
                    {u.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-[13px] text-tx-light">{formatDate(u.createdAt)}</TableCell>
                <TableCell className="text-right pr-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-surface transition-colors text-tx-muted hover:text-tx-dark">
                        <MoreVertical size={15} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => openEdit(u)}>
                        <Pencil size={13} className="text-tx-muted" /><span>Chỉnh sửa</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => toggleStatus(u)}>
                        {u.isActive
                          ? <><UserX size={13} className="text-warn" /><span className="text-warn">Vô hiệu hóa</span></>
                          : <><UserCheck size={13} className="text-ok" /><span className="text-ok">Kích hoạt</span></>}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-[18px] py-3.5 border-t border-line">
          <span className="text-[13px] text-tx-light">Hiển thị {users.length} / {total} nhân sự</span>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map(p => (
              <button key={p} onClick={() => fetchUsers(p)}
                className={cn("w-8 h-8 rounded-[6px] flex items-center justify-center text-[13px] transition-colors",
                  p === page ? "bg-brand text-white font-semibold" : "border border-line hover:bg-surface text-tx-dark")}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Add User Dialog ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-[460px]"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle>Thêm tài khoản mới</DialogTitle></DialogHeader>
          <div className="px-6 py-5 flex flex-col gap-4">
            {createError && <div className="p-3 rounded-lg bg-brand/5 border border-brand/20 text-sm text-brand">{createError}</div>}
            <div className="flex flex-col gap-1.5">
              <Label>Email <span className="text-brand">*</span></Label>
              <Input type="email" value={createEmail} onChange={e => setCreateEmail(e.target.value)} placeholder="ten@viettel.com.vn" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Họ và tên <span className="text-brand">*</span></Label>
                <Input value={createName} onChange={e => setCreateName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Employee ID <span className="text-brand">*</span></Label>
                <Input value={createEmpId} onChange={e => setCreateEmpId(e.target.value)} placeholder="VT-XXXXX" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Phòng ban <span className="text-brand">*</span></Label>
              <Select value={createDeptId} onValueChange={setCreateDeptId}>
                <SelectTrigger><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
                <SelectContent>{depts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Vai trò <span className="text-brand">*</span></Label>
              <RadioGroup value={createRole} onValueChange={v => setCreateRole(v as Role)} className="grid grid-cols-2 gap-3">
                {(["USER","ADMIN"] as const).map(r => (
                  <Label key={r} htmlFor={`cr-${r}`} className={cn("flex items-center gap-2.5 border rounded-[6px] px-3 py-2.5 cursor-pointer font-normal",
                    createRole === r ? "border-brand bg-brand/5" : "border-line")}>
                    <RadioGroupItem value={r} id={`cr-${r}`} />{r}
                  </Label>
                ))}
              </RadioGroup>
            </div>
            <div className="flex gap-2.5 items-start bg-surface rounded-[7px] px-3.5 py-3">
              <Info size={14} className="text-tx-muted flex-none mt-0.5" />
              <p className="text-xs text-tx-light leading-[1.55]">Mật khẩu ban đầu được sinh ngẫu nhiên và gửi tới email người dùng.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>Hủy</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
              Tạo tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit User Dialog ── */}
      <Dialog open={!!editUser} onOpenChange={open => { if (!open) setEditUser(null); }}>
        <DialogContent className="max-w-[460px]"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle>Chỉnh sửa tài khoản</DialogTitle></DialogHeader>
          {editUser && (
            <div className="px-6 py-5 flex flex-col gap-4">
              {editError && <div className="p-3 rounded-lg bg-brand/5 border border-brand/20 text-sm text-brand">{editError}</div>}
              <div className="flex flex-col gap-1.5">
                <Label className="text-tx-mid">Email <span className="text-tx-muted font-normal text-[11px]">(không thể thay đổi)</span></Label>
                <Input value={editUser.email} disabled className="bg-surface text-tx-light cursor-not-allowed" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-tx-mid">Họ và tên</Label>
                  <Input value={editUser.fullName} disabled className="bg-surface text-tx-light cursor-not-allowed" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-tx-mid">Employee ID</Label>
                  <Input value={editUser.employeeId} disabled className="bg-surface font-mono text-[12px] text-tx-light cursor-not-allowed" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Phòng ban <span className="text-brand">*</span></Label>
                <Select value={editDeptId} onValueChange={setEditDeptId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{depts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Vai trò <span className="text-brand">*</span></Label>
                <RadioGroup value={editRole} onValueChange={v => setEditRole(v as Role)} className="grid grid-cols-2 gap-3">
                  {(["USER","ADMIN"] as const).map(r => (
                    <Label key={r} htmlFor={`er-${r}`} className={cn("flex items-center gap-2.5 border rounded-[6px] px-3 py-2.5 cursor-pointer font-normal transition-colors",
                      editRole === r ? "border-brand bg-brand/5" : "border-line hover:bg-surface")}>
                      <RadioGroupItem value={r} id={`er-${r}`} />{r}
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} disabled={submitting}>Hủy</Button>
            <Button className="bg-brand hover:bg-brand/90" onClick={handleEditSave} disabled={submitting}>
              {submitting ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
