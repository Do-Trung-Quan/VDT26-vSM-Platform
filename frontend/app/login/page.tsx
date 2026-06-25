"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, ArrowRight, Volume2, Eye, EyeOff } from "lucide-react";
import { NeuralWaveform } from "@/components/neural-waveform";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError("Vui lòng nhập email và mật khẩu"); return; }
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/meetings");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex flex-[1.05] bg-slate-950 flex-col justify-between p-14 relative overflow-hidden">
        <NeuralWaveform />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center flex-none"
            style={{ boxShadow: "0 0 15px rgba(220,38,38,0.5)" }}>
            <Volume2 size={18} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base text-red-500 leading-none tracking-tight">
              vSM — vSpeechMind
            </span>
            <span className="text-[11px] text-white/70 mt-0.5 font-light tracking-wide">
              AI Speech-to-Text &amp; Meeting Minutes Platform
            </span>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 max-w-[480px]">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/15 border border-red-600/25 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-400 font-medium tracking-wider">AI-POWERED TRANSCRIPTION</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight">
            Hệ thống biên tập và đồng bộ biên bản họp cộng tác
          </h1>
          <p className="mt-4 text-sm text-slate-300 leading-relaxed">
            Nền tảng số hóa cuộc họp thông minh ứng dụng công nghệ nhận dạng giọng nói từ Viettel AI.
            Tự động bóc băng âm thanh theo thời gian thực, định danh người nói, tổng hợp nội dung bằng trí tuệ nhân tạo và xuất bản biên bản lập tức.
          </p>
          <div className="flex flex-wrap gap-2.5 mt-8">
            {["Realtime STT","Speaker ID","AI Summary","Export PDF"].map(f => (
              <span key={f} className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-800/80 border border-slate-700/60 text-slate-300">
                {f}
              </span>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-500">
          © 2026 — Tổng Công ty Giải pháp Doanh nghiệp Viettel.
        </p>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex items-center justify-center bg-white p-8 lg:p-14">
        <div className="w-full max-w-[400px]">
          {/* Mobile brand */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <span className="font-bold text-xl text-slate-900">vSM</span>
            <span className="text-xs text-slate-400 tracking-widest">vSpeechMind</span>
          </div>

          <p className="text-xs font-bold text-red-600 tracking-wider uppercase mb-2">
            Đăng nhập hệ thống
          </p>
          <h2 className="text-3xl font-extrabold text-slate-900 leading-tight">Chào mừng trở lại</h2>
          <p className="mt-2 text-sm text-slate-500">Sử dụng tài khoản nội bộ được cấp để truy cập.</p>

          <div className="mt-8 flex flex-col gap-4" onKeyDown={handleKeyDown}>
            {/* Error */}
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">Email</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="ten@viettel.com.vn"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 focus:bg-white transition-all" />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">Mật khẩu</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 focus:bg-white transition-all" />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 accent-red-600 cursor-pointer" />
                <span className="text-sm text-slate-600">Ghi nhớ đăng nhập</span>
              </label>
              <a href="/reset-password" className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors">
                Quên mật khẩu?
              </a>
            </div>

            {/* Submit */}
            <button onClick={handleLogin} disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 mt-1 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] hover:scale-[1.01] text-white font-semibold text-[15px] shadow-lg shadow-red-600/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? (
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (<>Đăng nhập <ArrowRight size={16} /></>)}
            </button>
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">
            Tài khoản do quản trị viên cấp.{" "}
            <a href="/reset-password" className="text-red-600 hover:underline font-medium">Quên mật khẩu?</a>
          </p>
        </div>
      </div>
    </div>
  );
}
