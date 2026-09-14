"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  useEffect(() => {
    const updatePrefs = () => {
      try {
        const savedDensity = localStorage.getItem("collabspace_density");
        if (savedDensity === "compact" || savedDensity === "comfortable") {
          setDensity(savedDensity);
          document.documentElement.setAttribute("data-density", savedDensity);
        }
        const savedTheme = localStorage.getItem("collabspace_accent_theme");
        if (savedTheme) {
          document.documentElement.setAttribute("data-accent", savedTheme.toLowerCase());
        }
      } catch {
        // Ignore in SSR
      }
    };

    updatePrefs();
    window.addEventListener("collabspace_preferences_changed", updatePrefs);
    window.addEventListener("storage", updatePrefs);
    return () => {
      window.removeEventListener("collabspace_preferences_changed", updatePrefs);
      window.removeEventListener("storage", updatePrefs);
    };
  }, []);

  // If on auth or start pages, render full-screen without dashboard frame
  if (pathname === "/login" || pathname === "/signup" || pathname === "/start") {
    return <>{children}</>;
  }

  const normalizedPath = pathname.startsWith("/projects") ? "/projects" : pathname;
  const title = pageTitles[normalizedPath] ?? "Product overview";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div
        className={`dashboard-shell-container mx-auto flex max-w-7xl transition-all duration-200 ${
          density === "compact"
            ? "gap-4 px-3 py-3.5 lg:px-5"
            : "gap-6 px-4 py-6 lg:px-8"
        }`}
      >
        <Sidebar
          navItems={navItems}
          pathname={pathname}
          activeWorkspace={activeWorkspace}
          workspaces={workspaces}
          user={user}
        />

        <main className="flex-1 min-w-0">
          <Header title={title} user={user} />
          {children}
        </main>
      </div>
    </div>
  );
}
