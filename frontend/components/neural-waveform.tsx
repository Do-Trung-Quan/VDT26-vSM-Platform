"use client";

const BARS = Array.from({ length: 64 }, (_, i) => ({
  x: i * 9.5 + 4,
  delay: ((i * 0.09) % 2).toFixed(2),
  duration: (0.9 + (i % 6) * 0.18).toFixed(2),
  maxH: 12 + (i % 9) * 7,
  red: i % 5 === 0 || i % 7 === 0,
}));

export function NeuralWaveform({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <style>{`
        @keyframes vsm-bar {
          0%, 100% { transform: scaleY(0.15); opacity: 0.4; }
          50% { transform: scaleY(1); opacity: 1; }
        }
        @keyframes vsm-bar-alt {
          0%, 100% { transform: scaleY(0.35); opacity: 0.5; }
          50% { transform: scaleY(0.9); opacity: 0.85; }
        }
        @keyframes vsm-glow {
          0%, 100% { opacity: 0.08; }
          50% { opacity: 0.18; }
        }
      `}</style>

      {/* Dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(148,163,184,0.12) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Animated SVG waveform bars */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 612 260"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="vsmRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="vsmSlate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#334155" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {BARS.map((bar, i) => {
          const cy = 130;
          const y = cy - bar.maxH / 2;
          return (
            <rect
              key={i}
              x={bar.x}
              y={y}
              width={3.2}
              height={bar.maxH}
              rx={1.6}
              fill={bar.red ? "url(#vsmRed)" : "url(#vsmSlate)"}
              style={{
                transformOrigin: `${bar.x + 1.6}px ${cy}px`,
                animation: `${i % 3 === 0 ? "vsm-bar-alt" : "vsm-bar"} ${bar.duration}s ease-in-out infinite`,
                animationDelay: `${bar.delay}s`,
              }}
            />
          );
        })}
      </svg>

      {/* Ambient glow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(239,68,68,0.08), transparent)",
          animation: "vsm-glow 3s ease-in-out infinite",
        }}
      />

      {/* Gradient overlay — bắt buộc đặt sau cùng */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/80 to-red-950/20" />
    </div>
  );
}
