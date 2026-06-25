"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle,
} from "@/components/ui/dialog";
import { Upload, Info } from "lucide-react";
import { DEPARTMENTS } from "@/lib/data";

interface MeetingFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "live" | "upload";
}

export function MeetingFormDialog({ open, onOpenChange, mode }: MeetingFormDialogProps) {
  const router = useRouter();
  const [role, setRole] = useState<"live"|"upload">(mode);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "live" ? "Tạo cuộc họp trực tuyến" : "Tải lên file audio"}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mtg-title">
              Tiêu đề cuộc họp <span className="text-brand">*</span>
            </Label>
            <Input id="mtg-title" placeholder="VD: Họp giao ban kỹ thuật tuần 26" />
          </div>

          {/* Department */}
          <div className="flex flex-col gap-1.5">
            <Label>Phòng ban <span className="text-brand">*</span></Label>
            <Select>
              <SelectTrigger><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.filter(d => !d.deleted).map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mtg-desc">
              Mô tả <span className="text-tx-muted font-normal">(tùy chọn)</span>
            </Label>
            <Textarea id="mtg-desc" placeholder="Nội dung chính, mục tiêu cuộc họp…" rows={2} />
          </div>

          {/* Upload-only fields */}
          {mode === "upload" && (
            <>
              {/* Datetime */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mtg-date">
                    Ngày họp <span className="text-brand">*</span>
                  </Label>
                  <Input id="mtg-date" type="date" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mtg-time">
                    Giờ bắt đầu <span className="text-brand">*</span>
                  </Label>
                  <Input id="mtg-time" type="time" />
                </div>
              </div>

              {/* File upload */}
              <div className="flex flex-col gap-1.5">
                <Label>File audio <span className="text-brand">*</span></Label>
                <label
                  htmlFor="audio-file"
                  className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-line rounded-lg py-7 cursor-pointer hover:border-brand hover:bg-brand/5 transition-colors"
                >
                  <Upload size={22} className="text-tx-muted" />
                  <span className="text-sm text-tx-light font-medium">Kéo thả file vào đây hoặc <span className="text-brand">chọn file</span></span>
                  <span className="text-xs text-tx-muted">Hỗ trợ: MP3, WAV, M4A, OGG · Tối đa 500 MB</span>
                  <input id="audio-file" type="file" accept=".mp3,.wav,.m4a,.ogg" className="hidden" />
                </label>
              </div>
            </>
          )}

          {/* Info note */}
          <div className="flex gap-2.5 items-start bg-surface rounded-[7px] px-3.5 py-3">
            <Info size={15} className="text-tx-muted flex-none mt-0.5" />
            <p className="text-xs text-tx-light leading-[1.55]">
              {mode === "live"
                ? "Sau khi tạo, bạn sẽ được chuyển vào phòng họp. Quá trình ghi âm và tạo transcript diễn ra thời gian thực."
                : "File audio sẽ được xử lý tự động. Transcript và tóm tắt AI sẽ có sau vài phút tùy độ dài file."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={() => {
            onOpenChange(false);
            if (mode === "live") {
              router.push("/live");
            }
          }}>
            {mode === "live" ? "Vào phòng họp" : "Tải lên & Xử lý"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
