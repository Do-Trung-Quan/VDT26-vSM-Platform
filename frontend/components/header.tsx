"use client";
import { useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

const NOTIFICATIONS = [
  { id:"n1", message:'Cuộc họp "Họp giao ban kỹ thuật tuần 25" vừa được tạo trong phòng ban.', time:"5 phút trước", read:false },
  { id:"n2", message:'Cuộc họp "Review sprint 14" đã chuyển sang trạng thái PROCESSING.',      time:"1 giờ trước",  read:false },
  { id:"n3", message:'Admin đã cập nhật thông tin cuộc họp "Chốt phương án ngân sách Q3".',   time:"3 giờ trước",  read:false },
  { id:"n4", message:'Biên bản "Kickoff dự án nâng cấp hạ tầng Cloud" đã sẵn sàng.',         time:"Hôm qua",      read:true  },
];

interface HeaderProps {
  title: string;
  role: Role;
  onRoleChange: (r: Role) => void;
}

export function Header({ title, role, onRoleChange }: HeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const isAdmin = role === "ADMIN";
  const unread = NOTIFICATIONS.filter(n => !n.read).length;

  const seg = (active: boolean) =>
    cn("px-3 py-1.5 rounded-[5px] text-xs font-semibold cursor-pointer transition-all select-none",
      active ? "bg-white text-navy shadow-sm" : "text-tx-light hover:text-tx-dark");

  return (
    <header className="h-16 flex-none bg-white border-b border-line flex items-center justify-between px-7 sticky top-0 z-20">
      <div className="text-[18px] font-bold">{title}</div>

      <div className="flex items-center gap-4">
        {/* Role switcher (prototype helper) */}
        <div className="flex bg-surface border border-line rounded-[7px] p-0.5">
          <div onClick={() => onRoleChange("USER")}  className={seg(!isAdmin)}>User</div>
          <div onClick={() => onRoleChange("ADMIN")} className={seg(isAdmin)}>Admin</div>
        </div>

        {/* Bell */}
        <div className="relative cursor-pointer" onClick={() => setNotifOpen(v => !v)}>
          <Bell size={21} className="text-tx-mid" />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-2.5">
          <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-brand to-brand-dark text-white flex items-center justify-center font-semibold text-[14px]">
            AN
          </div>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold">Nguyễn Văn An</div>
            <div className="text-[11px] text-tx-light">{isAdmin ? "Quản trị viên" : "Nhân viên"}</div>
          </div>
        </div>
      </div>

      {/* Notification dropdown */}
      {notifOpen && (
        <div className="absolute top-[58px] right-20 w-[340px] bg-white border border-line rounded-[10px] shadow-[0_12px_32px_rgba(26,35,50,.14)] overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-line">
            <span className="font-semibold text-[14px]">Thông báo</span>
            <span className="text-[12px] text-brand font-medium cursor-pointer">Đánh dấu tất cả đã đọc</span>
          </div>
          {NOTIFICATIONS.map(n => (
            <div key={n.id} className={cn("flex gap-3 px-4 py-3 border-b border-[#F0F2F5]", !n.read && "bg-[#FFF7F8]")}>
              <span className={cn("w-2 h-2 rounded-full mt-1.5 flex-none", n.read ? "bg-line-dark" : "bg-brand")} />
              <div>
                <p className="text-[13px] leading-[1.45]">{n.message}</p>
                <p className="text-[11px] text-tx-muted mt-1">{n.time}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
