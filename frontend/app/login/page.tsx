"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="flex-[1.1] bg-navy flex flex-col justify-between p-14 relative overflow-hidden">
        <div className="absolute -top-[120px] -right-[120px] w-[360px] h-[360px] rounded-full bg-[radial-gradient(circle,rgba(238,0,51,.22),transparent_70%)]" />

        <div className="flex items-center gap-3 relative">
          <div className="w-[38px] h-[38px] rounded-[8px] bg-brand flex items-center justify-center text-white font-bold text-[18px]">M</div>
          <div className="font-bold text-[18px] text-white tracking-[.5px]">
            MP2 <span className="font-normal text-tx-muted">· vSM</span>
          </div>
        </div>

        <div className="relative">
          <h1 className="text-[34px] font-bold text-white leading-[1.25] max-w-[440px]">
            Hệ thống biên bản họp thông minh
          </h1>
          <p className="mt-4 text-[15px] text-[#9BA3B4] max-w-[420px] leading-[1.6]">
            Ghi âm trực tiếp, chuyển giọng nói thành văn bản kèm nhãn người nói,
            tóm tắt bằng AI và xuất biên bản PDF.
          </p>
        </div>

        <p className="relative text-[13px] text-[#6B7587]">Intelligent Meeting Transcription System</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="w-full max-w-[372px]">
          <h2 className="text-[24px] font-bold">Đăng nhập</h2>
          <p className="mt-1.5 text-[14px] text-tx-light">Sử dụng tài khoản nội bộ của bạn</p>

          <div className="mt-7 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue="nguyen.van.an@viettel.com.vn" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input id="password" type="password" defaultValue="password123" />
              <div className="text-right mt-0.5">
                <a href="/reset-password" className="text-[13px] text-brand font-medium hover:underline">
                  Quên mật khẩu?
                </a>
              </div>
            </div>
            <Button className="w-full h-11 text-[15px]" onClick={() => router.push("/meetings")}>
              Đăng nhập
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
