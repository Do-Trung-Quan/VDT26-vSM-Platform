"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Lock, LockOpen, Pencil, FileText,
  Play, Pause, SkipBack, SkipForward, Sparkles, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Waveform } from "@/components/waveform";
import { MeetingEditDialog } from "@/components/meeting-edit-dialog";
import { useAuth } from "@/lib/auth-context";
import { meetingsApi } from "@/lib/api/meetings";
import type { MeetingDetail, TranscriptBlock, MeetingSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const SPEEDS = ["0.5x", "1x", "1.5x", "2x"] as const;

const SPEAKER_COLORS = ["#2D6CDF", "#2E9E5B", "#D6336C", "#8B5CF6", "#E8A23D", "#0EA5A5"];

export default function MeetingDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [transcript, setTranscript] = useState<TranscriptBlock[]>([]);
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const [activeSeq, setActiveSeq] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);

  const fetchAll = async () => {
    if (!params.id) return;
    setLoading(true);
    try {
      const [{ data: m }, { data: t }, { data: s }] = await Promise.all([
        meetingsApi.getDetail(params.id),
        meetingsApi.getTranscript(params.id),
        meetingsApi.getSummary(params.id).catch(() => ({ data: null, meta: null })),
      ]);
      setMeeting(m ?? null);
      setTranscript(t ?? []);
      setSummary(s ?? null);
    } catch {
      router.push("/meetings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [params.id]);

  const handleToggleLock = async () => {
    if (!meeting) return;
    await meetingsApi.setLocked(meeting.id, !meeting.isLocked);
    fetchAll();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#F5F6F8] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand" />
      </div>
    );
  }

  if (!meeting) return null;

  const summaryStatus = summary?.status ?? "NOT_STARTED";

  // Map speaker labels → color index (stable per label)
  const speakerColorMap = new Map<string, string>();
  transcript.forEach(b => {
    if (!speakerColorMap.has(b.speakerLabel)) {
      speakerColorMap.set(b.speakerLabel, SPEAKER_COLORS[speakerColorMap.size % SPEAKER_COLORS.length]);
    }
  });

  const formatDuration = (secs: number | null) => {
    if (!secs) return "--:--";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 bg-[#F5F6F8] flex flex-col">
      {/* Top bar */}
      <div className="flex-none h-[60px] bg-white border-b border-line flex items-center justify-between px-6">
        <button
          onClick={() => router.push("/meetings")}
          className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-[7px] -ml-3 hover:bg-surface transition-colors">
          <ArrowLeft size={18} />
          <span className="text-[14px] font-semibold">Quay lại danh sách</span>
        </button>
        <span className="text-[15px] font-semibold text-tx-mid">Biên bản cuộc họp</span>
      </div>

      {/* 3-column body */}
      <div className="flex-1 grid min-h-0" style={{ gridTemplateColumns: "300px 1fr 280px" }}>

        {/* LEFT — AI Summary */}
        <div className="border-r border-line bg-white overflow-y-auto pb-[130px] px-5 py-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-[30px] h-[30px] rounded-[8px] bg-gradient-to-br from-violet to-info flex items-center justify-center">
              <Sparkles size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[14px] font-bold">Tóm tắt AI</p>
              {summaryStatus === "COMPLETED"
                ? <p className="text-[11px] text-ok flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-ok inline-block" />Đã hoàn tất</p>
                : summaryStatus === "PROCESSING"
                ? <p className="text-[11px] text-tx-muted flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-tx-muted inline-block animate-pulse" />Đang tóm tắt…</p>
                : <p className="text-[11px] text-tx-muted">Chưa có tóm tắt</p>
              }
            </div>
          </div>

          {summaryStatus === "PROCESSING" ? (
            <div className="flex flex-col gap-2.5">
              {[100, 90, 100, 75, 85].map((w, i) => (
                <Skeleton key={i} className="h-3 rounded" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : summaryStatus === "COMPLETED" && summary?.summaryText ? (
            <p className="text-[13px] leading-[1.7] text-[#2A3445] whitespace-pre-line">{summary.summaryText}</p>
          ) : (
            <p className="text-[13px] text-tx-muted">Tóm tắt sẽ có sau khi transcript hoàn tất.</p>
          )}
        </div>

        {/* MIDDLE — Transcript */}
        <div className="overflow-y-auto pb-[130px]">
          <div className="max-w-[680px] mx-auto px-5 pt-6">
            {transcript.length === 0 ? (
              <p className="text-[13px] text-tx-muted text-center mt-16">
                Transcript chưa có — đang chờ xử lý audio.
              </p>
            ) : (
              <>
                <p className="text-[12px] text-tx-muted mb-5">
                  Nhấn vào một đoạn để phát audio từ đúng mốc thời gian tương ứng
                </p>
                {transcript.map(b => {
                  const color = speakerColorMap.get(b.speakerLabel) ?? SPEAKER_COLORS[0];
                  const active = activeSeq === b.sequenceNumber;
                  return (
                    <div key={b.id}
                      onClick={() => { setActiveSeq(b.sequenceNumber); setPlaying(true); }}
                      className={cn(
                        "flex gap-3.5 px-3.5 py-3 rounded-[8px] mb-1.5 cursor-pointer transition-colors border-l-[3px]",
                        active ? "bg-brand/[0.05] border-brand" : "border-transparent hover:bg-[#FAFBFC]",
                      )}>
                      <div className="w-8 h-8 rounded-full flex-none flex items-center justify-center text-white text-[13px] font-semibold"
                        style={{ background: color }}>
                        {b.sequenceNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1">
                          <span className="text-[13px] font-semibold" style={{ color }}>{b.speakerLabel}</span>
                          <span className="text-[11px] text-tx-muted font-mono">
                            {Math.floor(b.startTime / 60)}:{String(Math.floor(b.startTime % 60)).padStart(2, "0")}
                          </span>
                        </div>
                        <p className="text-[14px] leading-[1.55] text-[#2A3445]">{b.text}</p>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* RIGHT — Meeting info */}
        <div className="border-l border-line bg-white overflow-y-auto pb-[130px] px-5 py-5">
          <h2 className="text-[16px] font-bold leading-[1.4]">{meeting.title}</h2>
          <div className="flex gap-2 flex-wrap mt-3.5 mb-5">
            <Badge variant={meeting.status === "LIVE" ? "live" : meeting.status === "PROCESSING" ? "processing" : "completed"} className="text-[11px]">
              <span className={cn("w-1.5 h-1.5 rounded-full flex-none",
                meeting.status === "LIVE" ? "bg-brand animate-blink" : meeting.status === "PROCESSING" ? "bg-warn" : "bg-ok"
              )} />
              {meeting.status}
            </Badge>
            <Badge variant="outline" className="text-[11px]">{meeting.type}</Badge>
          </div>

          <div className="flex flex-col gap-4 py-4 border-t border-b border-[#F0F2F5]">
            <div className="flex items-center gap-3">
              <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-brand to-brand-dark text-white flex items-center justify-center font-semibold text-[12px] flex-none">
                {meeting.hostName.split(" ").slice(-1)[0]?.[0] ?? "?"}
              </div>
              <div>
                <p className="text-[11px] text-tx-muted">Host</p>
                <p className="text-[13px] font-semibold">{meeting.hostName}</p>
              </div>
            </div>
            <div>
              <p className="text-[11px] text-tx-muted mb-0.5">Phòng ban</p>
              <p className="text-[13px] font-medium">{meeting.departmentName}</p>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-[11px] text-tx-muted mb-0.5">Bắt đầu</p>
                <p className="text-[13px] font-medium">
                  {meeting.startedAt
                    ? new Date(meeting.startedAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-tx-muted mb-0.5">Kết thúc</p>
                <p className="text-[13px] font-medium">
                  {meeting.endedAt
                    ? new Date(meeting.endedAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </p>
              </div>
            </div>
            {meeting.durationSeconds !== null && (
              <div>
                <p className="text-[11px] text-tx-muted mb-0.5">Thời lượng</p>
                <p className="text-[13px] font-medium">{formatDuration(meeting.durationSeconds)}</p>
              </div>
            )}
            <div>
              <p className="text-[11px] text-tx-muted mb-1">Trạng thái biên bản</p>
              <div className="flex items-center gap-1.5 text-[13px] font-medium text-tx-dim">
                {meeting.isLocked
                  ? <><Lock size={13} /> Đã khóa</>
                  : <><LockOpen size={13} /> Chưa khóa</>}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 mt-4">
            <Button className="w-full gap-2" disabled>
              <FileText size={15} /> Xuất PDF
            </Button>
            {isAdmin && (
              <>
                {meeting.status === "COMPLETED" && (
                  <Button variant="outline" className="w-full gap-2" onClick={handleToggleLock}>
                    {meeting.isLocked
                      ? <><LockOpen size={15} /> Mở khóa biên bản</>
                      : <><Lock size={15} /> Khóa biên bản</>}
                  </Button>
                )}
                <Button variant="outline" className="w-full gap-2" onClick={() => setEditOpen(true)}>
                  <Pencil size={15} /> Sửa thông tin
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating audio player */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-5 w-[calc(100%-48px)] max-w-[900px] bg-white border border-line rounded-[14px] shadow-[0_12px_40px_rgba(26,35,50,.18)] px-5 py-3.5 flex items-center gap-4">
        <div className="flex items-center gap-2.5 flex-none">
          <button className="w-9 h-9 border border-line rounded-full flex items-center justify-center hover:bg-surface transition-colors">
            <SkipBack size={15} className="text-tx-dim fill-tx-dim" />
          </button>
          <button
            onClick={() => setPlaying(p => !p)}
            className="w-[46px] h-[46px] rounded-full bg-brand flex items-center justify-center hover:bg-brand-dark transition-colors">
            {playing
              ? <Pause size={16} className="text-white fill-white" />
              : <Play  size={16} className="text-white fill-white" />
            }
          </button>
          <button className="w-9 h-9 border border-line rounded-full flex items-center justify-center hover:bg-surface transition-colors">
            <SkipForward size={15} className="text-tx-dim fill-tx-dim" />
          </button>
        </div>

        <span className="text-[12px] text-tx-light font-mono flex-none">00:00</span>

        <div className="flex-1 h-10">
          <Waveform active={false} playedRatio={0} />
        </div>

        <span className="text-[12px] text-tx-light font-mono flex-none">
          {formatDuration(meeting.durationSeconds)}
        </span>

        <button
          onClick={() => setSpeedIdx(i => (i + 1) % SPEEDS.length)}
          className="flex-none border border-line rounded-[7px] px-3 py-1.5 text-[13px] font-semibold text-tx-mid hover:border-line-dark hover:bg-surface transition-colors min-w-[48px] text-center">
          {SPEEDS[speedIdx]}
        </button>
      </div>

      <MeetingEditDialog
        meeting={editOpen ? meeting : null}
        onOpenChange={open => setEditOpen(open)}
        onSuccess={fetchAll}
      />
    </div>
  );
}
