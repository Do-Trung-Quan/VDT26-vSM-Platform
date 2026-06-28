"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { meetingsApi } from "@/lib/api/meetings";
import { departmentsApi } from "@/lib/api/departments";
import type { MeetingListItem, Department } from "@/lib/types";

interface MeetingEditDialogProps {
  meeting: MeetingListItem | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MeetingEditDialog({ meeting, onOpenChange, onSuccess }: MeetingEditDialogProps) {
  const open = !!meeting;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (meeting) {
      setTitle(meeting.title);
      setDescription(meeting.description ?? "");
      setDepartmentId(meeting.departmentId);
      setError("");
    }
  }, [meeting]);

  const fetchDepts = useCallback(async () => {
    try {
      const { data } = await departmentsApi.list({ status: "active", limit: 100 });
      setDepartments(data ?? []);
    } catch {}
  }, []);

  useEffect(() => { fetchDepts(); }, [fetchDepts]);

  const handleSubmit = async () => {
    if (!meeting || !title.trim()) return;
    setLoading(true);
    setError("");
    try {
      await meetingsApi.updateInfo(meeting.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        departmentId: departmentId || undefined,
      });
      onSuccess();
      onOpenChange(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Cập nhật thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[480px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Sửa thông tin cuộc họp</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-title">
              Tiêu đề <span className="text-brand">*</span>
            </Label>
            <Input
              id="edit-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Tiêu đề cuộc họp"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Phòng ban</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
              <SelectContent>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-desc">
              Mô tả <span className="text-tx-muted font-normal">(tùy chọn)</span>
            </Label>
            <Textarea
              id="edit-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Mô tả cuộc họp…"
              rows={2}
            />
          </div>

          {error && <p className="text-[13px] text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={handleSubmit} disabled={loading || !title.trim()}>
            {loading ? "Đang lưu…" : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
