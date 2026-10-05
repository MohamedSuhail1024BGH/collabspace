"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import type { DbWorkspace, DbUser } from "@/lib/db/schema";
import { Logo } from "@/components/ui/Logo";
import { logoutAction } from "@/app/actions";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  MessageSquare,
  Calendar,
  BarChart3,
  Sliders,
  Settings,
  X,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

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

const navIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Overview: LayoutDashboard,
  Projects: FolderKanban,
  Tasks: CheckSquare,
  Messages: MessageSquare,
  Calendar: Calendar,
  Reports: BarChart3,
  "Workspace Preferences": Sliders,
  Preferences: Sliders,
  Settings: Settings,
};

const defaultWorkspace: DbWorkspace = {
  id: "ws-default",
  name: "Workspace",
  slug: "workspace",
  description: "Collaborative workspace.",
  plan: "Pro",
  isPublic: true,
  createdAt: new Date().toISOString(),
};

const NAV_GROUPS = [
  {
    title: "Planning",
    items: ["Overview", "Projects", "Tasks", "Calendar", "Reports"],
  },
  {
    title: "Communication",
    items: ["Messages"],
  },
  {
    title: "Preferences",
    items: ["Workspace Preferences"],
  },
];

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

  const renderGroup = (groupTitle: string, groupItems: string[]) => {
    const visibleItems = groupItems.filter(
      (item) => navItems.includes(item) && item !== "Settings"
    );
    if (visibleItems.length === 0) return null;

    return (
      <div key={groupTitle} className="pt-2">
        <div className="px-3 pb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground/70">
          {groupTitle}
        </div>
        <div className="flex flex-col gap-0.5">
          {visibleItems.map((item) => {
            const href = hrefLookup[item] || "/";
            const isActive =
              item === "Overview"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(`${href}/`);
            const IconComp = navIconMap[item] || LayoutDashboard;

            return (
              <Link
                key={item}
                href={href}
                onClick={onMobileClose}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-150 select-none cursor-pointer",
                  isActive
                    ? "bg-accent text-accent-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                )}
              >
                <IconComp
                  className={cn(
                    "size-4 shrink-0 transition-transform duration-150 group-hover:scale-105",
                    isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span className="truncate">{item}</span>
                {isActive && (
                  <span className="ml-auto size-1.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  const sidebarInner = (
    <div className="flex h-full w-full flex-col justify-between bg-card text-card-foreground">
      <div className="flex flex-col min-h-0 overflow-y-auto custom-scrollbar px-3 py-2">
        {/* Top Branding */}
        <div className="flex h-12 items-center justify-between px-2 pb-2 mb-1 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <Logo size={26} className="size-6.5" />
            <span className="text-sm font-bold tracking-tight text-foreground">
              CollabSpace
            </span>
          </div>
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className="md:hidden flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Grouped Navigation */}
        <nav className="flex flex-col gap-1">
          {NAV_GROUPS.map((group) => renderGroup(group.title, group.items))}
        </nav>
      </div>

      {/* Footer Switcher */}
      <div
        className="border-t border-border/80 bg-muted/20 p-3"
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
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        data-testid="primary-sidebar"
        className="hidden md:flex fixed left-0 top-0 z-30 h-full w-60 flex-col border-r border-border/80 bg-card/80 backdrop-blur-md shadow-xs"
      >
        {sidebarInner}
      </aside>

      {/* Mobile Drawer (Sheet) */}
      <Sheet open={isMobileOpen} onOpenChange={(open) => !open && onMobileClose?.()}>
        <SheetContent side="left" className="p-0 w-72 sm:max-w-xs border-r border-border/80 bg-card">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          {sidebarInner}
        </SheetContent>
      </Sheet>
    </>
  );
}
