"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import {
  SecondaryProjectsSidebar,
  type ProjectSidebarItem,
} from "@/components/dashboard/SecondaryProjectsSidebar";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { navItems } from "@/data/mock-data";
import type { DbWorkspace, DbUser } from "@/lib/db/schema";

const pageTitles: Record<string, string> = {
  "/": "Product overview",
  "/projects": "Projects",
  "/tasks": "Tasks",
  "/messages": "Messages",
  "/calendar": "Calendar",
  "/reports": "Reports",
  "/preferences": "Workspace Preferences",
  "/settings": "Settings & Preferences",
};

type DashboardShellProps = {
  children: ReactNode;
  activeWorkspace?: DbWorkspace;
  workspaces?: DbWorkspace[];
  user?: Omit<DbUser, "passwordHash"> | null;
  projects?: ProjectSidebarItem[];
};

export function DashboardShell({
  children,
  activeWorkspace,
  workspaces,
  user,
  projects = [],
}: DashboardShellProps) {
  const pathname = usePathname();
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [isProjectsSidebarOpen, setIsProjectsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

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
        const savedMode = localStorage.getItem("collabspace_theme_mode");
        if (savedMode) {
          document.documentElement.setAttribute("data-theme", savedMode);
        }
      } catch {
        // Ignore in SSR
      }
    };

    updatePrefs();
    window.addEventListener("collabspace_preferences_changed", updatePrefs);
    window.addEventListener("collabspace_theme_changed", updatePrefs);
    window.addEventListener("storage", updatePrefs);
    return () => {
      window.removeEventListener("collabspace_preferences_changed", updatePrefs);
      window.removeEventListener("collabspace_theme_changed", updatePrefs);
      window.removeEventListener("storage", updatePrefs);
    };
  }, []);

  // If on auth or start pages, render full-screen without dashboard frame
  if (pathname === "/login" || pathname === "/signup" || pathname === "/start") {
    return <>{children}</>;
  }

  const normalizedPath = pathname.startsWith("/projects") ? "/projects" : pathname;
  const title = pageTitles[normalizedPath] ?? "Product overview";

  // Extract active project id if on a project page
  const activeProjectId = pathname.startsWith("/projects/")
    ? pathname.replace("/projects/", "")
    : undefined;

  const isMessages = pathname === "/messages";
  const showProjectsSidebar = isProjectsSidebarOpen && pathname !== "/projects" && !isMessages;

  return (
    <div className="min-h-screen bg-surface text-on-surface antialiased transition-colors duration-200">
      {/* Primary Navigation Sidebar */}
      <Sidebar
        navItems={navItems}
        pathname={pathname}
        activeWorkspace={activeWorkspace}
        workspaces={workspaces}
        user={user}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />

      {/* Main Layout Container (offset by primary sidebar on desktop) */}
      <div className="md:pl-60 flex flex-col min-h-screen">
        <Header
          title={title}
          user={user}
          activeWorkspaceName={activeWorkspace?.name}
          onToggleMobileMenu={() => setIsMobileOpen((prev) => !prev)}
          isProjectsSidebarOpen={isProjectsSidebarOpen}
          onToggleProjectsSidebar={
            pathname !== "/projects" && !isMessages
              ? () => setIsProjectsSidebarOpen((prev) => !prev)
              : undefined
          }
        />

        <div className="pt-14 flex-1 flex min-w-0">
          {/* Secondary Projects Sidebar (visible on overview and project detail views) */}
          {showProjectsSidebar && (
            <SecondaryProjectsSidebar
              projects={projects}
              activeProjectId={activeProjectId}
              isOpen={isProjectsSidebarOpen}
              onClose={() => setIsProjectsSidebarOpen(false)}
            />
          )}

          {/* Main Content Area */}
          <main
            className={`flex-1 min-w-0 transition-all ${
              isMessages
                ? "p-0 overflow-hidden flex flex-col h-[calc(100dvh-3.5rem)] md:h-[calc(100vh-3.5rem)]"
                : density === "compact"
                ? "p-2.5 sm:p-4 lg:p-5 pb-20 md:pb-5"
                : "p-3 sm:p-5 lg:p-6 pb-20 md:pb-6"
            }`}
          >
            {children}
          </main>
        </div>
      </div>

      {/* Stitch-inspired Mobile Bottom Navigation Bar */}
      <MobileBottomNav onOpenMenu={() => setIsMobileOpen(true)} />
    </div>
  );
}
