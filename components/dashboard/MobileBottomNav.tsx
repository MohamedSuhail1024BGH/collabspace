"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  MessageSquare,
  Menu,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type MobileBottomNavProps = {
  onOpenMenu: () => void;
  unreadCount?: number;
  isDrawerOpen?: boolean;
};

export function MobileBottomNav({
  onOpenMenu,
  unreadCount = 0,
  isDrawerOpen = false,
}: MobileBottomNavProps) {
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/signup" || pathname === "/start") {
    return null;
  }

  const navLinks = [
    {
      label: "Overview",
      href: "/",
      isActive: pathname === "/",
      icon: LayoutDashboard,
    },
    {
      label: "Projects",
      href: "/projects",
      isActive: pathname.startsWith("/projects"),
      icon: FolderKanban,
    },
    {
      label: "Tasks",
      href: "/tasks",
      isActive: pathname.startsWith("/tasks"),
      icon: CheckSquare,
    },
    {
      label: "Messages",
      href: "/messages",
      isActive: pathname.startsWith("/messages"),
      badge: unreadCount > 0 ? unreadCount : undefined,
      icon: MessageSquare,
    },
  ];

  const isMoreActive =
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/preferences") ||
    pathname.startsWith("/settings");

  return (
    <nav
      data-testid="mobile-bottom-nav"
      aria-label="Mobile Navigation"
      className={cn(
        "md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border px-2 py-1.5 flex items-center justify-around select-none transition-all duration-200 shadow-lg",
        isDrawerOpen ? "opacity-0 pointer-events-none translate-y-full" : "opacity-100 translate-y-0"
      )}
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0.5rem)" }}
    >
      {navLinks.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 min-w-0 max-w-[76px] py-1 px-1.5 rounded-lg transition-all active:scale-95 touch-manipulation",
              item.isActive
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="relative flex items-center justify-center">
              <Icon className={cn("size-5 transition-transform", item.isActive && "scale-110")} />
              {item.badge ? (
                <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground ring-2 ring-card">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </div>
            <span className="text-[10px] font-medium tracking-tight mt-1 truncate">
              {item.label}
            </span>
            {item.isActive && (
              <span className="size-1 rounded-full bg-primary mt-0.5 animate-in fade-in zoom-in" />
            )}
          </Link>
        );
      })}

      {/* More / Menu Trigger */}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open navigation menu"
        className={cn(
          "flex flex-col items-center justify-center flex-1 min-w-0 max-w-[76px] py-1 px-1.5 rounded-lg transition-all active:scale-95 touch-manipulation cursor-pointer",
          isMoreActive
            ? "text-primary font-semibold"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Menu className={cn("size-5 transition-transform", isMoreActive && "scale-110")} />
        <span className="text-[10px] font-medium tracking-tight mt-1 truncate">More</span>
        {isMoreActive && (
          <span className="size-1 rounded-full bg-primary mt-0.5 animate-in fade-in zoom-in" />
        )}
      </button>
    </nav>
  );
}
