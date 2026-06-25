"use client";
import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { NeuralWaveform } from "@/components/neural-waveform";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api";

const STEPS = [
  { n: 1, label: "Tìm tài khoản" },
  { n: 2, label: "Nhập OTP" },
  { n: 3, label: "Mật khẩu mới" },
];

export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [email, setEmail] = useState("");

  // Step 2 — OTP
  const [otpValues, setOtpValues] = useState(["","","","","",""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Step 3 — New password
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [showNew,    setShowNew]    = useState(false);
  const [showConfirm,setShowConfirm]= useState(false);

  useEffect(() => {
    if (step !== 2) return;
    setCountdown(60); setCanResend(false);
    const timer = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { clearInterval(timer); setCanResend(true); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otpValues]; next[index] = digit; setOtpValues(next);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return; e.preventDefault();
    const next = [...otpValues];
    pasted.split("").forEach((ch, i) => { next[i] = ch; }); setOtpValues(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSendOtp = async () => {
    if (!email) { setError("Vui lòng nhập email"); return; }
    setError(null); setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setStep(2);
    } catch (e) { setError(e instanceof ApiError ? e.message : "Gửi OTP thất bại"); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    setOtpValues(["","","","","",""]); setError(null);
    try { await authApi.forgotPassword(email); } catch {}
    setStep(2);
  };

  const handleResetPassword = async () => {
    if (newPw !== confirmPw) { setError("Mật khẩu xác nhận không khớp"); return; }
    setError(null); setLoading(true);
    try {
      await authApi.resetPassword(email, otpValues.join(""), newPw);
      router.replace("/login");
    } catch (e) { setError(e instanceof ApiError ? e.message : "Đặt lại mật khẩu thất bại"); }
    finally { setLoading(false); }
  };

  const maskedEmail = email
    ? email.replace(/^(.{2})(.+?)(@.+)$/, (_, a, b, c) => a + "***" + c)
    : "***@viettel.com.vn";

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <NeuralWaveform />
      <div className="absolute inset-0 backdrop-blur-[4px] bg-slate-950/20" />

      <div className="relative z-10 w-full max-w-xl p-8 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20">
        {/* Brand header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="font-bold text-xl text-slate-900">vSM</span>
            <span className="text-xs text-slate-400 tracking-widest ml-2">vSpeechMind</span>
          </div>
          <a href="/login" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft size={14} /> Đăng nhập
          </a>
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-1">Đặt lại mật khẩu</h2>
        <p className="text-sm text-slate-500 mb-6">Làm theo 3 bước để khôi phục tài khoản</p>

        {/* Stepper */}
        <div className="flex items-center mb-8">
          {STEPS.map(({ n, label }, idx) => {
            const done = n < step, cur = n === step;
            return (
              <div key={n} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-none border-2 transition-all duration-300",
                    done ? "bg-red-600 border-red-600 text-white"
                         : cur ? "bg-white border-red-600 text-red-600 shadow-md shadow-red-600/20"
                               : "bg-white border-slate-200 text-slate-400"
                  )}>
                    {done ? <Check size={16} strokeWidth={3} /> : n}
                  </div>
                  <span className={cn("text-[11px] mt-1.5 font-medium whitespace-nowrap",
                    cur ? "text-red-600 font-semibold" : done ? "text-slate-500" : "text-slate-400")}>
                    {label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={cn("flex-1 h-0.5 mx-2 mb-5 rounded-full transition-all duration-500",
                    n < step ? "bg-red-600" : "bg-slate-200")} />
                )}
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-sm text-slate-600 leading-relaxed">
                Nhập email tài khoản. Chúng tôi sẽ gửi mã OTP gồm 6 chữ số đến hộp thư của bạn.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="ten@viettel.com.vn"
                  onKeyDown={e => e.key === "Enter" && handleSendOtp()}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all" />
              </div>
            </div>
            <button onClick={handleSendOtp} disabled={loading}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-semibold text-sm shadow-lg shadow-red-600/20 transition-all disabled:opacity-60">
              {loading ? "Đang gửi…" : "Gửi mã OTP"}
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-sm text-slate-600 leading-relaxed">
                Mã OTP đã được gửi tới <b className="text-slate-800">{maskedEmail}</b>. Có hiệu lực trong 10 phút.
              </p>
            </div>
            <div className="flex gap-3 justify-center" onPaste={handleOtpPaste}>
              {otpValues.map((val, i) => (
                <input key={i} ref={el => { otpRefs.current[i] = el; }} value={val}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  maxLength={1} inputMode="numeric"
                  className={cn(
                    "w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none transition-all",
                    val ? "border-red-500 bg-red-50 text-red-600 ring-2 ring-red-100"
                        : "border-slate-200 bg-white text-slate-900 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  )} />
              ))}
            </div>
            <p className="text-sm text-slate-500 text-center">
              Chưa nhận được mã?{" "}
              {canResend
                ? <button onClick={handleResend} className="text-red-600 hover:text-red-700 font-semibold">Gửi lại</button>
                : <span className="text-slate-400 font-medium">Gửi lại ({countdown}s)</span>
              }
            </p>
            <button onClick={() => { setError(null); setStep(3); }} disabled={otpValues.join("").length < 6}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-semibold text-sm shadow-lg shadow-red-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              Xác nhận mã OTP
            </button>
            <button onClick={() => setStep(1)} className="text-sm text-slate-500 hover:text-slate-700 text-center">← Đổi email</button>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-sm text-slate-600 leading-relaxed">Đặt mật khẩu mới. Tối thiểu 8 ký tự, bao gồm chữ hoa và số.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Mật khẩu mới</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showNew ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)}
                  placeholder="Ít nhất 8 ký tự"
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all" />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Xác nhận mật khẩu mới</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showConfirm ? "text" : "password"} value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className={cn("w-full pl-10 pr-11 py-3 rounded-xl border bg-white text-sm text-slate-900 outline-none transition-all",
                    confirmPw && newPw !== confirmPw ? "border-rose-400 focus:ring-2 focus:ring-rose-100"
                    : "border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100")} />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPw && newPw !== confirmPw && <p className="text-xs text-rose-500">Mật khẩu xác nhận không khớp</p>}
            </div>
            <button onClick={handleResetPassword} disabled={!newPw || newPw !== confirmPw || loading}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-semibold text-sm shadow-lg shadow-red-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "Đang xử lý…" : "Đặt lại mật khẩu"}
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">© 2026 — Tổng Công ty Giải pháp Doanh nghiệp Viettel.</p>
      </div>
    </div>
  );
}
