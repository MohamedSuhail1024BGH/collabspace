"use client";

import { useState } from "react";
import type { DbUser } from "@/lib/db/schema";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { NotificationCenter } from "@/components/ui/NotificationCenter";

import { Logo } from "@/components/ui/Logo";

type HeaderProps = {
  title: string;
  user?: Omit<DbUser, "passwordHash"> | null;
  activeWorkspaceName?: string;
  onToggleMobileMenu?: () => void;
  isProjectsSidebarOpen?: boolean;
  onToggleProjectsSidebar?: () => void;
};

export function Header({
  title,
  user,
  activeWorkspaceName,
  onToggleMobileMenu,
  isProjectsSidebarOpen,
  onToggleProjectsSidebar,
}: HeaderProps) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 md:left-60 left-0 right-0 h-14 bg-surface/90 backdrop-blur-xl z-40 border-b border-outline-variant/20 flex items-center justify-between px-3 sm:px-6 transition-all">
        {/* Left: Mobile Toggle + Logo + Breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all md:hidden focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-95"
            aria-label="Open mobile menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Stitch Mobile Brand Mark */}
          <div className="md:hidden flex items-center shrink-0">
            <Logo size={24} className="h-6 w-6" />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-on-surface-variant min-w-0">
            <span className="truncate max-w-[90px] sm:max-w-[140px] text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer font-medium">
              {activeWorkspaceName || "Acme Corporation"}
              {activeWorkspaceName || "Workspace"}
            </span>
            <span className="text-on-surface-variant/40">/</span>
            <h2 className="text-on-surface font-semibold truncate text-xs sm:text-sm font-headline-sm max-w-[120px] sm:max-w-none">{title}</h2>
          </div>
        </div>

        {/* Center / Search trigger */}
        <button
          type="button"
          onClick={() => setIsCommandPaletteOpen(true)}
          className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-lowest border border-outline-variant/20 text-xs text-on-surface-variant hover:border-primary/40 hover:text-on-surface transition-all w-52 lg:w-64 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
          title="Open Command Palette (Cmd+K)"
        >
          <svg className="h-3.5 w-3.5 shrink-0 text-on-surface-variant/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="flex-1 text-left truncate text-on-surface-variant/50 font-body-sm">Search or jump to...</span>
          <kbd className="stitch-kbd text-[9px]">⌘K</kbd>
        </button>

        {/* Right: Actions (Tested landmarks) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile search icon */}
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="md:hidden p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
            title="Search (Cmd+K)"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {onToggleProjectsSidebar && (
            <button
              type="button"
              data-testid="header-toggle-projects-btn"
              onClick={onToggleProjectsSidebar}
              title={isProjectsSidebarOpen ? "Collapse projects panel" : "Expand projects panel"}
              className="hidden lg:flex items-center gap-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 px-2.5 py-1 text-xs font-mono text-on-surface-variant hover:text-on-surface transition-all focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" />
              </svg>
              <span>{isProjectsSidebarOpen ? "Hide Projects" : "Show Projects"}</span>
            </button>
          )}

          <NotificationCenter />

          {user && (
            <>
              {/* Desktop user badge */}
              <div className="hidden sm:flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-lg bg-surface-container border border-outline-variant/15 select-none">
                <UserAvatar avatar={user.avatar} name={user.name} size="xs" showStatus />
                <span className="text-xs font-medium text-on-surface truncate max-w-[120px]">{user.name}</span>
              </div>
              {/* Mobile user avatar (Stitch mobile header spec) */}
              <div className="sm:hidden flex items-center shrink-0">
                <UserAvatar avatar={user.avatar} name={user.name} size="xs" showStatus />
              </div>
            </>
          )}
        </div>
      </header>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onOpen={() => setIsCommandPaletteOpen(true)}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </>
  );
}
