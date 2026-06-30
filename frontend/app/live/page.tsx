"use client";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Square, Pause, Play, Wifi, WifiOff, Clock, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Waveform } from "@/components/waveform";
import { meetingsApi } from "@/lib/api/meetings";
import { cn } from "@/lib/utils";
import { io, Socket } from "socket.io-client";

// ── Constants ─────────────────────────────────────────────────────────────────
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001";

const SPEAKER_COLORS = [
  "#EE0033", "#2D6CDF", "#2E9E5B", "#8B5CF6",
  "#E8A23D", "#0EA5A5", "#D6336C", "#64748B",
];

// ── Types ─────────────────────────────────────────────────────────────────────
type SessionState = "idle" | "recording" | "paused" | "ending" | "ended";
type ConnState    = "disconnected" | "connecting" | "connected" | "reconnecting" | "error";

interface LiveBlock {
  sequenceNumber: number;
  text:           string;
  speakerLabel:   string;   // label gốc từ server
  displayLabel:   string;   // có thể đã được user đổi tên
  startTime:      number;   // giây
  colorIndex:     number;   // index vào SPEAKER_COLORS, đồng thời là số hiển thị trong avatar
}

// ── Timers ────────────────────────────────────────────────────────────────────
/** Thời lượng cuộc họp — tính từ lúc vào phòng, KHÔNG dừng */
function useMeetingTimer() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Thời lượng audio — dừng khi paused */
function useAudioTimer(running: boolean) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Main component (needs Suspense for useSearchParams) ───────────────────────
function LivePageInner() {
  const router    = useRouter();
  const params    = useSearchParams();
  const meetingId = params.get("meetingId") ?? "";

  // ── State ──────────────────────────────────────────────────────────────────
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [connState, setConnState]       = useState<ConnState>("disconnected");
  const [blocks, setBlocks]             = useState<LiveBlock[]>([]);
  const [editingSeq, setEditingSeq]     = useState<number | null>(null);
  const [meetingTitle, setMeetingTitle] = useState("Cuộc họp trực tuyến");

  // ── Refs (không trigger re-render) ─────────────────────────────────────────
  const socketRef       = useRef<Socket | null>(null);
  const audioCtxRef     = useRef<AudioContext | null>(null);
  const streamRef       = useRef<MediaStream | null>(null);
  const processorRef    = useRef<ScriptProcessorNode | null>(null);
  const lastSeqRef      = useRef(0);
  const sessionStateRef = useRef<SessionState>("idle");
  const colorMapRef     = useRef<Map<string, number>>(new Map()); // label → colorIndex
  const labelOverrides  = useRef<Map<string, string>>(new Map()); // oldLabel → newLabel

  // Sync sessionState ref
  useEffect(() => { sessionStateRef.current = sessionState; }, [sessionState]);

  // Timers
  const meetingTimer = useMeetingTimer();
  const audioTimer   = useAudioTimer(sessionState === "recording");

  // Auto-scroll
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [blocks]);

  // ── Load meeting title ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!meetingId) return;
    meetingsApi.getDetail(meetingId)
      .then(({ data }) => { if (data?.title) setMeetingTitle(data.title); })
      .catch(() => {});
  }, [meetingId]);

  // ── Speaker color helpers ──────────────────────────────────────────────────
  const getColorIndex = useCallback((label: string): number => {
    if (!colorMapRef.current.has(label)) {
      colorMapRef.current.set(label, colorMapRef.current.size % SPEAKER_COLORS.length);
    }
    return colorMapRef.current.get(label)!;
  }, []);

  const addBlock = useCallback((raw: { sequenceNumber: number; text: string; speakerLabel: string; startTime: number; endTime: number }) => {
    const colorIndex   = getColorIndex(raw.speakerLabel);
    const displayLabel = labelOverrides.current.get(raw.speakerLabel) ?? raw.speakerLabel;
    lastSeqRef.current = Math.max(lastSeqRef.current, raw.sequenceNumber);
    setBlocks(prev => [...prev, { ...raw, displayLabel, colorIndex }]);
  }, [getColorIndex]);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    processorRef.current?.disconnect();
    audioCtxRef.current?.close().catch(() => {});
    streamRef.current?.getTracks().forEach(t => t.stop());
    socketRef.current?.disconnect();
    processorRef.current = null;
    audioCtxRef.current  = null;
    streamRef.current    = null;
    socketRef.current    = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  // ── Audio capture ──────────────────────────────────────────────────────────
  const startAudioCapture = useCallback(async (socket: Socket) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      // Force 48kHz để match AUDIO_BROWSER_SAMPLE_RATE trên backend
      const ctx = new AudioContext({ sampleRate: 48000 });
      audioCtxRef.current = ctx;

      const source    = ctx.createMediaStreamSource(stream);
      // ScriptProcessorNode: 4096 samples/buffer (~85ms ở 48kHz)
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (sessionStateRef.current !== "recording") return;
        const float32 = e.inputBuffer.getChannelData(0);
        // Convert Float32 → Int16 PCM (signed 16-bit little-endian)
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          int16[i] = Math.max(-32768, Math.min(32767, Math.round(float32[i] * 32767)));
        }
        socket.emit("audio_chunk", {
          meetingId,
          audio: Array.from(new Uint8Array(int16.buffer)),
        });
      };

      source.connect(processor);
      processor.connect(ctx.destination);
      setSessionState("recording");
    } catch {
      setConnState("error");
    }
  }, [meetingId]);

  // ── WebSocket connection ───────────────────────────────────────────────────
  const connectSocket = useCallback((isResume = false) => {
    if (!meetingId) return;
    const token = typeof window !== "undefined"
      ? (localStorage.getItem("access_token") ?? "")
      : "";
    if (!token) { router.replace("/login"); return; }

    setConnState("connecting");

    // Kết nối đến namespace /live (Socket.IO Gateway trên backend)
    const socket = io(`${WS_URL}/live`, {
      transports:   ["websocket"],
      reconnection: false,  // tự quản lý reconnect theo Core 3
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnState("connected");
      if (isResume) {
        socket.emit("resume", { meetingId, token, lastReceivedSequence: lastSeqRef.current });
      } else {
        socket.emit("open_session", { meetingId, token });
      }
    });

    // Server xác nhận phiên đã sẵn sàng → bắt đầu ghi âm
    socket.on("session_ready", () => {
      startAudioCapture(socket);
    });

    // Core 3: resume OK — server gửi lại các block bị miss
    socket.on("resume_ok", (data: { missedBlocks: Array<{ sequenceNumber: number; text: string; speakerLabel: string; startTime: number; endTime: number }>; vadReinitialized: boolean }) => {
      [...data.missedBlocks]
        .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
        .forEach(addBlock);
      // Tiếp tục ghi âm sau khi resume
      audioCtxRef.current?.resume().catch(() => {});
      setSessionState("recording");
    });

    // Nhận transcript block mới
    socket.on("transcript_update", addBlock);

    // Server báo session đã kết thúc → về danh sách meetings
    socket.on("session_ended", () => {
      cleanup();
      router.push("/meetings");
    });

    socket.on("error", (err: { message: string }) => {
      console.error("WS:", err.message);
      setConnState("error");
    });

    // Core 3: mất kết nối bất ngờ → thử reconnect sau 3s
    socket.on("disconnect", (reason) => {
      const state = sessionStateRef.current;
      if (state === "ending" || state === "ended") return;
      setConnState("reconnecting");
      setTimeout(() => {
        // Chỉ reconnect nếu socket này vẫn là socket hiện tại (tránh duplicate)
        if (socketRef.current === socket) {
          connectSocket(true);
        }
      }, 3000);
    });

    socket.on("connect_error", () => setConnState("error"));
  }, [meetingId, router, addBlock, startAudioCapture, cleanup]);

  // ── Session controls ───────────────────────────────────────────────────────
  const handleStart = useCallback(() => {
    connectSocket(false);
  }, [connectSocket]);

  const handlePause = () => {
    audioCtxRef.current?.suspend();
    setSessionState("paused");
  };

  const handleResume = () => {
    audioCtxRef.current?.resume();
    setSessionState("recording");
  };

  const handleEnd = () => {
    setSessionState("ending");
    socketRef.current?.emit("end_session", { meetingId });
    // Fallback: nếu 5s không nhận session_ended → tự redirect
    setTimeout(() => { cleanup(); router.push("/meetings"); }, 5000);
  };

  // ── Edit speaker label ─────────────────────────────────────────────────────
  const handleLabelSave = (seq: number, originalLabel: string, newLabel: string) => {
    const trimmed = newLabel.trim();
    if (!trimmed || trimmed === originalLabel) { setEditingSeq(null); return; }
    labelOverrides.current.set(originalLabel, trimmed);
    // Cập nhật tất cả block của cùng speaker
    setBlocks(prev =>
      prev.map(b => b.speakerLabel === originalLabel ? { ...b, displayLabel: trimmed } : b)
    );
    // Thông báo server để cập nhật diarization registry + DB
    socketRef.current?.emit("edit_speaker", {
      meetingId,
      fromSequence: seq,
      oldLabel:     originalLabel,
      newLabel:     trimmed,
    });
    setEditingSeq(null);
  };

  // ── Connection badge config ────────────────────────────────────────────────
  const CONN_CONFIG = {
    disconnected: { Icon: WifiOff, iconColor: "#EE0033", bg: "bg-brand/15 border-brand/35",          text: "text-red-300",     label: "Mất kết nối" },
    connecting:   { Icon: Wifi,    iconColor: "#E8A23D", bg: "bg-yellow-500/15 border-yellow-500/35", text: "text-yellow-300",  label: "Đang kết nối..." },
    connected:    { Icon: Wifi,    iconColor: "#3FBE74", bg: "bg-ok/15 border-ok/35",                 text: "text-[#8FDDAC]",   label: "Kết nối ổn định" },
    reconnecting: { Icon: WifiOff, iconColor: "#E8A23D", bg: "bg-yellow-500/15 border-yellow-500/35", text: "text-yellow-300",  label: "Đang kết nối lại..." },
    error:        { Icon: WifiOff, iconColor: "#EE0033", bg: "bg-brand/15 border-brand/35",           text: "text-red-300",     label: "Lỗi kết nối" },
  } as const;

  const { Icon: ConnIcon, iconColor, bg: connBg, text: connText, label: connLabel } = CONN_CONFIG[connState];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-[#F5F6F8] flex flex-col">

      {/* ── Header ── */}
      <div className="flex-none bg-navy text-white px-7 py-4 flex items-center justify-between gap-5">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex items-center gap-2 bg-brand/18 border border-brand/50 rounded-full px-3 py-1.5 flex-none">
            <span className="w-2 h-2 rounded-full bg-brand animate-blink" />
            <span className="text-xs font-bold tracking-[.5px]">LIVE</span>
          </div>
          <h1 className="text-[17px] font-semibold truncate">{meetingTitle}</h1>
        </div>

        <div className="flex items-center gap-5 flex-none">
          {/* Connection status — real WS state */}
          <div className={cn("flex items-center gap-2 border rounded-[7px] px-3 py-1.5", connBg)}>
            <ConnIcon size={15} style={{ color: iconColor }} />
            <span className={cn("text-[13px] font-medium", connText)}>{connLabel}</span>
          </div>

          {/* Meeting timer — không dừng được */}
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[#9BA3B4]" />
            <span className="text-[15px] font-semibold font-mono">{meetingTimer}</span>
          </div>
        </div>
      </div>

      {/* ── Transcript area ── */}
      <div className="flex-1 overflow-y-auto pb-[160px]">
        <div className="max-w-[820px] mx-auto px-6 pt-7">

          {/* Guidance banner — chỉ hiện khi chưa bắt đầu */}
          {sessionState === "idle" && (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4 select-none pointer-events-none">
              <Mic size={56} className="text-tx-muted opacity-20" />
              <p className="text-[17px] font-medium text-tx-muted opacity-40 text-center">
                Nhấn &ldquo;Bắt đầu ghi âm&rdquo; để khởi động phiên họp
              </p>
              <p className="text-[13px] text-tx-muted opacity-30 text-center max-w-[360px] leading-relaxed">
                Transcript sẽ xuất hiện tại đây theo thời gian thực<br />
                Bạn có thể chỉnh tên người nói bằng cách nhấn vào nhãn
              </p>
            </div>
          )}

          {/* Hint khi đang ghi nhưng chưa có transcript */}
          {sessionState !== "idle" && (
            <p className="text-center text-[12px] text-tx-muted mb-6">
              Transcript đang được tạo theo thời gian thực · nhấn vào tên người nói để sửa nhãn
            </p>
          )}

          {/* ── Transcript blocks ── */}
          {blocks.map((b, idx) => {
            const prev            = idx > 0 ? blocks[idx - 1] : null;
            const isContinuation  = prev?.speakerLabel === b.speakerLabel;
            const color           = SPEAKER_COLORS[b.colorIndex];
            const speakerNum      = b.colorIndex + 1;
            const isEditing       = editingSeq === b.sequenceNumber;

            return (
              <div
                key={b.sequenceNumber}
                className={cn("flex gap-3.5 animate-fade-up", isContinuation ? "mb-2" : "mb-6")}
              >
                {/* Avatar — chỉ hiện ở block đầu tiên của mỗi "run" cùng speaker */}
                <div className="w-9 flex-none">
                  {!isContinuation && (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold"
                      style={{ background: color }}
                    >
                      {speakerNum}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Speaker label — chỉ hiện ở block đầu tiên của run */}
                  {!isContinuation && (
                    <div className="flex items-center gap-2.5 mb-1.5">
                      {isEditing ? (
                        <input
                          autoFocus
                          defaultValue={b.displayLabel}
                          onBlur={e  => handleLabelSave(b.sequenceNumber, b.speakerLabel, e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                          className="text-[13px] font-semibold border-b-2 border-brand outline-none bg-transparent"
                          style={{ color }}
                        />
                      ) : (
                        <span
                          onClick={() => setEditingSeq(b.sequenceNumber)}
                          className="text-[13px] font-semibold cursor-pointer border-b border-dashed border-current pb-px"
                          style={{ color }}
                          title="Nhấn để sửa nhãn"
                        >
                          {b.displayLabel}
                        </span>
                      )}
                      {/* start_time luôn hiện */}
                      <span className="text-[11px] text-tx-muted font-mono">{formatTime(b.startTime)}</span>
                    </div>
                  )}

                  {/* Với block continuation: không hiện label nhưng vẫn hiện start_time */}
                  {isContinuation && (
                    <span className="text-[11px] text-tx-muted font-mono block mb-1">
                      {formatTime(b.startTime)}
                    </span>
                  )}

                  <p className="text-[15px] leading-[1.6] text-[#2A3445]">{b.text}</p>
                </div>
              </div>
            );
          })}

          {/* Listening indicator */}
          {sessionState === "recording" && (
            <div className="flex items-center gap-3 pl-[52px] mt-4">
              <span className="flex gap-1">
                {[0, 0.2, 0.4].map(d => (
                  <span key={d} className="w-1.5 h-1.5 rounded-full bg-line-dark animate-mpulse"
                    style={{ animationDelay: `${d}s` }} />
                ))}
              </span>
              <span className="text-[13px] text-tx-muted">Đang lắng nghe…</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Floating controls ── */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-6 w-[calc(100%-48px)] max-w-[880px] bg-white border border-line rounded-[14px] shadow-[0_12px_40px_rgba(26,35,50,.18)] px-5 py-4 flex items-center gap-5">

        {/* Audio timer — dừng khi paused */}
        <div className="flex-none text-center">
          <div className="text-[22px] font-bold font-mono text-navy">{audioTimer}</div>
          <div className="text-[10px] text-tx-muted uppercase tracking-[.5px] mt-0.5">Thời lượng ghi</div>
        </div>

        <div className="w-px h-10 bg-line flex-none" />

        {/* Waveform */}
        <div className="flex-1 h-12">
          <Waveform active={sessionState === "recording"} />
        </div>

        <div className="w-px h-10 bg-line flex-none" />

        {/* Controls */}
        <div className="flex items-center gap-3 flex-none">
          {sessionState === "idle" ? (
            /* Nút ban đầu — chính là nút "Kết thúc" ở trạng thái khởi đầu */
            <Button onClick={handleStart} className="gap-2 h-[50px] px-5 text-[14px] font-bold">
              <Mic size={14} /> Bắt đầu ghi âm
            </Button>
          ) : (
            <>
              {(sessionState === "recording" || sessionState === "paused") && (
                <button
                  onClick={sessionState === "recording" ? handlePause : handleResume}
                  className="w-[52px] h-[52px] rounded-full bg-navy flex items-center justify-center hover:bg-navy-mid transition-colors"
                >
                  {sessionState === "recording"
                    ? <Pause size={18} className="text-white fill-white" />
                    : <Play  size={18} className="text-white fill-white" />
                  }
                </button>
              )}
              <Button
                onClick={handleEnd}
                disabled={sessionState === "ending"}
                className="gap-2 h-[50px] px-5 text-[14px] font-bold"
              >
                <Square size={14} className="fill-white" />
                {sessionState === "ending" ? "Đang lưu…" : "Kết thúc cuộc họp"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LivePage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-[#F5F6F8] flex items-center justify-center">
        <span className="text-tx-muted">Đang tải phòng họp…</span>
      </div>
    }>
      <LivePageInner />
    </Suspense>
  );
}
