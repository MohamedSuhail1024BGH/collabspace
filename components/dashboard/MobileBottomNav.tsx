"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { DbUser } from "@/lib/db/schema";

type MobileBottomNavProps = {
  unreadMessagesCount?: number;
  user?: Omit<DbUser, "passwordHash"> | null;
  activeWorkspaceName?: string;
  onLogout?: () => Promise<void>;
  onOpenSearch?: () => void;
  onOpenDrawer?: () => void;
};

export function MobileBottomNav({
  unreadMessagesCount = 0,
  user,
  activeWorkspaceName,
  onLogout,
  onOpenSearch,
  onOpenDrawer,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsMoreOpen(false);
  }

  const isHomeActive = pathname === "/";
  const isProjectsActive = pathname.startsWith("/projects");
  const isTasksActive = pathname.startsWith("/tasks");
  const isMessagesActive = pathname.startsWith("/messages");
  const isMoreActive =
    isMoreOpen ||
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/preferences");

  return (
    <>
      {/* Persistent Mobile Bottom Navigation Bar (< md) */}
      <nav
        data-testid="mobile-bottom-nav"
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 z-40 pb-safe bg-surface-container-lowest/90 backdrop-blur-xl border-t border-outline/20 shadow-[0_-1px_8px_rgba(0,0,0,0.4)] md:hidden select-none"
      >
        <div className="flex items-center justify-around h-16 px-2">
          {/* Home */}
          <Link
            href="/"
            aria-current={isHomeActive ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-12 rounded-lg transition-all active:scale-95 ${
              isHomeActive
                ? "text-primary font-medium bg-surface-container-high/60"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
            <span className="text-[11px] font-medium tracking-tight">Home</span>
          </Link>

          {/* Projects */}
          <Link
            href="/projects"
            aria-current={isProjectsActive ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-12 rounded-lg transition-all active:scale-95 ${
              isProjectsActive
                ? "text-primary font-medium bg-surface-container-high/60"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <span className="text-[11px] font-medium tracking-tight">Projects</span>
          </Link>

          {/* Tasks */}
          <Link
            href="/tasks"
            aria-current={isTasksActive ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-12 rounded-lg transition-all active:scale-95 ${
              isTasksActive
                ? "text-primary font-medium bg-surface-container-high/60"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-[11px] font-medium tracking-tight">Tasks</span>
          </Link>

          {/* Messages */}
          <Link
            href="/messages"
            aria-current={isMessagesActive ? "page" : undefined}
            className={`relative flex flex-col items-center justify-center gap-1 flex-1 h-12 rounded-lg transition-all active:scale-95 ${
              isMessagesActive
                ? "text-primary font-medium bg-surface-container-high/60"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <div className="relative flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-2 px-1 py-0.2 bg-primary text-on-primary font-mono text-[10px] leading-tight rounded-full font-bold">
                  {unreadMessagesCount}
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium tracking-tight">Messages</span>
          </Link>

          {/* More Action Sheet Trigger */}
          <button
            type="button"
            onClick={() => setIsMoreOpen((prev) => !prev)}
            aria-label="Open more navigation"
            aria-expanded={isMoreOpen}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-12 rounded-lg transition-all active:scale-95 ${
              isMoreActive
                ? "text-primary font-medium bg-surface-container-high/60"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
              />
            </svg>
            <span className="text-[11px] font-medium tracking-tight">More</span>
          </button>
        </div>
      </nav>

      {/* Slide-up Native Mobile "More" Sheet Modal */}
      {isMoreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-in fade-in duration-200 md:hidden"
            onClick={() => setIsMoreOpen(false)}
            aria-hidden="true"
          />

          {/* More Sheet Container */}
          <div
            data-testid="mobile-more-sheet"
            className="fixed bottom-0 inset-x-0 z-50 rounded-t-2xl bg-surface-container border-t border-outline/25 shadow-2xl p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] animate-in slide-in-from-bottom duration-200 select-none max-h-[85vh] overflow-y-auto md:hidden"
          >
            {/* Drag Handle */}
            <div className="w-10 h-1 bg-outline/40 rounded-full mx-auto mb-3" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-outline/15">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-on-surface">More Navigation</span>
                {activeWorkspaceName && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-surface-container-high text-secondary border border-secondary/20 truncate max-w-[160px]">
                    {activeWorkspaceName}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                aria-label="Close more sheet"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Desktop-Matching Secondary Routes */}
            <div className="grid grid-cols-1 gap-2 pt-3">
              {/* Calendar */}
              <Link
                href="/calendar"
                onClick={() => setIsMoreOpen(false)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.99] ${
                  pathname.startsWith("/calendar")
                    ? "bg-surface-container-high border-primary/40 text-on-surface shadow-xs"
                    : "bg-surface-container-low border-outline/15 text-on-surface hover:border-outline/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-on-surface">Calendar</div>
                    <div className="text-[11px] text-on-surface-variant">Sprints, releases & deadlines</div>
                  </div>
                </div>
                <svg className="w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              {/* Reports */}
              <Link
                href="/reports"
                onClick={() => setIsMoreOpen(false)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.99] ${
                  pathname.startsWith("/reports")
                    ? "bg-surface-container-high border-primary/40 text-on-surface shadow-xs"
                    : "bg-surface-container-low border-outline/15 text-on-surface hover:border-outline/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-on-surface">Reports</div>
                    <div className="text-[11px] text-on-surface-variant">Velocity, metrics & insights</div>
                  </div>
                </div>
                <svg className="w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              {/* Settings */}
              <Link
                href="/settings"
                onClick={() => setIsMoreOpen(false)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.99] ${
                  pathname.startsWith("/settings") || pathname.startsWith("/preferences")
                    ? "bg-surface-container-high border-primary/40 text-on-surface shadow-xs"
                    : "bg-surface-container-low border-outline/15 text-on-surface hover:border-outline/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-tertiary/10 border border-tertiary/20 flex items-center justify-center text-tertiary shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-on-surface">Settings</div>
                    <div className="text-[11px] text-on-surface-variant">Preferences, appearance & workspace</div>
                  </div>
                </div>
                <svg className="w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Quick Search & Command Palette Button */}
            {onOpenSearch && (
              <button
                type="button"
                onClick={() => {
                  setIsMoreOpen(false);
                  onOpenSearch();
                }}
                className="w-full mt-2.5 flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low border border-outline/15 text-on-surface-variant hover:text-on-surface transition-colors text-xs font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-surface-container-high flex items-center justify-center text-primary">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <span>Quick Search & Commands</span>
                </div>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-surface-container-high rounded border border-outline/20 text-on-surface-variant">
                  ⌘K
                </kbd>
              </button>
            )}

            {/* User Account Bar & Logout */}
            <div className="mt-3 pt-3 border-t border-outline/15 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar avatar={user?.avatar} name={user?.name} size="sm" showStatus />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-on-surface truncate">
                    {user?.name || "Member"}
                  </span>
                  <span className="text-[10px] font-mono text-on-surface-variant truncate">
                    {user?.email || "active"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {onOpenDrawer && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreOpen(false);
                      onOpenDrawer();
                    }}
                    title="Open full workspace drawer"
                    aria-label="Open workspace drawer"
                    className="p-2 rounded-lg border border-outline/20 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                )}
                {onLogout && (
                  <button
                    type="button"
                    onClick={async () => {
                      setIsMoreOpen(false);
                      await onLogout();
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-error/30 text-error hover:bg-error-container/20 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign out</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
