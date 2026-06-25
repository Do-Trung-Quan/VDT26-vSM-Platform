"use client";
import { useState } from "react";
import { Bell, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitials, getAvatarColor } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

const NOTIFICATIONS = [
  { id:"n1", message:'Cuộc họp "Họp giao ban kỹ thuật tuần 25" vừa được tạo.', time:"5 phút trước", read:false },
  { id:"n2", message:'Cuộc họp "Review sprint 14" đã chuyển sang PROCESSING.',  time:"1 giờ trước",  read:false },
  { id:"n3", message:'Admin cập nhật thông tin cuộc họp "Chốt ngân sách Q3".',  time:"3 giờ trước",  read:false },
  { id:"n4", message:'Biên bản "Kickoff nâng cấp hạ tầng Cloud" đã sẵn sàng.', time:"Hôm qua",      read:true  },
];

export function Header({ title }: { title: string }) {
  const { user, profile, logout } = useAuth();
  const router   = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const unread = NOTIFICATIONS.filter(n => !n.read).length;

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  // Ưu tiên dùng profile (User đầy đủ, kèm avatarUrl fresh); fallback về user (AuthUser) nếu profile chưa load
  const displayName = profile?.fullName ?? user?.fullName ?? "—";
  const displayRole = (profile?.role ?? user?.role) === "ADMIN" ? "Quản trị viên" : "Nhân viên";
  const avatarUrl   = profile?.avatarUrl ?? "";
  const initials    = profile ? getInitials(profile.fullName) : (user ? getInitials(user.fullName) : "??");
  const color       = profile ? getAvatarColor(profile.id) : (user ? getAvatarColor(user.id) : "#64748B");

  return (
    <header className="h-16 flex-none bg-white border-b border-line flex items-center justify-between px-7 sticky top-0 z-20">
      <div className="text-[18px] font-bold">{title}</div>

      <div className="flex items-center gap-4">
        {/* Bell */}
        <div className="relative cursor-pointer" onClick={() => setNotifOpen(v => !v)}>
          <Bell size={21} className="text-tx-mid" />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </div>

        {/* Avatar + tên */}
        <div className="flex items-center gap-2.5">
          {/* Hiện ảnh nếu có avatarUrl, ngược lại hiện vòng tròn chữ cái */}
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar"
              className="w-[34px] h-[34px] rounded-full object-cover flex-none"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <div className="w-[34px] h-[34px] rounded-full text-white flex items-center justify-center font-semibold text-[14px] flex-none"
              style={{ background: color }}>
              {initials}
            </div>
          )}
          <div className="leading-tight">
            <div className="text-[13px] font-semibold">{displayName}</div>
            <div className="text-[11px] text-tx-light">{displayRole}</div>
          </div>
        </div>

        {/* Logout */}
        <button onClick={handleLogout}
          className="w-8 h-8 rounded-[6px] flex items-center justify-center hover:bg-surface transition-colors text-tx-muted hover:text-brand"
          title="Đăng xuất">
          <LogOut size={16} />
        </button>
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
