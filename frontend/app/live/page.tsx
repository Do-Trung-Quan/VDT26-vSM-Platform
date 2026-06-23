"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Square, Pause, Play, Wifi, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Waveform } from "@/components/waveform";
import { TRANSCRIPT, SPEAKER_COLORS } from "@/lib/data";
import { cn } from "@/lib/utils";

function useTimer(running: boolean) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const m = String(Math.floor(secs / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function LivePage() {
  const router = useRouter();
  const [recState, setRecState] = useState<"recording" | "paused">("recording");
  const [editingSeq, setEditingSeq] = useState<number | null>(null);
  const [labels, setLabels] = useState<Record<number, string>>({});
  const recTimer = useTimer(recState === "recording");

  return (
    <div className="fixed inset-0 bg-[#F5F6F8] flex flex-col">
      {/* Room header */}
      <div className="flex-none bg-navy text-white px-7 py-4 flex items-center justify-between gap-5">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex items-center gap-2 bg-brand/18 border border-brand/50 rounded-full px-3 py-1.5 flex-none">
            <span className="w-2 h-2 rounded-full bg-brand animate-blink" />
            <span className="text-xs font-bold tracking-[.5px]">LIVE</span>
          </div>
          <h1 className="text-[17px] font-semibold truncate">Họp giao ban kỹ thuật tuần 25</h1>
        </div>
        <div className="flex items-center gap-5 flex-none">
          <div className="flex items-center gap-2 bg-ok/15 border border-ok/35 rounded-[7px] px-3 py-1.5">
            <Wifi size={15} className="text-[#3FBE74]" />
            <span className="text-[13px] text-[#8FDDAC] font-medium">Kết nối ổn định</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[#9BA3B4]" />
            <span className="text-[15px] font-semibold font-mono">00:12:47</span>
          </div>
        </div>
      </div>

      {/* Transcript scroll area */}
      <div className="flex-1 overflow-y-auto pb-[160px]">
        <div className="max-w-[820px] mx-auto px-6 pt-7">
          <p className="text-center text-[12px] text-tx-muted mb-6">
            Transcript đang được tạo theo thời gian thực · nhấn vào tên người nói để sửa nhãn
          </p>

          {TRANSCRIPT.map(b => {
            const color = SPEAKER_COLORS[b.speakerIndex];
            const label = labels[b.seq] ?? b.speaker;
            const editing = editingSeq === b.seq;
            return (
              <div key={b.seq} className="flex gap-3.5 mb-6 animate-fade-up">
                <div className="w-9 h-9 rounded-full flex-none flex items-center justify-center text-white text-[14px] font-semibold"
                  style={{ background: color }}>
                  {b.seq}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    {editing ? (
                      <input
                        autoFocus
                        defaultValue={label}
                        onBlur={e => {
                          setLabels(l => ({ ...l, [b.seq]: e.target.value }));
                          setEditingSeq(null);
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                        className="text-[13px] font-semibold border-b-2 border-brand outline-none bg-transparent"
                        style={{ color }}
                      />
                    ) : (
                      <span
                        onClick={() => setEditingSeq(b.seq)}
                        className="text-[13px] font-semibold cursor-pointer border-b border-dashed border-current pb-px"
                        style={{ color }}
                        title="Nhấn để sửa nhãn">
                        {label}
                      </span>
                    )}
                    <span className="text-[11px] text-tx-muted font-mono">{b.time}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C7CCD6" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                    </svg>
                  </div>
                  <p className="text-[15px] leading-[1.6] text-[#2A3445]">{b.text}</p>
                </div>
              </div>
            );
          })}

          {/* Listening indicator */}
          <div className="flex items-center gap-3 pl-[52px]">
            <span className="flex gap-1">
              {[0, 0.2, 0.4].map(d => (
                <span key={d} className="w-1.5 h-1.5 rounded-full bg-line-dark animate-mpulse"
                  style={{ animationDelay: `${d}s` }} />
              ))}
            </span>
            <span className="text-[13px] text-tx-muted">Đang lắng nghe…</span>
          </div>
        </div>
      </div>

      {/* Floating recording controls */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-6 w-[calc(100%-48px)] max-w-[880px] bg-white border border-line rounded-[14px] shadow-[0_12px_40px_rgba(26,35,50,.18)] px-5 py-4 flex items-center gap-5">
        {/* Record timer */}
        <div className="flex-none text-center">
          <div className="text-[22px] font-bold font-mono text-navy">{recTimer}</div>
          <div className="text-[10px] text-tx-muted uppercase tracking-[.5px] mt-0.5">Thời lượng ghi</div>
        </div>

        <div className="w-px h-10 bg-line flex-none" />

        {/* Waveform */}
        <div className="flex-1 h-12">
          <Waveform active={recState === "recording"} />
        </div>

        <div className="w-px h-10 bg-line flex-none" />

        {/* Controls */}
        <div className="flex items-center gap-3 flex-none">
          <button
            onClick={() => setRecState(s => s === "recording" ? "paused" : "recording")}
            className="w-[52px] h-[52px] rounded-full bg-navy flex items-center justify-center hover:bg-navy-mid transition-colors">
            {recState === "recording"
              ? <Pause size={18} className="text-white fill-white" />
              : <Play  size={18} className="text-white fill-white" />
            }
          </button>
          <Button
            onClick={() => router.push("/meetings")}
            className="gap-2 h-[50px] px-5 text-[14px] font-bold">
            <Square size={14} className="fill-white" /> Kết thúc cuộc họp
          </Button>
        </div>
      </div>
    </div>
  );
}
