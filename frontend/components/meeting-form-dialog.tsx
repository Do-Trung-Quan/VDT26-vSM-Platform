"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Upload, Info } from "lucide-react";
import { meetingsApi } from "@/lib/api/meetings";
import { departmentsApi } from "@/lib/api/departments";
import { useAuth } from "@/lib/auth-context";
import type { Department } from "@/lib/types";

interface MeetingFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "live" | "upload";
  onSuccess?: () => void;
}

export function MeetingFormDialog({ open, onOpenChange, mode, onSuccess }: MeetingFormDialogProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState(user?.departmentId ?? "");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setTitle(""); setDescription(""); setAudioFile(null); setError("");
      setDepartmentId(user?.departmentId ?? "");
    }
  }, [open, user?.departmentId]);

  // Fetch unconditionally — catch xử lý 403 nếu non-admin call nhầm
  const fetchDepts = useCallback(async () => {
    try {
      const { data } = await departmentsApi.list({ status: "active", limit: 100 });
      setDepartments(data ?? []);
    } catch {}
  }, []);

  useEffect(() => { fetchDepts(); }, [fetchDepts]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError("");
    try {
      if (mode === "live") {
        const { data } = await meetingsApi.createLive({
          title: title.trim(),
          description: description.trim() || undefined,
          departmentId: isAdmin ? departmentId || undefined : undefined,
        });
        onOpenChange(false);
        router.push(`/live?meetingId=${data!.id}`);
      } else {
        if (!audioFile) { setError("Vui lòng chọn file audio"); setLoading(false); return; }
        const form = new FormData();
        form.append("title", title.trim());
        if (description.trim()) form.append("description", description.trim());
        if (isAdmin && departmentId) form.append("departmentId", departmentId);
        form.append("audio_file", audioFile);
        await meetingsApi.uploadAudio(form);
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Tạo cuộc họp thất bại");
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
          <DialogTitle>
            {mode === "live" ? "Tạo cuộc họp trực tuyến" : "Tải lên file audio"}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mtg-title">
              Tiêu đề cuộc họp <span className="text-brand">*</span>
            </Label>
            <Input
              id="mtg-title"
              placeholder="VD: Họp giao ban kỹ thuật tuần 26"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* Department — chỉ admin mới chọn được */}
          {isAdmin && (
            <div className="flex flex-col gap-1.5">
              <Label>Phòng ban <span className="text-brand">*</span></Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mtg-desc">
              Mô tả <span className="text-tx-muted font-normal">(tùy chọn)</span>
            </Label>
            <Textarea
              id="mtg-desc"
              placeholder="Nội dung chính, mục tiêu cuộc họp…"
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {mode === "upload" && (
            <div className="flex flex-col gap-1.5">
              <Label>File audio <span className="text-brand">*</span></Label>
              <label
                htmlFor="audio-file"
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-line rounded-lg py-7 cursor-pointer hover:border-brand hover:bg-brand/5 transition-colors"
              >
                <Upload size={22} className="text-tx-muted" />
                {audioFile
                  ? <span className="text-sm text-brand font-medium">{audioFile.name}</span>
                  : <>
                      <span className="text-sm text-tx-light font-medium">Kéo thả file vào đây hoặc <span className="text-brand">chọn file</span></span>
                      <span className="text-xs text-tx-muted">Hỗ trợ: MP3, WAV, M4A, OGG · Tối đa 500 MB</span>
                    </>
                }
                <input
                  id="audio-file"
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.wav,.m4a,.ogg"
                  className="hidden"
                  onChange={e => setAudioFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          )}

          <div className="flex gap-2.5 items-start bg-surface rounded-[7px] px-3.5 py-3">
            <Info size={15} className="text-tx-muted flex-none mt-0.5" />
            <p className="text-xs text-tx-light leading-[1.55]">
              {mode === "live"
                ? "Sau khi tạo, bạn sẽ được chuyển vào phòng họp. Quá trình ghi âm và tạo transcript diễn ra thời gian thực."
                : "File audio sẽ được xử lý tự động. Transcript và tóm tắt AI sẽ có sau vài phút tùy độ dài file."}
            </p>
          </div>

          {error && <p className="text-[13px] text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !title.trim() || (mode === "upload" && !audioFile)}
          >
            {loading
              ? "Đang xử lý…"
              : mode === "live" ? "Vào phòng họp" : "Tải lên & Xử lý"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
