"use client";

import { useState } from "react";
import type { DbUser } from "@/lib/db/schema";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { NotificationCenter } from "@/components/ui/NotificationCenter";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import {
  Menu,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
} from "lucide-react";

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
      <header className="fixed top-0 md:left-60 left-0 right-0 h-14 bg-card/90 backdrop-blur-xl z-40 border-b border-border flex items-center justify-between px-3 sm:px-6 transition-all">
        {/* Left: Mobile Toggle + Logo + Breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile hamburger menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMobileMenu}
            className="md:hidden size-9"
            aria-label="Open mobile menu"
          >
            <Menu className="size-5" />
          </Button>

          {/* Mobile Brand Mark */}
          <div className="md:hidden flex items-center shrink-0">
            <Logo size={24} className="size-6" />
          </div>

          {/* Breadcrumb Path */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground min-w-0">
            <span className="truncate max-w-[100px] sm:max-w-[140px] font-medium text-foreground hover:text-primary transition-colors cursor-pointer">
              {activeWorkspaceName || "Workspace"}
            </span>
            <ChevronRight className="size-3.5 text-muted-foreground/60 shrink-0" />
            <h2 className="text-foreground font-semibold truncate text-xs sm:text-sm max-w-[140px] sm:max-w-none">
              {title}
            </h2>
          </div>
        </div>

        {/* Center / Search trigger */}
        <button
          type="button"
          onClick={() => setIsCommandPaletteOpen(true)}
          className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-secondary/50 border border-input text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all w-52 lg:w-64 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          title="Open Command Palette (Cmd+K)"
        >
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-left truncate text-muted-foreground/70">
            Search or jump to...
          </span>
          <kbd className="inline-flex h-5 items-center gap-0.5 rounded border border-border bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </button>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile search icon */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="md:hidden size-9"
            title="Search (Cmd+K)"
          >
            <Search className="size-4" />
          </Button>

          {onToggleProjectsSidebar && (
            <Button
              variant="outline"
              size="sm"
              data-testid="header-toggle-projects-btn"
              onClick={onToggleProjectsSidebar}
              title={isProjectsSidebarOpen ? "Collapse projects panel" : "Expand projects panel"}
              className="hidden lg:flex items-center gap-1.5 h-8 text-xs font-medium"
            >
              {isProjectsSidebarOpen ? (
                <PanelLeftClose className="size-3.5" />
              ) : (
                <PanelLeftOpen className="size-3.5" />
              )}
              <span>{isProjectsSidebarOpen ? "Hide Projects" : "Show Projects"}</span>
            </Button>
          )}

          <NotificationCenter />

          {user && (
            <>
              {/* Desktop user badge */}
              <div className="hidden sm:flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-secondary/60 border border-border select-none">
                <UserAvatar avatar={user.avatar} name={user.name} size="xs" showStatus />
                <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                  {user.name}
                </span>
              </div>
              {/* Mobile user avatar */}
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
