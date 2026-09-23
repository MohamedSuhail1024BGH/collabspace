"use client";

import type { DbUser } from "@/lib/db/schema";
import { UserAvatar } from "@/components/ui/UserAvatar";

type MobileHeaderProps = {
  title: string;
  user?: Omit<DbUser, "passwordHash"> | null;
  activeWorkspaceName?: string;
  onOpenDrawer: () => void;
  onOpenSearch: () => void;
};

export function MobileHeader({
  title,
  user,
  activeWorkspaceName = "Acme Engineering",
  onOpenDrawer,
  onOpenSearch,
}: MobileHeaderProps) {
  return (
    <header
      data-testid="mobile-header"
      className="fixed top-0 inset-x-0 z-40 pt-safe bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline/20 shadow-[0_1px_8px_rgba(0,0,0,0.4)] md:hidden select-none"
    >
      <div className="h-14 px-3 flex items-center justify-between">
        {/* Left: Hamburger + Brand + Workspace Info */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onOpenDrawer}
            aria-label="Open mobile menu"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors active:scale-95 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-2 min-w-0 pr-1">
            {/* Bridge Logo Tile Block */}
            <div className="w-6 h-6 rounded bg-primary text-on-primary flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              C
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-mono text-[9px] text-primary tracking-wider uppercase leading-none truncate">
                {title || "CollabSpace"}
              </span>
              <button
                type="button"
                onClick={onOpenDrawer}
                data-testid="workspace-switcher-trigger"
                className="flex items-center gap-0.5 text-left text-on-surface text-xs font-semibold truncate hover:text-primary transition-colors py-0.5"
              >
                <span className="truncate max-w-[130px] sm:max-w-[180px]">{activeWorkspaceName}</span>
                <svg className="w-3.5 h-3.5 text-on-surface-variant shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Quick Search Button & User Avatar */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Quick Search & Command"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          <div className="w-8 h-8 flex items-center justify-center pl-0.5">
            <UserAvatar avatar={user?.avatar} name={user?.name} size="sm" showStatus />
          </div>
        </div>
      </div>
    </header>
  );
}
