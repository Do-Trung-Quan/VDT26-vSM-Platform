"use client";
import { useEffect, useRef } from "react";

interface LiveWaveformProps {
  analyserRef: React.RefObject<AnalyserNode | null>;
  active: boolean;
}

const NUM_BARS = 48;

export function LiveWaveform({ analyserRef, active }: LiveWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef       = useRef<number>(0);
  const lastDrawRef  = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!active) {
      cancelAnimationFrame(rafRef.current);
      // Reset về dạng sóng tĩnh hình sin nhẹ
      Array.from(container.children).forEach((el, i) => {
        const bar = el as HTMLElement;
        bar.style.height  = `${(0.08 + Math.abs(Math.sin(i * 0.7)) * 0.18) * 100}%`;
        bar.style.opacity = "0.25";
      });
      return;
    }

    // fftSize = 256 → getByteTimeDomainData trả về 256 samples
    const dataArray = new Uint8Array(analyserRef.current?.fftSize ?? 256);

    const draw = (now: number) => {
      rafRef.current = requestAnimationFrame(draw);
      if (now - lastDrawRef.current < 33) return; // giới hạn ~30fps
      lastDrawRef.current = now;

      const analyser = analyserRef.current;
      if (!analyser) return;
      analyser.getByteTimeDomainData(dataArray);

      const bars    = container.children;
      const binSize = Math.max(1, Math.floor(dataArray.length / bars.length));

      for (let i = 0; i < bars.length; i++) {
        const start = i * binSize;
        const end   = Math.min(start + binSize, dataArray.length);
        let sum = 0;
        for (let j = start; j < end; j++) {
          const v = (dataArray[j] / 128) - 1; // chuẩn hóa về -1..1
          sum += v * v;
        }
        const rms        = Math.sqrt(sum / (end - start));
        const normalized = Math.min(1, rms * 6); // speech RMS thường 0-0.3 → scale lên
        const minH       = 0.05 + Math.abs(Math.sin(i * 0.7)) * 0.08;
        const height     = minH + normalized * 0.87;

        const bar = bars[i] as HTMLElement;
        bar.style.height  = `${height * 100}%`;
        bar.style.opacity = "1";
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, analyserRef]);

  return (
    <div ref={containerRef} className="flex items-center gap-[2px] h-full">
      {Array.from({ length: NUM_BARS }, (_, i) => (
        <div
          key={i}
          className="flex-1 min-w-[2px] rounded-sm origin-center"
          style={{ height: "10%", background: "#EE0033" }}
        />
      ))}
    </div>
  );
}
