"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { navItems } from "@/data/mock-data";
import type { DbWorkspace, DbUser } from "@/lib/db/schema";

const pageTitles: Record<string, string> = {
  "/": "Product overview",
  "/projects": "Projects",
  "/tasks": "Tasks",
  "/messages": "Messages",
  "/calendar": "Calendar",
  "/reports": "Reports",
  "/settings": "Settings & Preferences",
};

type DashboardShellProps = {
  children: ReactNode;
  activeWorkspace?: DbWorkspace;
  workspaces?: DbWorkspace[];
  user?: Omit<DbUser, "passwordHash"> | null;
};

export function DashboardShell({ children, activeWorkspace, workspaces, user }: DashboardShellProps) {
  const pathname = usePathname();

  // If on authentication pages (login/signup), render full-screen without dashboard frame
  if (pathname === "/login" || pathname === "/signup") {
    return <>{children}</>;
  }

  const normalizedPath = pathname.startsWith("/projects") ? "/projects" : pathname;
  const title = pageTitles[normalizedPath] ?? "Product overview";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-8">
        <Sidebar
          navItems={navItems}
          pathname={pathname}
          activeWorkspace={activeWorkspace}
          workspaces={workspaces}
          user={user}
        />

        <main className="flex-1">
          <Header title={title} user={user} />
          {children}
        </main>
      </div>
    </div>
  );
}
