"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

const PAGE_TITLES: Record<string, string> = {
  "/meetings":     "Cuộc họp",
  "/dashboard":    "Dashboard",
  "/users":        "Quản lý User",
  "/departments":  "Quản lý Department",
  "/personal":     "Cá nhân",
};

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "MP2";

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} />
        <main className="flex-1 p-7 pb-10 min-w-0">{children}</main>
      </div>
    </div>
  );
}
