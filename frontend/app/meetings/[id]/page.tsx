"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Lock, LockOpen, Pencil, FileText,
  Play, Pause, SkipBack, SkipForward, Sparkles, Loader2, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from "@/components/ui/popover";
import { Waveform } from "@/components/waveform";
import { MeetingEditDialog } from "@/components/meeting-edit-dialog";
import { useAuth } from "@/lib/auth-context";
import { meetingsApi } from "@/lib/api/meetings";
import { downloadBlob } from "@/lib/api";
import type { MeetingDetail, TranscriptBlock, MeetingSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
type Speed = (typeof SPEEDS)[number];

const SPEAKER_COLORS = [
  "#EE0033", "#2D6CDF", "#2E9E5B", "#8B5CF6",
  "#E8A23D", "#0EA5A5", "#D6336C", "#64748B",
];

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDuration(secs: number | null): string {
  if (!secs) return "--:--";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${hh}:${mm}  ${dd}/${mo}/${yyyy}`;
}

/** Lấy 2 ký tự đầu của 2 từ cuối (bao gồm cả số) */
function getInitials(label: string): string {
  const words = label.split(/\s+/);
  if (words.length === 0) return "?";
  if (words.length === 1) return (words[0][0] ?? "?").toUpperCase();
  const last2 = words.slice(-2);
  return ((last2[0][0] ?? "") + (last2[1][0] ?? "")).toUpperCase();
}

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
  const [imgError, setImgError] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Audio player
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTimeSecs, setCurrentTimeSecs] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [speed, setSpeed] = useState<Speed>(1);
  const [waveformBars, setWaveformBars] = useState<number[] | undefined>(undefined);

  // Sync playback rate
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = speed;
  }, [speed]);

  // Drive play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !meeting?.audioUrl) return;
    if (playing) {
      audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [playing, meeting?.audioUrl]);

  // Generate real waveform from audio file
  useEffect(() => {
    if (!meeting?.audioUrl) return;
    let cancelled = false;

    (async () => {
      try {
        const ctx = new window.AudioContext();
        const resp = await fetch(meeting.audioUrl!);
        if (!resp.ok || cancelled) { await ctx.close(); return; }
        const arrayBuffer = await resp.arrayBuffer();
        if (cancelled) { await ctx.close(); return; }
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        await ctx.close();
        if (cancelled) return;

        const data = decoded.getChannelData(0);
        const numBars = 56;
        const block = Math.floor(data.length / numBars);
        const bars: number[] = [];
        for (let i = 0; i < numBars; i++) {
          let sum = 0;
          for (let j = 0; j < block; j++) sum += Math.abs(data[i * block + j]);
          bars.push(sum / block);
        }
        const max = Math.max(...bars, 0.001);
        setWaveformBars(bars.map(v => Math.max(0.08, Math.pow(v / max, 0.5))));
      } catch {
        // Keep undefined → Waveform sẽ dùng WAVE_BARS mặc định
      }
    })();

    return () => { cancelled = true; };
  }, [meeting?.audioUrl]);

  const fetchAll = async (silent = false) => {
    if (!params.id) return;
    if (!silent) setLoading(true);
    try {
      const [{ data: m }, { data: t }, { data: s }] = await Promise.all([
        meetingsApi.getDetail(params.id),
        meetingsApi.getTranscript(params.id),
        meetingsApi.getSummary(params.id).catch(() => ({ data: null, meta: null })),
      ]);
      setMeeting(m ?? null);
      setTranscript(t ?? []);
      setSummary(s ?? null);
      // Auto-trigger AI summary cho meeting COMPLETED chưa có tóm tắt
      if (m?.status === "COMPLETED" && (!s || s.status === "NOT_STARTED")) {
        meetingsApi.triggerSummary(m.id).catch(() => {});
        setSummary({ status: "PROCESSING", summaryText: "" } as any);
      }
    } catch {
      router.push("/meetings");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { fetchAll(false); }, [params.id]);

  // Poll summary mỗi 3s khi đang PROCESSING
  useEffect(() => {
    if (summary?.status !== "PROCESSING") return;
    const interval = setInterval(async () => {
      const { data: s } = await meetingsApi.getSummary(params.id)
        .catch(() => ({ data: null, meta: null }));
      if (s) setSummary(s);
    }, 3000);
    return () => clearInterval(interval);
  }, [summary?.status, params.id]);

  const handleToggleLock = async () => {
    if (!meeting) return;
    await meetingsApi.setLocked(meeting.id, !meeting.isLocked);
    fetchAll(true);
  };

  const handleExportPdf = async () => {
    if (!meeting) return;
    setPdfLoading(true);
    try {
      await downloadBlob(
        `/meetings/${meeting.id}/export/pdf`,
        `bien-ban-${meeting.title.replace(/\s+/g, "-")}.pdf`,
      );
    } catch { /* ignore */ } finally {
      setPdfLoading(false);
    }
  };

  // Build stable speaker map
  const speakerMap = new Map<string, { color: string; num: number }>();
  transcript.forEach(b => {
    if (!speakerMap.has(b.speakerLabel)) {
      const idx = speakerMap.size;
      speakerMap.set(b.speakerLabel, {
        color: SPEAKER_COLORS[idx % SPEAKER_COLORS.length],
        num: idx + 1,
      });
    }
  });

  const enriched = transcript.map((b, i) => ({
    ...b,
    isContinuation: i > 0 && transcript[i - 1].speakerLabel === b.speakerLabel,
    isNextContinuation: i + 1 < transcript.length && transcript[i + 1].speakerLabel === b.speakerLabel,
  }));

  const playedRatio = audioDuration > 0 ? currentTimeSecs / audioDuration : 0;

  // Tự động cuộn khối đang phát (highlight) vào chính giữa khung nhìn
  const activeBlock = enriched.find(
    b => currentTimeSecs >= b.startTime && currentTimeSecs < b.endTime
  );
  const activeBlockId = activeBlock?.id;

  useEffect(() => {
    if (!activeBlockId || !playing) return;
    const el = document.getElementById(`block-${activeBlockId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeBlockId, playing]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#F5F6F8] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand" />
      </div>
    );
  }

  if (!meeting) return null;

  const summaryStatus = summary?.status ?? "NOT_STARTED";

  return (
    <div className="fixed inset-0 bg-[#F5F6F8] flex flex-col">
      {/* Hidden audio element */}
      {meeting.audioUrl && (
        <audio
          ref={audioRef}
          src={meeting.audioUrl}
          preload="metadata"
          onTimeUpdate={() => setCurrentTimeSecs(audioRef.current?.currentTime ?? 0)}
          onLoadedMetadata={() => setAudioDuration(audioRef.current?.duration ?? 0)}
          onEnded={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
      )}

      {/* Top bar — nền navy đồng bộ sidebar */}
      <div className="flex-none h-[60px] bg-navy flex items-center justify-between px-6">
        <button
          onClick={() => router.push("/meetings")}
          className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-[7px] -ml-3 hover:bg-white/10 transition-colors text-white w-[180px] text-left flex-none">
          <ArrowLeft size={18} className="text-white" />
          <span className="text-[14px] font-semibold text-white">Quay lại danh sách</span>
        </button>
        <span className="text-[15px] font-semibold text-white truncate max-w-[500px] text-center flex-1">
          {meeting.title}
        </span>
        <span className="text-[15px] font-semibold text-white/80 w-[180px] text-right flex-none">
          Biên bản cuộc họp
        </span>
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
            {enriched.length === 0 ? (
              <p className="text-[13px] text-tx-muted text-center mt-16">
                Transcript chưa có — đang chờ xử lý audio.
              </p>
            ) : (
              <>
                {enriched.map(b => {
                  const speaker = speakerMap.get(b.speakerLabel) ?? { color: SPEAKER_COLORS[0], num: 1 };
                  const isActive = audioRef.current
                    ? currentTimeSecs >= b.startTime && currentTimeSecs < b.endTime
                    : false;

                  const handleSeek = () => {
                    const audio = audioRef.current;
                    if (!audio || !meeting.audioUrl) return;
                    audio.currentTime = b.startTime;
                    setCurrentTimeSecs(b.startTime);
                    setPlaying(true);
                  };

                  return (
                    <div
                      key={b.id}
                      id={`block-${b.id}`}
                      onClick={handleSeek}
                      className={cn(
                        "flex gap-3.5 animate-fade-up cursor-pointer",
                        b.isNextContinuation ? "mb-2" : "mb-6",
                      )}
                    >
                      {/* Avatar */}
                      <div className="w-9 flex-none">
                        {!b.isContinuation && (
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold"
                            style={{ background: speaker.color }}
                          >
                            {getInitials(b.speakerLabel)}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {!b.isContinuation && (
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <span
                              className="text-[13px] font-semibold border-b border-dashed border-current pb-px"
                              style={{ color: speaker.color }}
                            >
                              {b.speakerLabel}
                            </span>
                            <span className="text-[11px] text-tx-muted font-mono">{formatTime(b.startTime)}</span>
                          </div>
                        )}
                        {b.isContinuation && (
                          <span className="text-[11px] text-tx-muted font-mono block mb-1">{formatTime(b.startTime)}</span>
                        )}
                        <p className={cn(
                          "text-[14px] leading-[1.6] text-[#2A3445] pl-2 pr-3 py-2 rounded-[8px] transition-colors -ml-[11px]",
                          isActive ? "bg-brand/[0.06] border-l-[3px] border-brand" : "border-l-[3px] border-transparent hover:bg-[#FAFBFC]",
                        )}>
                          {b.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* RIGHT — Meeting info */}
        <div className="border-l border-line bg-white overflow-y-auto pb-[130px] px-5 py-5 no-scrollbar">
          {/* Tiêu đề tự xuống dòng */}
          <h2 className="text-[16px] font-bold leading-[1.4] break-words">{meeting.title}</h2>
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
            {/* Host avatar — ảnh từ DB, fallback initials */}
            <div className="flex items-center gap-3">
              {meeting.hostAvatarUrl && !imgError ? (
                <img
                  src={meeting.hostAvatarUrl}
                  alt={meeting.hostName}
                  className="w-[34px] h-[34px] rounded-full object-cover flex-none"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div
                  className="w-[34px] h-[34px] rounded-full text-white flex items-center justify-center font-semibold text-[13px] flex-none"
                  style={{ background: "#EE0033" }}
                >
                  {getInitials(meeting.hostName)}
                </div>
              )}
              <div>
                <p className="text-[11px] text-tx-muted">Host</p>
                <p className="text-[13px] font-semibold">{meeting.hostName}</p>
              </div>
            </div>

            <div>
              <p className="text-[11px] text-tx-muted mb-0.5">Phòng ban</p>
              <p className="text-[13px] font-medium">{meeting.departmentName}</p>
            </div>

            {/* Bắt đầu / Kết thúc — format HH:MM dd/mm/yyyy, cách xa nhau */}
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-[11px] text-tx-muted mb-0.5">Bắt đầu</p>
                <p className="text-[13px] font-medium">
                  {meeting.type === "LIVE"
                    ? (meeting.createdAt ? formatDateTime(meeting.createdAt) : "—")
                    : (meeting.startedAt ? formatDateTime(meeting.startedAt) : "—")}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-tx-muted mb-0.5">Kết thúc</p>
                <p className="text-[13px] font-medium">
                  {meeting.endedAt ? formatDateTime(meeting.endedAt) : "—"}
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

          {/* 3 nút — đậm màu */}
          <div className="flex flex-col gap-2.5 mt-4">
            <Button
              className="w-full gap-2"
              disabled={pdfLoading || meeting.status !== "COMPLETED"}
              onClick={handleExportPdf}
            >
              {pdfLoading
                ? <><Loader2 size={15} className="animate-spin" /> Đang xuất…</>
                : <><FileText size={15} /> Xuất PDF</>
              }
            </Button>
            {isAdmin && (
              <>
                {meeting.status === "COMPLETED" && (
                  <Button
                    className="w-full gap-2 bg-[#1A2332] hover:bg-[#0F1929] text-white border-0"
                    onClick={handleToggleLock}
                  >
                    {meeting.isLocked
                      ? <><LockOpen size={15} /> Mở khóa biên bản</>
                      : <><Lock size={15} /> Khóa biên bản</>}
                  </Button>
                )}
                <Button
                  className="w-full gap-2 bg-[#1A2332] hover:bg-[#0F1929] text-white border-0"
                  onClick={() => setEditOpen(true)}
                >
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
          <button
            onClick={() => {
              const audio = audioRef.current;
              if (audio) audio.currentTime = Math.max(0, audio.currentTime - 10);
            }}
            className="w-9 h-9 border border-line rounded-full flex items-center justify-center hover:bg-surface transition-colors"
          >
            <SkipBack size={15} className="text-tx-dim fill-tx-dim" />
          </button>
          <button
            onClick={() => setPlaying(p => !p)}
            disabled={!meeting.audioUrl}
            className="w-[46px] h-[46px] rounded-full bg-brand flex items-center justify-center hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {playing
              ? <Pause size={16} className="text-white fill-white" />
              : <Play size={16} className="text-white fill-white" />
            }
          </button>
          <button
            onClick={() => {
              const audio = audioRef.current;
              if (audio) audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
            }}
            className="w-9 h-9 border border-line rounded-full flex items-center justify-center hover:bg-surface transition-colors"
          >
            <SkipForward size={15} className="text-tx-dim fill-tx-dim" />
          </button>
        </div>

        <span className="text-[12px] text-tx-light font-mono flex-none">
          {formatTime(currentTimeSecs)}
        </span>

        {/* Waveform clickable */}
        <div
          className="flex-1 h-10 cursor-pointer"
          onClick={e => {
            const audio = audioRef.current;
            if (!audio || !audioDuration) return;
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            audio.currentTime = ratio * audioDuration;
          }}
        >
          <Waveform active={false} playedRatio={playedRatio} bars={waveformBars} />
        </div>

        <span className="text-[12px] text-tx-light font-mono flex-none">
          {formatTime(audioDuration || meeting.durationSeconds || 0)}
        </span>

        {/* Speed dropup */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex-none border border-line rounded-[7px] px-2.5 py-1.5 text-[13px] font-semibold text-tx-mid hover:border-line-dark hover:bg-surface transition-colors min-w-[56px] flex items-center justify-center gap-1">
              {speed}x <ChevronUp size={11} className="opacity-60" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="w-20 p-1">
            {SPEEDS.map(s => (
              <PopoverClose key={s} asChild>
                <button
                  onClick={() => setSpeed(s)}
                  className={cn(
                    "w-full text-center px-2 py-1.5 text-[13px] rounded-[6px] hover:bg-brand/5 transition-colors",
                    speed === s && "bg-brand/10 text-brand font-semibold",
                  )}
                >
                  {s}x
                </button>
              </PopoverClose>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      <MeetingEditDialog
        meeting={editOpen ? meeting : null}
        onOpenChange={open => setEditOpen(open)}
        onSuccess={() => fetchAll(true)}
      />
    </div>
  );
}
