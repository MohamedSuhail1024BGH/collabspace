"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import type { DbWorkspace, DbUser } from "@/lib/db/schema";
import { Logo } from "@/components/ui/Logo";
import { logoutAction } from "@/app/actions";

type SidebarProps = {
  navItems: string[];
  pathname: string;
  activeWorkspace?: DbWorkspace;
  workspaces?: DbWorkspace[];
  user?: Omit<DbUser, "passwordHash"> | null;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
};

const hrefLookup: Record<string, string> = {
  Overview: "/",
  Projects: "/projects",
  Tasks: "/tasks",
  Messages: "/messages",
  Calendar: "/calendar",
  Reports: "/reports",
  "Workspace Preferences": "/preferences",
  Preferences: "/preferences",
  Settings: "/settings",
};

const navIcons: Record<string, React.ReactNode> = {
  Overview: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
    </svg>
  ),
  Projects: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  Tasks: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  Messages: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  Calendar: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Reports: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  "Workspace Preferences": (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  ),
  Preferences: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  ),
  Settings: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

const defaultWorkspace: DbWorkspace = {
  id: "ws-acme",
  name: "Acme Corporation",
  slug: "acme",
  description: "Primary company workspace.",
  plan: "Pro",
  isPublic: true,
  createdAt: new Date().toISOString(),
};

export function Sidebar({
  navItems,
  pathname,
  activeWorkspace = defaultWorkspace,
  workspaces = [defaultWorkspace],
  user,
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logoutAction();
    router.push("/login");
    router.refresh();
  };

  const sidebarContent = (
    <aside
      data-testid="primary-sidebar"
      className="h-full w-full md:w-60 bg-surface-container-low border-r border-outline/20 flex flex-col justify-between select-none text-on-surface"
    >
      <div className="flex flex-col">
        {/* Top: CollabSpace Brand Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-outline/20 bg-surface-container-low">
          <div className="flex items-center gap-2.5">
            <Logo size={32} className="h-8 w-8" />
            <span className="font-semibold text-sm tracking-tight text-on-surface font-headline-sm">CollabSpace</span>
          </div>
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container md:hidden min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-95 cursor-pointer"
              aria-label="Close sidebar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Workspace Navigation Section */}
        <div className="px-3 pt-3">
          <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-on-surface-variant block mb-2 px-1">
            Workspace
          </span>
          <nav className="flex flex-col gap-1">
            {navItems
              .filter((item) => item !== "Settings")
              .map((item) => {
                const href = hrefLookup[item] || "/";
                const isActive =
                  item === "Overview"
                    ? pathname === "/"
                    : pathname === href || pathname.startsWith(`${href}/`);

                return (
                  <Link
                    key={item}
                    href={href}
                    onClick={onMobileClose}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded text-xs transition-colors font-medium ${
                      isActive
                        ? "bg-surface-container-highest text-primary font-semibold shadow-xs"
                        : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                    }`}
                  >
                    <span className={isActive ? "text-primary" : "text-on-surface-variant"}>
                      {navIcons[item] || null}
                    </span>
                    <span>{item}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </Link>
                );
              })}
          </nav>
        </div>
      </div>

      {/* Bottom Section: Expandable Workspace & Account Switcher */}
      <div
        className="p-2.5 sm:p-3 bg-surface-container-lowest border-t border-outline/20"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0.75rem)" }}
      >
        <WorkspaceSwitcher
          activeWorkspace={activeWorkspace}
          workspaces={workspaces}
          user={user}
          onLogout={handleLogout}
          onNavigate={onMobileClose}
        />
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <div className="hidden md:block fixed left-0 top-0 h-full w-60 z-30">
        {sidebarContent}
      </div>

      {/* Mobile Off-canvas Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-[70] md:hidden flex animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
          />
          <div className="relative z-10 w-72 max-w-[85vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
