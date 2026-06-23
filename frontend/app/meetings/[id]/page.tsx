"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, LockOpen, Pencil, FileText, Play, Pause, SkipBack, SkipForward, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Waveform } from "@/components/waveform";
import { TRANSCRIPT, SPEAKER_COLORS, SUMMARY } from "@/lib/data";
import { cn } from "@/lib/utils";

const SPEEDS = ["0.5x", "1x", "1.5x", "2x"] as const;

export default function MeetingDetailPage() {
  const router = useRouter();
  const isAdmin = true;
  const [activeSeq, setActiveSeq] = useState(3);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [summaryStatus] = useState<"completed" | "processing">("completed");

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
              {summaryStatus === "completed"
                ? <p className="text-[11px] text-ok flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-ok inline-block" />Đã hoàn tất</p>
                : <p className="text-[11px] text-tx-muted flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-tx-muted inline-block animate-mpulse" />Đang tóm tắt…</p>
              }
            </div>
          </div>

          {summaryStatus === "processing" ? (
            <div className="flex flex-col gap-2.5">
              {[100, 90, 100, 75, 85].map((w, i) => (
                <Skeleton key={i} className="h-3 rounded" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : (
            <p className="text-[13px] leading-[1.7] text-[#2A3445] whitespace-pre-line">{SUMMARY}</p>
          )}
        </div>

        {/* MIDDLE — Transcript */}
        <div className="overflow-y-auto pb-[130px]">
          <div className="max-w-[680px] mx-auto px-5 pt-6">
            <p className="text-[12px] text-tx-muted mb-5">
              Nhấn vào một đoạn để phát audio từ đúng mốc thời gian tương ứng
            </p>
            {TRANSCRIPT.map(b => {
              const color = SPEAKER_COLORS[b.speakerIndex];
              const active = activeSeq === b.seq;
              return (
                <div key={b.seq}
                  onClick={() => { setActiveSeq(b.seq); setPlaying(true); }}
                  className={cn(
                    "flex gap-3.5 px-3.5 py-3 rounded-[8px] mb-1.5 cursor-pointer transition-colors border-l-[3px]",
                    active
                      ? "bg-brand/[0.05] border-brand"
                      : "border-transparent hover:bg-[#FAFBFC]"
                  )}>
                  <div className="w-8 h-8 rounded-full flex-none flex items-center justify-center text-white text-[13px] font-semibold"
                    style={{ background: color }}>
                    {b.seq}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="text-[13px] font-semibold" style={{ color }}>{b.speaker}</span>
                      <span className="text-[11px] text-tx-muted font-mono">{b.time}</span>
                    </div>
                    <p className="text-[14px] leading-[1.55] text-[#2A3445]">{b.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — Meeting info */}
        <div className="border-l border-line bg-white overflow-y-auto pb-[130px] px-5 py-5">
          <h2 className="text-[16px] font-bold leading-[1.4]">Họp giao ban kỹ thuật tuần 25</h2>
          <div className="flex gap-2 flex-wrap mt-3.5 mb-5">
            <Badge variant="completed" className="text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-ok flex-none" /> COMPLETED
            </Badge>
            <Badge variant="outline" className="text-[11px]">LIVE</Badge>
          </div>

          <div className="flex flex-col gap-4 py-4 border-t border-b border-[#F0F2F5]">
            <div className="flex items-center gap-3">
              <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-brand to-brand-dark text-white flex items-center justify-center font-semibold text-[12px] flex-none">AN</div>
              <div>
                <p className="text-[11px] text-tx-muted">Host</p>
                <p className="text-[13px] font-semibold">Nguyễn Văn An</p>
              </div>
            </div>
            <div>
              <p className="text-[11px] text-tx-muted mb-0.5">Phòng ban</p>
              <p className="text-[13px] font-medium">Phòng Kỹ thuật</p>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-[11px] text-tx-muted mb-0.5">Bắt đầu</p>
                <p className="text-[13px] font-medium">23/06 09:00</p>
              </div>
              <div>
                <p className="text-[11px] text-tx-muted mb-0.5">Kết thúc</p>
                <p className="text-[13px] font-medium">23/06 10:32</p>
              </div>
            </div>
            <div>
              <p className="text-[11px] text-tx-muted mb-1">Trạng thái biên bản</p>
              <div className="flex items-center gap-1.5 text-[13px] font-medium text-tx-dim">
                <Lock size={13} /> Đã khóa (Fixed)
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 mt-4">
            <Button className="w-full gap-2">
              <FileText size={15} /> Xuất PDF
            </Button>
            {isAdmin && (
              <>
                <Button variant="outline" className="w-full gap-2">
                  <LockOpen size={15} /> Mở khóa biên bản
                </Button>
                <Button variant="outline" className="w-full gap-2">
                  <Pencil size={15} /> Sửa thông tin
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating audio player */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-5 w-[calc(100%-48px)] max-w-[900px] bg-white border border-line rounded-[14px] shadow-[0_12px_40px_rgba(26,35,50,.18)] px-5 py-3.5 flex items-center gap-4">
        {/* Controls */}
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

        <span className="text-[12px] text-tx-light font-mono flex-none">00:42</span>

        {/* Waveform / progress */}
        <div className="flex-1 h-10">
          <Waveform active={false} playedRatio={0.27} />
        </div>

        <span className="text-[12px] text-tx-light font-mono flex-none">1:32:14</span>

        {/* Speed */}
        <button
          onClick={() => setSpeedIdx(i => (i + 1) % SPEEDS.length)}
          className="flex-none border border-line rounded-[7px] px-3 py-1.5 text-[13px] font-semibold text-tx-mid hover:border-line-dark hover:bg-surface transition-colors min-w-[48px] text-center">
          {SPEEDS[speedIdx]}
        </button>
      </div>
    </div>
  );
}
