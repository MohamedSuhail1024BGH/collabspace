"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { MobileDrawer } from "@/components/dashboard/MobileDrawer";
import { CommandPalette } from "@/components/ui/CommandPalette";
import {
  SecondaryProjectsSidebar,
  type ProjectSidebarItem,
} from "@/components/dashboard/SecondaryProjectsSidebar";
import { navItems } from "@/data/mock-data";
import type { DbWorkspace, DbUser } from "@/lib/db/schema";
import { logoutAction } from "@/app/actions";

const pageTitles: Record<string, string> = {
  "/": "Product overview",
  "/projects": "Projects",
  "/tasks": "Tasks",
  "/messages": "Messages",
  "/calendar": "Calendar",
  "/reports": "Reports",
  "/preferences": "Settings & Preferences",
  "/settings": "Settings & Preferences",
};

const mobileSubtitles: Record<string, string> = {
  "/": "Overview",
  "/projects": "Projects",
  "/tasks": "Tasks",
  "/messages": "Messages",
  "/calendar": "Calendar",
  "/reports": "Reports",
  "/preferences": "Settings",
  "/settings": "Settings",
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
  const router = useRouter();
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [isProjectsSidebarOpen, setIsProjectsSidebarOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsMobileDrawerOpen(false);
  }

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

  const handleLogout = async () => {
    await logoutAction();
    router.push("/login");
    router.refresh();
  };

  // If on auth or start pages, render full-screen without dashboard frame
  if (pathname === "/login" || pathname === "/signup" || pathname === "/start") {
    return <>{children}</>;
  }

  const normalizedPath = pathname.startsWith("/projects") ? "/projects" : pathname;
  const title = pageTitles[normalizedPath] ?? "Product overview";
  const mobileSubtitle = mobileSubtitles[normalizedPath] ?? title;

  // Extract active project id if on a project page
  const activeProjectId = pathname.startsWith("/projects/")
    ? pathname.replace("/projects/", "")
    : undefined;

  const isMessages = pathname === "/messages";
  const showProjectsSidebar = isProjectsSidebarOpen && pathname !== "/projects" && !isMessages;

  return (
    <div className="min-h-screen min-h-dvh bg-surface text-on-surface antialiased transition-colors duration-200">
      {/* Primary Navigation Sidebar (Desktop) */}
      <Sidebar
        navItems={navItems}
        pathname={pathname}
        activeWorkspace={activeWorkspace}
        workspaces={workspaces}
        user={user}
        isMobileOpen={false}
        onMobileClose={() => {}}
      />

      {/* Mobile Header (< md) */}
      <MobileHeader
        title={mobileSubtitle}
        user={user}
        activeWorkspaceName={activeWorkspace?.name}
        onOpenDrawer={() => setIsMobileDrawerOpen(true)}
        onOpenSearch={() => setIsCommandPaletteOpen(true)}
      />

      {/* Mobile Slide-Out Auxiliary Drawer (< md) */}
      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        activeWorkspace={activeWorkspace}
        workspaces={workspaces}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Layout Container (offset by primary sidebar on desktop) */}
      <div className="md:pl-60 flex flex-col min-h-screen min-h-dvh">
        {/* Desktop Fixed Header (>= md) */}
        <Header
          title={title}
          user={user}
          activeWorkspaceName={activeWorkspace?.name}
          isProjectsSidebarOpen={isProjectsSidebarOpen}
          onToggleProjectsSidebar={
            pathname !== "/projects" && !isMessages
              ? () => setIsProjectsSidebarOpen((prev) => !prev)
              : undefined
          }
          onOpenSearch={() => setIsCommandPaletteOpen(true)}
        />

        <div className="pt-14 flex-1 flex min-w-0">
          {/* Secondary Projects Sidebar (visible on desktop overview and project detail views) */}
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
                ? "p-0 overflow-hidden flex flex-col h-[calc(100dvh-3.5rem)] pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0"
                : density === "compact"
                ? "p-2.5 sm:p-4 lg:p-5 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-6"
                : "p-3.5 sm:p-6 lg:p-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8"
            }`}
          >
            {children}
          </main>
        </div>
      </div>

      {/* Persistent Mobile Bottom Navigation Bar (< md) */}
      <MobileBottomNav
        user={user}
        activeWorkspaceName={activeWorkspace?.name}
        onLogout={handleLogout}
        onOpenSearch={() => setIsCommandPaletteOpen(true)}
        onOpenDrawer={() => setIsMobileDrawerOpen(true)}
      />

      {/* Global Command Palette (shared between desktop Cmd+K and mobile search icon) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onOpen={() => setIsCommandPaletteOpen(true)}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
}
