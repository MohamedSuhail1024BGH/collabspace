"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DbWorkspace, DbUser } from "@/lib/db/schema";
import { WorkspaceSwitcher } from "@/components/dashboard/WorkspaceSwitcher";

type MobileDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  activeWorkspace?: DbWorkspace;
  workspaces?: DbWorkspace[];
  user?: Omit<DbUser, "passwordHash"> | null;
  onLogout: () => Promise<void>;
  unreadMessagesCount?: number;
};

const navigationItems = [
  {
    name: "Overview",
    href: "/",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    name: "Projects",
    href: "/projects",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    name: "Tasks",
    href: "/tasks",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    name: "Messages",
    href: "/messages",
    hasBadge: true,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    name: "Calendar",
    href: "/calendar",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    name: "Reports",
    href: "/reports",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    name: "Settings",
    href: "/settings",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const defaultWorkspace: DbWorkspace = {
  id: "ws-acme",
  name: "Acme Corporation",
  slug: "acme",
  description: "Primary company workspace.",
  plan: "Pro",
  isPublic: true,
  createdAt: new Date().toISOString(),
};

export function MobileDrawer({
  isOpen,
  onClose,
  activeWorkspace = defaultWorkspace,
  workspaces = [defaultWorkspace],
  user,
  onLogout,
  unreadMessagesCount = 0,
}: MobileDrawerProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <div
      data-testid="mobile-drawer"
      className="fixed inset-0 z-50 md:hidden flex h-dvh max-h-dvh overflow-hidden select-none"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        data-testid="primary-sidebar"
        className="relative z-10 w-72 max-w-[82vw] h-full max-h-dvh bg-surface-container-lowest border-r border-outline/20 flex flex-col pt-safe pb-safe shadow-2xl animate-in slide-in-from-left duration-200"
      >
        {/* Top Header */}
        <div className="p-4 flex items-center justify-between border-b border-outline/15 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-primary text-on-primary flex items-center justify-center font-bold text-xs shadow-xs">
              C
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-xs tracking-tight text-on-surface truncate">
                {activeWorkspace?.name || "CollabSpace"}
              </span>
              <span className="font-mono text-[9px] text-secondary">
                {activeWorkspace?.plan || "Pro"} Tier
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 custom-scrollbar">
          {/* Workspace Navigation */}
          <div className="space-y-1">
            <span className="px-2 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant/70 font-semibold block mb-1">
              Workspace
            </span>
            {navigationItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors font-medium ${
                    isActive
                      ? "bg-surface-container-high text-primary font-semibold shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={isActive ? "text-primary" : "text-on-surface-variant"}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </div>
                  {item.hasBadge && unreadMessagesCount > 0 ? (
                    <span className="px-1.5 py-0.5 bg-primary text-on-primary font-mono text-[10px] rounded font-bold">
                      {unreadMessagesCount}
                    </span>
                  ) : isActive ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Footer: Workspace & Account Switcher */}
        <div
          data-testid="sidebar-footer"
          className="p-2.5 bg-surface-container-lowest border-t border-outline/15 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
        >
          <WorkspaceSwitcher
            activeWorkspace={activeWorkspace}
            workspaces={workspaces}
            user={user}
            onLogout={onLogout}
            onNavigate={onClose}
          />
        </div>
      </aside>
    </div>
  );
}
