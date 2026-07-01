"use client";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Square, Pause, Play, Wifi, WifiOff, Clock, Mic, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveWaveform } from "@/components/live-waveform";
import { meetingsApi } from "@/lib/api/meetings";
import { cn } from "@/lib/utils";
import { io, Socket } from "socket.io-client";
import { getInitials } from "@/lib/types";

// ── Constants ─────────────────────────────────────────────────────────────────
const WS_URL         = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001";
const sessionKey     = (id: string) => `live_session_${id}`;
const meetingStartKey = (id: string) => `meeting_start_${id}`;

const SPEAKER_COLORS = [
  "#EE0033", "#2D6CDF", "#2E9E5B", "#8B5CF6",
  "#E8A23D", "#0EA5A5", "#D6336C", "#64748B",
];

// ── Types ─────────────────────────────────────────────────────────────────────
type SessionState   = "idle" | "recording" | "paused" | "ending" | "ended";
type ConnState      = "disconnected" | "connecting" | "connected" | "reconnecting" | "error";
type ReconnectPhase = null | "error" | "syncing" | "success";

interface LiveBlock {
  sequenceNumber: number;
  text:           string;
  speakerLabel:   string;
  displayLabel:   string;
  startTime:      number;
  colorIndex:     number;
}

interface SessionSnapshot {
  blocks:            LiveBlock[];
  colorMap:          [string, number][];
  labelOverrides:    [string, string][];
  lastSeq:           number;
  prevSessionState:  "recording" | "paused";
  audioElapsedSecs:  number;
}

// ── Network status hook ───────────────────────────────────────────────────────
interface NetStatus { online: boolean; label: string; isWifi: boolean }

function useNetworkStatus(): NetStatus {
  const [status, setStatus] = useState<NetStatus>({ online: true, label: "Đang kết nối", isWifi: true });

  useEffect(() => {
    const compute = (): NetStatus => {
      if (!navigator.onLine) return { online: false, label: "Mất mạng", isWifi: false };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conn = (navigator as any).connection;
      if (!conn) return { online: true, label: "Đang kết nối", isWifi: true };
      const type          = conn.type as string | undefined;
      const effectiveType = ((conn.effectiveType as string | undefined) ?? "").toUpperCase();
      const downlink      = conn.downlink as number | undefined;
      const speedStr      = downlink && downlink > 0 ? `${downlink} Mb/s` : effectiveType;
      const isWifi        = type === "wifi" || (!type && effectiveType === "4G");
      const label         = type === "wifi"     ? `WiFi · ${speedStr}`
                          : type === "cellular" ? `${effectiveType} · ${speedStr}`
                          : speedStr || "Đang kết nối";
      return { online: true, label, isWifi };
    };

    const update = () => setStatus(compute());
    update(); // đọc trạng thái ngay khi mount

    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = (navigator as any).connection;
    conn?.addEventListener("change", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      conn?.removeEventListener("change", update);
    };
  }, []);

  return status;
}

// ── Timers ────────────────────────────────────────────────────────────────────

/** Thời lượng cuộc họp — tính từ khi vào trang, dùng start timestamp từ sessionStorage để sống sót qua reload */
function useMeetingTimer(meetingId: string) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!meetingId) return;
    const key = meetingStartKey(meetingId);
    // Lần đầu: tạo mốc thời gian bắt đầu
    if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, Date.now().toString());
    const startTs = parseInt(sessionStorage.getItem(key)!, 10);
    // Khởi tạo ngay với elapsed thực tế (quan trọng sau reload)
    setSecs(Math.floor((Date.now() - startTs) / 1000));
    const id = setInterval(() => setSecs(Math.floor((Date.now() - startTs) / 1000)), 1000);
    return () => clearInterval(id);
  }, [meetingId]);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Thời lượng ghi âm — dừng khi paused, nhận giá trị khởi đầu từ snapshot khi reload */
