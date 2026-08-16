"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { navItems } from "@/data/mock-data";

const pageTitles: Record<string, string> = {
  "/": "Product overview",
  "/projects": "Projects",
  "/tasks": "Tasks",
  "/messages": "Messages",
  "/calendar": "Calendar",
  "/reports": "Reports",
};

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Product overview";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-8">
        <Sidebar navItems={navItems} pathname={pathname} />

        <main className="flex-1">
          <Header title={title} />
          {children}
        </main>
      </div>
    </div>
  );
}
