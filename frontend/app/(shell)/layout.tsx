"use client";
import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import type { Role } from "@/lib/types";
import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/meetings":     "Cuộc họp",
  "/dashboard":   "Dashboard",
  "/users":       "Quản lý User",
  "/departments": "Quản lý Department",
  "/personal":    "Cá nhân",
};

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>("ADMIN");
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "MP2";

  return (
    <div className="flex min-h-screen">
      <Sidebar isAdmin={role === "ADMIN"} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} role={role} onRoleChange={setRole} />
        <main className="flex-1 p-7 pb-10 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
