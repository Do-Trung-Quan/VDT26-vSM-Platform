"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const STEPS = [
  { n: 1, label: "Tìm tài khoản" },
  { n: 2, label: "Nhập OTP" },
  { n: 3, label: "Mật khẩu mới" },
];

export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-screen flex items-center justify-center p-10 bg-surface">
      <div className="w-full max-w-[412px] bg-white border border-line rounded-[10px] p-8 shadow-[0_4px_24px_rgba(26,35,50,.06)]">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] rounded-[7px] bg-brand flex items-center justify-center text-white font-bold text-[15px]">M</div>
          <span className="font-bold text-[15px]">Đặt lại mật khẩu</span>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 mt-7 mb-2">
          {STEPS.map(({ n, label }) => {
            const done = n < step, cur = n === step;
            return (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  "w-[26px] h-[26px] rounded-full flex items-center justify-center text-[13px] font-semibold flex-none",
                  done || cur ? "bg-brand text-white" : "bg-[#EEF0F3] text-tx-muted"
                )}>{n}</div>
                <span className={cn("text-[12px] font-medium flex-1",
                  cur ? "text-tx-dark font-semibold" : "text-tx-muted")}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="mt-6 flex flex-col gap-4">
            <p className="text-[14px] text-tx-light leading-[1.55]">
              Nhập email tài khoản. Chúng tôi sẽ gửi mã OTP gồm 6 chữ số đến hộp thư của bạn.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rp-email">Email</Label>
              <Input id="rp-email" type="email" placeholder="ten@viettel.com.vn" />
            </div>
            <Button className="w-full" onClick={() => setStep(2)}>Gửi mã OTP</Button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="mt-6 flex flex-col gap-4">
            <p className="text-[14px] text-tx-light leading-[1.55]">
              Mã OTP đã gửi tới <b className="text-tx-dark">ng***an@viettel.com.vn</b>. Có hiệu lực trong 5 phút.
            </p>
            <div className="flex gap-2.5 justify-between">
              {Array.from({ length: 6 }).map((_, i) => (
                <Input
                  key={i}
                  maxLength={1}
                  defaultValue={i < 3 ? ["4","9","2"][i] : ""}
                  className="w-12 h-14 text-center text-[22px] font-semibold p-0"
                />
              ))}
            </div>
            <p className="text-[13px] text-tx-light">
              Chưa nhận được mã?{" "}
              <span className="text-brand font-medium cursor-pointer">Gửi lại (42s)</span>
            </p>
            <Button className="w-full" onClick={() => setStep(3)}>Xác nhận</Button>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="np">Mật khẩu mới</Label>
              <Input id="np" type="password" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cp">Xác nhận mật khẩu mới</Label>
              <Input id="cp" type="password" />
            </div>
            <Button className="w-full" onClick={() => router.push("/login")}>Đặt lại mật khẩu</Button>
          </div>
        )}

        <div className="mt-5 text-center">
          <a href="/login" className="text-[13px] text-tx-light hover:text-tx-dark transition-colors">
            ← Quay lại đăng nhập
          </a>
        </div>
      </div>
    </div>
  );
}
