"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ListChecks, LayoutDashboard, Users, Building2, User, LogOut,
} from "lucide-react";

const NAV_ALL = [
  { href: "/meetings",    label: "Cuộc họp",            icon: ListChecks,      admin: false },
  { href: "/dashboard",  label: "Dashboard",            icon: LayoutDashboard, admin: true  },
  { href: "/users",      label: "Quản lý User",         icon: Users,           admin: true  },
  { href: "/departments",label: "Quản lý Department",   icon: Building2,       admin: true  },
  { href: "/personal",   label: "Cá nhân",              icon: User,            admin: false },
];

interface SidebarProps { isAdmin: boolean; }

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const nav = NAV_ALL.filter(n => !n.admin || isAdmin);

  return (
    <aside className="w-[244px] flex-none bg-navy flex flex-col sticky top-0 h-screen">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="w-[34px] h-[34px] rounded-[8px] bg-brand flex items-center justify-center text-white font-bold text-base flex-none">
          M
        </div>
        <div>
          <div className="font-bold text-[15px] text-white leading-none">MP2</div>
          <div className="text-[11px] text-tx-muted mt-0.5">vSM · Transcription</div>
        </div>
      </div>

      <div className="h-px bg-white/[0.07] mx-4 mb-2.5" />

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-3 flex-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-[7px] text-[14px] font-medium transition-colors",
                active
                  ? "bg-brand text-white font-semibold"
                  : "text-[#9BA3B4] hover:bg-white/[0.06] hover:text-white"
              )}>
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/[0.07]">
        <Link href="/login"
          className="flex items-center gap-3 px-3 py-2.5 rounded-[7px] text-[14px] font-medium text-[#9BA3B4] hover:bg-white/[0.06] hover:text-white transition-colors">
          <LogOut size={18} />
          <span>Đăng xuất</span>
        </Link>
      </div>
    </aside>
  );
}
