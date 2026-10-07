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
import { FloatingSettingsModal } from "@/components/dashboard/FloatingSettingsModal";
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
  const [isProjectsSidebarOpen, setIsProjectsSidebarOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
    <div className="min-h-screen bg-background text-foreground antialiased w-full max-w-full overflow-x-clip">
      {/* Primary Navigation Sidebar */}
      <Sidebar
        navItems={navItems}
        pathname={pathname}
        activeWorkspace={activeWorkspace}
        workspaces={workspaces}
        user={user}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
        onOpenSettings={() => {
          setIsMobileOpen(false);
          setIsSettingsOpen(true);
        }}
      />

      {/* Main Layout Container (offset by primary sidebar on desktop) */}
      <div className="md:pl-60 flex flex-col min-h-screen w-full max-w-full overflow-x-clip">
        <Header
          title={title}
          user={user}
          activeWorkspaceName={activeWorkspace?.name}
          activeWorkspaceAvatar={activeWorkspace?.avatar}
          onToggleMobileMenu={() => setIsMobileOpen((prev) => !prev)}
          isProjectsSidebarOpen={isProjectsSidebarOpen}
          onToggleProjectsSidebar={
            pathname !== "/projects" && !isMessages
              ? () => setIsProjectsSidebarOpen((prev) => !prev)
              : undefined
          }
        />

        <div className="pt-14 flex-1 flex items-start min-w-0 w-full max-w-full">
          {/* Secondary Projects Sidebar (visible on overview and project detail views) */}
          {showProjectsSidebar && (
            <>
              <div
                className="w-60 shrink-0 hidden xl:block pointer-events-none"
                aria-hidden="true"
              />
              <SecondaryProjectsSidebar
                projects={projects}
                activeProjectId={activeProjectId}
                isOpen={isProjectsSidebarOpen}
                onClose={() => setIsProjectsSidebarOpen(false)}
              />
            </>
          )}

          {/* Main Content Area */}
          <main
            className={`flex-1 min-w-0 w-full max-w-full overflow-x-hidden transition-all ${
              isMessages
                ? "p-0 overflow-hidden flex flex-col h-[calc(100dvh-3.5rem)] md:h-[calc(100vh-3.5rem)]"
                : density === "compact"
                ? "p-2.5 sm:p-4 lg:p-5 pb-20 md:pb-5"
                : "p-3 sm:p-5 lg:p-6 pb-20 md:pb-6"
            }`}
          >
            {isMessages ? (
              children
            ) : (
              <div className="w-full max-w-[1720px] 2xl:max-w-[1880px] mx-auto min-w-0">
                {children}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Stitch-inspired Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        onOpenMenu={() => setIsMobileOpen(true)}
        isDrawerOpen={isMobileOpen}
      />

      {/* Floating Settings & System Preferences Modal */}
      <FloatingSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
      />
    </div>
  );
}
