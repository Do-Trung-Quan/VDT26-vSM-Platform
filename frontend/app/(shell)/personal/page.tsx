"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Camera } from "lucide-react";

export default function PersonalPage() {
  const fields = [
    { label: "Họ và tên",   value: "Nguyễn Văn An" },
    { label: "Email",       value: "nguyen.van.an@viettel.com.vn" },
    { label: "Employee ID", value: "VT-04821", mono: true },
    { label: "Phòng ban",   value: "Phòng Kỹ thuật" },
    { label: "Vai trò",     value: "Quản trị viên" },
    { label: "Trạng thái",  value: "badge-active" },
  ];

  return (
    <div className="grid grid-cols-[1.4fr_1fr] gap-5 max-w-[940px]">

      {/* Personal info card */}
      <div className="bg-white border border-line rounded-[10px] p-6">
        <h2 className="text-[15px] font-bold">Thông tin cá nhân</h2>
        <p className="text-[13px] text-tx-light mt-1">Thông tin định danh do hệ thống quản lý, chỉ đọc.</p>

        {/* Avatar */}
        <div className="flex items-center gap-4 mt-6 mb-1">
          <div className="relative">
            <div className="w-[76px] h-[76px] rounded-full bg-gradient-to-br from-brand to-brand-dark text-white flex items-center justify-center font-semibold text-[26px]">
              AN
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Camera size={14} /> Đổi ảnh đại diện
          </Button>
        </div>

        <Separator className="my-5" />

        <div className="grid grid-cols-2 gap-x-5 gap-y-4">
          {fields.map(f => (
            <div key={f.label}>
              <p className="text-[12px] text-tx-muted mb-1">{f.label}</p>
              {f.value === "badge-active" ? (
                <Badge variant="active" className="text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-ok flex-none" /> Active
                </Badge>
              ) : (
                <p className={`text-[14px] font-medium ${f.mono ? "font-mono" : ""}`}>{f.value}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Change password card */}
      <div className="bg-white border border-line rounded-[10px] p-6 self-start">
        <h2 className="text-[15px] font-bold">Đổi mật khẩu</h2>
        <p className="text-[13px] text-tx-light mt-1">Cập nhật mật khẩu định kỳ để bảo mật tài khoản.</p>

        <div className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cur-pw">Mật khẩu hiện tại</Label>
            <Input id="cur-pw" type="password" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-pw">Mật khẩu mới</Label>
            <Input id="new-pw" type="password" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="conf-pw">Xác nhận mật khẩu mới</Label>
            <Input id="conf-pw" type="password" />
          </div>
          <Button className="w-full mt-1">Đổi mật khẩu</Button>
        </div>
      </div>
    </div>
  );
}
