"use client";
import { WAVE_BARS } from "@/lib/data";
import { cn } from "@/lib/utils";

interface WaveformProps {
  active?: boolean;
  playedRatio?: number;
  bars?: number[];
  className?: string;
}

export function Waveform({ active = true, playedRatio = 0, bars, className }: WaveformProps) {
  const data = bars ?? WAVE_BARS;
  return (
    <div className={cn("flex items-center gap-[2px] h-full", className)}>
      {data.map((v, i) => {
        const isPlayed = i / data.length < playedRatio;
        return (
          <div
            key={i}
            className={cn(
              "flex-1 min-w-[2px] rounded-sm origin-center",
              active && "animate-wave"
            )}
            style={{
              height: `${v * 100}%`,
              background: active
                ? "#EE0033"
                : isPlayed
                ? "#EE0033"
                : "#D4D8DF",
              animationDelay: active ? `${i * 0.04}s` : "0s",
            }}
          />
        );
      })}
    </div>
  );
}