function useAudioTimer(running: boolean, initialSecs: number): { display: string; secs: number } {
  const [secs, setSecs] = useState(initialSecs);
  // Đồng bộ khi initialSecs thay đổi (chỉ xảy ra 1 lần khi restore từ sessionStorage)
  useEffect(() => { setSecs(initialSecs); }, [initialSecs]);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { display: `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`, secs };
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Reconnect banner ──────────────────────────────────────────────────────────
function ReconnectBanner({ phase }: { phase: ReconnectPhase }) {
  return (
    <div
      className={cn(
        "fixed top-14 left-0 right-0 z-50 flex justify-center transition-transform duration-300 ease-out pointer-events-none",
        phase !== null ? "translate-y-0" : "-translate-y-[200%]",
      )}
    >
      {phase === "error" && (
        <div className="flex items-center gap-2.5 bg-red-600 text-white px-5 py-2.5 rounded-b-xl shadow-lg pointer-events-auto">
          <Loader2 size={14} className="animate-spin flex-none" />
          <span className="text-[13px] font-medium">Lỗi kết nối · Đang thử kết nối lại…</span>
        </div>
      )}
      {phase === "syncing" && (
        <div className="flex items-center gap-2.5 bg-amber-500 text-white px-5 py-2.5 rounded-b-xl shadow-lg pointer-events-auto">
          <span className="flex gap-1 flex-none">
            {[0, 0.15, 0.3].map(d => (
              <span key={d} className="w-1.5 h-1.5 rounded-full bg-white animate-mpulse"
                style={{ animationDelay: `${d}s` }} />
            ))}
          </span>
          <span className="text-[13px] font-medium">Đang đồng bộ dữ liệu…</span>
        </div>
      )}
      {phase === "success" && (
        <div className="flex items-center gap-2.5 bg-green-600 text-white px-5 py-2.5 rounded-b-xl shadow-lg pointer-events-auto">
          <CheckCircle size={14} className="flex-none" />
          <span className="text-[13px] font-medium">Kết nối lại và đồng bộ thành công</span>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
function LivePageInner() {
  const router    = useRouter();
  const params    = useSearchParams();
  const meetingId = params.get("meetingId") ?? "";

  const netStatus = useNetworkStatus();

  // ── State ──────────────────────────────────────────────────────────────────
  const [sessionState,    setSessionState]    = useState<SessionState>("idle");
  const [connState,       setConnState]       = useState<ConnState>("disconnected");
  const [reconnectPhase,  setReconnectPhase]  = useState<ReconnectPhase>(null);
  const [blocks,          setBlocks]          = useState<LiveBlock[]>([]);
  const [editingSeq,      setEditingSeq]      = useState<number | null>(null);
  const [meetingTitle,    setMeetingTitle]    = useState("Cuộc họp trực tuyến");
  const [needMicPrompt,   setNeedMicPrompt]   = useState(false);
  const [initialAudioSecs, setInitialAudioSecs] = useState(0);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const socketRef          = useRef<Socket | null>(null);
  const audioCtxRef        = useRef<AudioContext | null>(null);
  const analyserRef        = useRef<AnalyserNode | null>(null);
  const streamRef          = useRef<MediaStream | null>(null);
  const processorRef       = useRef<ScriptProcessorNode | null>(null);
  const lastSeqRef         = useRef(0);
  const sessionStateRef    = useRef<SessionState>("idle");
  const colorMapRef        = useRef<Map<string, number>>(new Map());
  const labelOverrides     = useRef<Map<string, string>>(new Map());
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioBufferRef     = useRef<number[][]>([]);
  const isResumingRef      = useRef<boolean>(false);
  const isRestoredRef      = useRef<boolean>(false);
  const audioSecsRef       = useRef(0); // bản sao ref để đọc trong save effect mà không thêm dep

  useEffect(() => { sessionStateRef.current = sessionState; }, [sessionState]);

  const meetingTimer                   = useMeetingTimer(meetingId);
  const { display: audioTimer, secs: audioSecs } = useAudioTimer(sessionState === "recording", initialAudioSecs);
  useEffect(() => { audioSecsRef.current = audioSecs; }, [audioSecs]);

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [blocks]);

  // ── Load meeting title ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!meetingId) return;
    meetingsApi.getDetail(meetingId)
      .then(({ data }) => { if (data?.title) setMeetingTitle(data.title); })
      .catch(() => {});
  }, [meetingId]);

  // ── sessionStorage helpers ─────────────────────────────────────────────────
  const clearSession = useCallback(() => {
    if (!meetingId) return;
    sessionStorage.removeItem(sessionKey(meetingId));
    sessionStorage.removeItem(meetingStartKey(meetingId));
  }, [meetingId]);

  // Auto-save khi blocks thay đổi (blocks là nguồn sự thật duy nhất)
  useEffect(() => {
    const state = sessionStateRef.current;
    if (!meetingId || blocks.length === 0) return;
    if (state === "idle" || state === "ending" || state === "ended") return;

    const snapshot: SessionSnapshot = {
      blocks,
      colorMap:          Array.from(colorMapRef.current.entries()),
      labelOverrides:    Array.from(labelOverrides.current.entries()),
      lastSeq:           lastSeqRef.current,
      prevSessionState:  state === "paused" ? "paused" : "recording",
      audioElapsedSecs:  audioSecsRef.current,
    };
    try {
      sessionStorage.setItem(sessionKey(meetingId), JSON.stringify(snapshot));
    } catch { /* quota exceeded — ignore */ }
  }, [blocks, meetingId]);

  // ── Speaker color helpers ──────────────────────────────────────────────────
  const getColorIndex = useCallback((label: string): number => {
    if (!colorMapRef.current.has(label)) {
      colorMapRef.current.set(label, colorMapRef.current.size % SPEAKER_COLORS.length);
    }
    return colorMapRef.current.get(label)!;
  }, []);

  const addBlock = useCallback((raw: {
    sequenceNumber: number; text: string; speakerLabel: string; startTime: number; endTime: number;
  }) => {
    const colorIndex   = getColorIndex(raw.speakerLabel);
    const displayLabel = labelOverrides.current.get(raw.speakerLabel) ?? raw.speakerLabel;
    lastSeqRef.current = Math.max(lastSeqRef.current, raw.sequenceNumber);
    // Luôn sắp xếp theo sequenceNumber để tránh thứ tự sai khi flush buffer sau reconnect
    setBlocks(prev => {
      const next = [...prev, { ...raw, displayLabel, colorIndex }];
      return next.sort((a, b) => a.startTime - b.startTime);
    });
  }, [getColorIndex]);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    processorRef.current?.disconnect();
    audioCtxRef.current?.close().catch(() => {});
    streamRef.current?.getTracks().forEach(t => t.stop());
    socketRef.current?.disconnect();
    processorRef.current = null;
    audioCtxRef.current  = null;
    analyserRef.current  = null;
    streamRef.current    = null;
    socketRef.current    = null;
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
    audioBufferRef.current = [];
    isResumingRef.current  = false;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  // ── 120s timeout monitor (chống F5/Reload) ────────────────────────────────
  useEffect(() => {
    if (!meetingId) return;
    const isMeetingActive = sessionState === "recording" || sessionState === "paused";
    const isDisconnected  = connState === "reconnecting" || connState === "error" || connState === "disconnected";
    const localKey        = `disconnect_time_${meetingId}`;

    if (connState === "connected") {
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
      localStorage.removeItem(localKey);
    } else if (isDisconnected && isMeetingActive) {
      let tsStr = localStorage.getItem(localKey);
      if (!tsStr) {
        tsStr = Date.now().toString();
        localStorage.setItem(localKey, tsStr);
      }
      const elapsed   = Date.now() - parseInt(tsStr, 10);
      const remaining = 120000 - elapsed;
      if (remaining <= 0) {
        localStorage.removeItem(localKey);
        clearSession();
        cleanup();
        router.push("/meetings");
      } else {
        if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = setTimeout(() => {
          localStorage.removeItem(localKey);
          clearSession();
          cleanup();
          router.push("/meetings");
        }, remaining);
      }
    }
    return () => { if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current); };
  }, [connState, sessionState, meetingId, router, cleanup, clearSession]);

  // ── Audio capture ──────────────────────────────────────────────────────────
  const startAudioCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      setNeedMicPrompt(false);

      const ctx      = new AudioContext({ sampleRate: 48000 });
      audioCtxRef.current = ctx;

      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize  = 256; // getByteTimeDomainData trả về 256 samples
      analyserRef.current = analyser;

      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (sessionStateRef.current !== "recording") return;
        const float32 = e.inputBuffer.getChannelData(0);
        const int16   = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          int16[i] = Math.max(-32768, Math.min(32767, Math.round(float32[i] * 32767)));
        }
        const chunkData = Array.from(new Uint8Array(int16.buffer));
        if (socketRef.current?.connected && !isResumingRef.current) {
          socketRef.current.emit("audio_chunk", { meetingId, audio: chunkData });
        } else {
          audioBufferRef.current.push(chunkData);
        }
      };

      // source → analyser → processor → destination
      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(ctx.destination);
      setSessionState("recording");
    } catch {
      setNeedMicPrompt(true);
    }
  }, [meetingId]);

  // ── WebSocket connection ───────────────────────────────────────────────────
  const connectSocket = useCallback((isResume = false) => {
    if (!meetingId) return;
    const token = typeof window !== "undefined" ? (localStorage.getItem("access_token") ?? "") : "";
    if (!token) { router.replace("/login"); return; }

    if (isResume) isResumingRef.current = true;
    setConnState("connecting");

    const socket = io(`${WS_URL}/live`, { transports: ["websocket"], reconnection: false });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnState("connected");
      if (isResume) {
        socket.emit("resume", { meetingId, token, lastReceivedSequence: lastSeqRef.current });
      } else {
        socket.emit("open_session", { meetingId, token });
      }
    });

    socket.on("session_ready", () => {
      startAudioCapture();
    });

    socket.on("resume_ok", async (data: {
      missedBlocks: Array<{ sequenceNumber: number; text: string; speakerLabel: string; startTime: number; endTime: number }>;
      vadReinitialized: boolean;
    }) => {
      // Merge các block bị lỡ trong khi mất kết nối
      [...data.missedBlocks]
        .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
        .forEach(addBlock);

      setReconnectPhase("syncing");
      isResumingRef.current = false;

      // Xả toàn bộ audio đã buffer trong lúc mất mạng
      while (audioBufferRef.current.length > 0) {
        const chunk = audioBufferRef.current.shift();
        socketRef.current?.emit("audio_chunk", { meetingId, audio: chunk });
      }

      // Khởi động lại audio
      if (audioCtxRef.current === null) {
        // Sau reload: cần tạo lại AudioContext + xin quyền mic
        await startAudioCapture();
      } else {
        // Sau disconnect thông thường: AudioContext vẫn còn (không bị suspend)
        setSessionState("recording");
      }

      setReconnectPhase("success");
      setTimeout(() => setReconnectPhase(null), 3000);
    });

    socket.on("transcript_update", addBlock);

    socket.on("session_ended", () => {
      clearSession();
      cleanup();
      router.push("/meetings");
    });

    socket.on("error", (err: { message: string }) => {
      console.error("WS:", err.message);
      setConnState("error");
      isResumingRef.current = false;
      if (err.message.includes("Phiên họp đã kết thúc")) {
        audioBufferRef.current = [];
        clearSession();
        cleanup();
        router.push("/meetings");
      }
    });

    socket.on("disconnect", () => {
      const state = sessionStateRef.current;
      if (state === "ending" || state === "ended") return;
      setConnState("reconnecting");
      setReconnectPhase("error");
      setTimeout(() => {
        if (socketRef.current === socket) connectSocket(true);
      }, 3000);
    });

    socket.on("connect_error", () => {
      setConnState("error");
      const state = sessionStateRef.current;
      if (state === "ending" || state === "ended") return;
      setReconnectPhase("error");
      setTimeout(() => {
        if (socketRef.current === socket) connectSocket(true);
      }, 3000);
    });
  }, [meetingId, router, addBlock, startAudioCapture, cleanup, clearSession]);

  // ── Restore từ sessionStorage khi reload ──────────────────────────────────
  useEffect(() => {
    if (!meetingId || isRestoredRef.current) return;
    isRestoredRef.current = true;

    const raw = sessionStorage.getItem(sessionKey(meetingId));
    if (!raw) return;

    try {
      const saved = JSON.parse(raw) as SessionSnapshot;
      if (!saved.blocks || saved.blocks.length === 0) return;

      setBlocks(saved.blocks);
      colorMapRef.current    = new Map(saved.colorMap);
      labelOverrides.current = new Map(saved.labelOverrides);
      lastSeqRef.current     = saved.lastSeq;
      setInitialAudioSecs(saved.audioElapsedSecs ?? 0);
      // Hiện controls (không phải nút "Bắt đầu"), audio chưa chạy → paused
      setSessionState("paused");

      // Auto-reconnect để cancel server timeout job + nhận missed blocks
      setReconnectPhase("error");
      connectSocket(true);
    } catch {
      sessionStorage.removeItem(sessionKey(meetingId));
    }
  }, [meetingId, connectSocket]);

  // ── Session controls ───────────────────────────────────────────────────────
  const handleStart = useCallback(() => {
    connectSocket(false);
  }, [connectSocket]);

  const handlePause = () => {
    // Không suspend AudioContext để tránh trình duyệt khóa cứng luồng Micro vật lý sau khi reconnect.
    // onaudioprocess và LiveWaveform sẽ tự động dừng gửi/vẽ dữ liệu khi sessionState chuyển sang "paused".
    setSessionState("paused");
  };

  const handleResume = () => {
    setSessionState("recording");
  };

  const handleEnd = () => {
    clearSession();
    setSessionState("ending");
    socketRef.current?.emit("end_session", { meetingId });
    setTimeout(() => { cleanup(); router.push("/meetings"); }, 5000);
  };

  // ── Edit speaker label ─────────────────────────────────────────────────────
  const handleLabelSave = (seq: number, originalLabel: string, newLabel: string) => {
    const trimmed = newLabel.trim();
    if (!trimmed || trimmed === originalLabel) { setEditingSeq(null); return; }

    // Thu thập các nhãn đang sử dụng bởi các người nói khác để tránh trùng lặp
    const existingLabels = new Set(
      blocks
        .filter(b => b.speakerLabel !== originalLabel)
        .map(b => b.displayLabel)
    );

    let finalLabel = trimmed;
    if (existingLabels.has(finalLabel)) {
      let counter = 2;
      while (existingLabels.has(`${trimmed} ${counter}`)) {
        counter++;
      }
      finalLabel = `${trimmed} ${counter}`;
    }

    labelOverrides.current.set(originalLabel, finalLabel);
    labelOverrides.current.set(finalLabel, finalLabel);

    if (colorMapRef.current.has(originalLabel)) {
      const colorIdx = colorMapRef.current.get(originalLabel)!;
      colorMapRef.current.delete(originalLabel);
      colorMapRef.current.set(finalLabel, colorIdx);
    }

    setBlocks(prev => prev.map(b => b.speakerLabel === originalLabel ? { ...b, speakerLabel: finalLabel, displayLabel: finalLabel } : b));
    socketRef.current?.emit("edit_speaker", {
      meetingId, fromSequence: seq, oldLabel: originalLabel, newLabel: finalLabel,
    });
    setEditingSeq(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-[#F5F6F8] flex flex-col">

      {/* Reconnect banner — trượt xuống từ phía trên */}
      <ReconnectBanner phase={reconnectPhase} />

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
          {/* Network status — tốc độ và loại mạng thực tế của thiết bị */}
          <div className={cn(
            "flex items-center gap-2 border rounded-[7px] px-3 py-1.5",
            netStatus.online ? "bg-ok/15 border-ok/35" : "bg-brand/15 border-brand/35",
          )}>
            {netStatus.online
              ? <Wifi    size={15} className="text-[#3FBE74]" />
              : <WifiOff size={15} className="text-brand" />
            }
            <span className={cn("text-[13px] font-medium", netStatus.online ? "text-[#8FDDAC]" : "text-red-300")}>
              {netStatus.label}
            </span>
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
              <Mic size={56} className="text-tx-muted opacity-30" />
              <p className="text-[17px] font-semibold text-tx-muted opacity-75 text-center">
                Nhấn &ldquo;Bắt đầu ghi âm&rdquo; để khởi động phiên họp
              </p>
              <p className="text-[13px] text-tx-muted opacity-60 text-center max-w-[360px] leading-relaxed">
                Transcript sẽ xuất hiện tại đây theo thời gian thực<br />
                Bạn có thể chỉnh tên người nói bằng cách nhấn vào nhãn
              </p>
            </div>
          )}

          {sessionState !== "idle" && (
            <p className="text-center text-[12px] text-tx-dim mb-6 font-medium">
              Transcript đang được tạo theo thời gian thực · nhấn vào tên người nói để sửa nhãn
            </p>
          )}

          {/* ── Transcript blocks ── */}
          {blocks.map((b, idx) => {
            const prev           = idx > 0 ? blocks[idx - 1] : null;
            const isContinuation = prev?.speakerLabel === b.speakerLabel;
            const isNextContinuation = idx + 1 < blocks.length && blocks[idx + 1].speakerLabel === b.speakerLabel;
            const color          = SPEAKER_COLORS[b.colorIndex];
            const isEditing      = editingSeq === b.sequenceNumber;

            return (
              <div key={b.sequenceNumber} className={cn("flex gap-3.5 animate-fade-up", isNextContinuation ? "mb-2" : "mb-6")}>
                <div className="w-9 flex-none">
                  {!isContinuation && (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold"
                      style={{ background: color }}>
                      {getInitials(b.displayLabel)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
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
                      <span className="text-[11px] text-tx-muted font-mono">{formatTime(b.startTime)}</span>
                    </div>
                  )}
                  {isContinuation && (
                    <span className="text-[11px] text-tx-muted font-mono block mb-1">{formatTime(b.startTime)}</span>
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

          {/* Mic prompt — hiện khi getUserMedia thất bại sau reload */}
          {needMicPrompt && (
            <div className="flex justify-center mt-8">
              <Button onClick={startAudioCapture} variant="outline" className="gap-2">
                <Mic size={14} /> Nhấn để tiếp tục ghi âm
              </Button>
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

        {/* Waveform — realtime theo âm lượng mic */}
        <div className="flex-1 h-12">
          <LiveWaveform analyserRef={analyserRef} active={sessionState === "recording"} />
        </div>

        <div className="w-px h-10 bg-line flex-none" />

        {/* Controls */}
        <div className="flex items-center gap-3 flex-none">
          {sessionState === "idle" ? (
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
