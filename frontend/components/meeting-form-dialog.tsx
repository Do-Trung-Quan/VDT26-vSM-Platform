"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from "@/components/ui/popover";
import { Upload, Info, CheckCircle2, Loader2 } from "lucide-react";
import { meetingsApi } from "@/lib/api/meetings";
import { departmentsApi } from "@/lib/api/departments";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import type { Department } from "@/lib/types";

interface MeetingFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "live" | "upload";
  onSuccess?: () => void;
}

const MAX_FILE_BYTES = 200 * 1024 * 1024; // 200 MB
const ALLOWED_EXTS  = [".mp3", ".wav"];

// Scroll picker cho giờ/phút
function ScrollPicker({ value, options, onChange }: {
  value: number;
  options: number[];
  onChange: (v: number) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-9 w-14 border border-line rounded-[7px] text-[13px] font-medium text-center hover:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white transition-colors"
        >
          {String(value).padStart(2, "0")}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-14 p-0" align="center">
        <div className="overflow-y-auto max-h-[160px] py-1">
          {options.map(opt => (
            <PopoverClose key={opt} asChild>
              <button
                type="button"
                onClick={() => onChange(opt)}
                className={cn(
                  "w-full text-center px-2 py-[7px] text-[13px] hover:bg-brand/5 transition-colors",
                  value === opt && "bg-brand/10 text-brand font-semibold",
                )}
              >
                {String(opt).padStart(2, "0")}
              </button>
            </PopoverClose>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const HOURS   = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

type UploadPhase = "idle" | "init" | "uploading" | "completing" | "done";

const PHASE_LABEL: Record<UploadPhase, string> = {
  idle:       "Tải lên & Xử lý",
  init:       "Đang khởi tạo…",
  uploading:  "Đang tải lên…",
  completing: "Đang hoàn thiện…",
  done:       "Hoàn thành",
};

export function MeetingFormDialog({ open, onOpenChange, mode, onSuccess }: MeetingFormDialogProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState(user?.departmentId ?? "");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Date/time pickers
  const [startedDate, setStartedDate] = useState(() => new Date().toLocaleDateString("sv"));
  const [startedHour, setStartedHour] = useState(new Date().getHours());
  const [startedMinute, setStartedMinute] = useState(0);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);

  // Upload progress state
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [uploadPercent, setUploadPercent] = useState(0);

  const resetForm = useCallback(() => {
    setTitle(""); setDescription(""); setAudioFile(null); setFileError(""); setError("");
    setDepartmentId(user?.departmentId ?? "");
    const now = new Date();
    setStartedDate(now.toLocaleDateString("sv"));
    setStartedHour(now.getHours());
    setStartedMinute(0);
    setAudioDuration(null);
    setUploadPhase("idle");
    setUploadPercent(0);
  }, [user?.departmentId]);

  useEffect(() => {
    if (!open) {
      // Abort any in-flight upload
      xhrRef.current?.abort();
      resetForm();
    }
  }, [open, resetForm]);

  const fetchDepts = useCallback(async () => {
    try {
      const { data } = await departmentsApi.list({ status: "active", limit: 100 });
      setDepartments(data ?? []);
    } catch {}
  }, []);

  useEffect(() => { fetchDepts(); }, [fetchDepts]);

  const handleFileChange = (file: File | null) => {
    setFileError("");
    if (!file) { setAudioFile(null); setAudioDuration(null); return; }

    // Frontend validation
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
    if (!ALLOWED_EXTS.includes(ext)) {
      setFileError("Chỉ chấp nhận file MP3 hoặc WAV");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError("File không được vượt quá 200 MB");
      return;
    }

    setAudioFile(file);
    setAudioDuration(null);
    const objUrl = URL.createObjectURL(file);
    const audio = new Audio(objUrl);
    audio.addEventListener("loadedmetadata", () => {
      setAudioDuration(isFinite(audio.duration) ? Math.round(audio.duration) : null);
      URL.revokeObjectURL(objUrl);
    });
    audio.addEventListener("error", () => URL.revokeObjectURL(objUrl));
  };

  // ended_at = startedAt + audioDuration
  const computedEndedAt = (() => {
    if (!startedDate || audioDuration === null) return null;
    const startMs = new Date(
      `${startedDate}T${String(startedHour).padStart(2, "0")}:${String(startedMinute).padStart(2, "0")}:00`,
    ).getTime();
    return new Date(startMs + audioDuration * 1000);
  })();

  /** Presigned URL upload (3 bước) */
  const handleUploadWithPresignedUrl = async (): Promise<void> => {
    if (!audioFile) return;

    let meetingId: string | null = null;
    try {
      // ── Bước 1: Khởi tạo meeting + lấy presigned URL ───────────────────────
      setUploadPhase("init");
      const startedAtIso = startedDate
        ? new Date(`${startedDate}T${String(startedHour).padStart(2, "0")}:${String(startedMinute).padStart(2, "0")}:00`).toISOString()
        : undefined;

      const { data: initData } = await meetingsApi.uploadAudioInit({
        title: title.trim(),
        description: description.trim() || undefined,
        departmentId: isAdmin ? departmentId || undefined : undefined,
        startedAt: startedAtIso,
        filename: audioFile.name,
        filesize: audioFile.size,
      });

      meetingId = initData!.meetingId;

      // ── Bước 2: PUT file trực tiếp lên MinIO qua presigned URL ─────────────
      setUploadPhase("uploading");
      setUploadPercent(0);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.addEventListener("progress", e => {
          if (e.lengthComputable) {
            setUploadPercent(Math.round((e.loaded / e.total) * 100));
          }
        });
        xhr.addEventListener("load", () => {
          // MinIO presigned PUT returns 200 on success
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadPercent(100);
            resolve();
          } else {
            reject(new Error(`MinIO trả về lỗi ${xhr.status}`));
          }
        });
        xhr.addEventListener("error",  () => reject(new Error("Lỗi kết nối khi tải lên")));
        xhr.addEventListener("abort",  () => reject(new Error("Upload đã bị hủy")));

        xhr.open("PUT", initData!.presignedUrl);
        xhr.setRequestHeader("Content-Type", audioFile.type || "audio/mpeg");
        xhr.send(audioFile);
      });

      // ── Bước 3: Thông báo backend kích hoạt BullMQ job ─────────────────────
      setUploadPhase("completing");
      await meetingsApi.uploadAudioComplete(meetingId!);

      setUploadPhase("done");
      setTimeout(() => {
        onOpenChange(false);
        onSuccess?.();
      }, 600);

    } catch (e: unknown) {
      // Dọn dẹp meeting record nếu upload thất bại sau bước init
      if (meetingId) {
        meetingsApi.softDelete(meetingId).catch(() => {});
      }
      throw e;
    }
  };

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
        if (fileError)  { setLoading(false); return; }
        await handleUploadWithPresignedUrl();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Tạo cuộc họp thất bại");
      setUploadPhase("idle");
      setUploadPercent(0);
    } finally {
      if (uploadPhase !== "uploading" && uploadPhase !== "completing") {
        setLoading(false);
      }
      setLoading(false);
    }
  };

  const isUploading = uploadPhase !== "idle" && uploadPhase !== "done";
  const submitDisabled = loading || !title.trim() || (mode === "upload" && (!audioFile || !!fileError)) || isUploading;

  return (
    <Dialog open={open} onOpenChange={v => { if (!isUploading) onOpenChange(v); }}>
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
              disabled={isUploading}
            />
          </div>

          {isAdmin && (
            <div className="flex flex-col gap-1.5">
              <Label>Phòng ban <span className="text-brand">*</span></Label>
              <Select value={departmentId} onValueChange={setDepartmentId} disabled={isUploading}>
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
              disabled={isUploading}
            />
          </div>

          {mode === "upload" && (
            <>
              {/* Thời gian bắt đầu */}
              <div className="flex flex-col gap-1.5">
                <Label>Thời gian bắt đầu cuộc họp</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startedDate}
                    onChange={e => setStartedDate(e.target.value)}
                    disabled={isUploading}
                    className="h-9 flex-1 border border-line rounded-[7px] px-3 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors disabled:opacity-50"
                  />
                  <ScrollPicker value={startedHour}   options={HOURS}   onChange={setStartedHour} />
                  <span className="text-[13px] text-tx-muted font-medium select-none">:</span>
                  <ScrollPicker value={startedMinute} options={MINUTES} onChange={setStartedMinute} />
                </div>
                {computedEndedAt && (
                  <p className="text-[12px] text-tx-muted">
                    Kết thúc dự kiến:&nbsp;
                    <span className="font-medium text-tx-mid">
                      {computedEndedAt.toLocaleString("vi-VN", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </p>
                )}
              </div>

              {/* File upload */}
              <div className="flex flex-col gap-1.5">
                <Label>File audio <span className="text-brand">*</span></Label>

                {/* Upload progress — hiện trong khi đang upload */}
                {uploadPhase !== "idle" ? (
                  <div className="border border-line rounded-lg px-4 py-4 flex flex-col gap-3 bg-surface/50">
                    {/* Phase icon + label */}
                    <div className="flex items-center gap-2.5">
                      {uploadPhase === "done"
                        ? <CheckCircle2 size={18} className="text-ok flex-none" />
                        : <Loader2 size={18} className="animate-spin text-brand flex-none" />
                      }
                      <span className="text-[13px] font-medium text-tx-dark">
                        {uploadPhase === "uploading"
                          ? `Đang tải lên… ${uploadPercent}%`
                          : PHASE_LABEL[uploadPhase]}
                      </span>
                      {audioFile && (
                        <span className="text-[12px] text-tx-muted ml-auto truncate max-w-[160px]">
                          {audioFile.name}
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    {uploadPhase === "uploading" && (
                      <div className="h-1.5 bg-line rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand rounded-full transition-all duration-200"
                          style={{ width: `${uploadPercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <label
                    htmlFor="audio-file"
                    className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-line rounded-lg py-7 cursor-pointer hover:border-brand hover:bg-brand/5 transition-colors"
                  >
                    <Upload size={22} className="text-tx-muted" />
                    {audioFile
                      ? <span className="text-sm text-brand font-medium">{audioFile.name}</span>
                      : <>
                          <span className="text-sm text-tx-light font-medium">
                            Kéo thả file vào đây hoặc <span className="text-brand">chọn file</span>
                          </span>
                          <span className="text-xs text-tx-muted">Hỗ trợ MP3, WAV · Tối đa 200 MB</span>
                        </>
                    }
                    <input
                      id="audio-file"
                      type="file"
                      accept=".mp3,.wav"
                      className="hidden"
                      onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
                    />
                  </label>
                )}

                {fileError && <p className="text-[12px] text-red-500">{fileError}</p>}
              </div>
            </>
          )}

          <div className="flex gap-2.5 items-start bg-surface rounded-[7px] px-3.5 py-3">
            <Info size={15} className="text-tx-muted flex-none mt-0.5" />
            <p className="text-xs text-tx-light leading-[1.55]">
              {mode === "live"
                ? "Sau khi tạo, bạn sẽ được chuyển vào phòng họp. Quá trình ghi âm và tạo transcript diễn ra thời gian thực."
                : "File audio sẽ được tải thẳng lên bộ nhớ an toàn. Transcript và tóm tắt AI sẽ có sau vài phút."}
            </p>
          </div>

          {error && <p className="text-[13px] text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={submitDisabled}>
            {loading || isUploading
              ? <><Loader2 size={14} className="animate-spin" /> {PHASE_LABEL[uploadPhase]}</>
              : mode === "live" ? "Vào phòng họp" : "Tải lên & Xử lý"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
