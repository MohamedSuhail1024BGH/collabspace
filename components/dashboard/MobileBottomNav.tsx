"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type MobileBottomNavProps = {
  onOpenMenu: () => void;
  unreadCount?: number;
};

export function MobileBottomNav({ onOpenMenu, unreadCount = 0 }: MobileBottomNavProps) {
  const pathname = usePathname();

  // If on auth or start pages, do not render bottom nav
  if (pathname === "/login" || pathname === "/signup" || pathname === "/start") {
    return null;
  }

  const navLinks = [
    {
      label: "Overview",
      href: "/",
      isActive: pathname === "/",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z"
          />
        </svg>
      ),
    },
    {
      label: "Projects",
      href: "/projects",
      isActive: pathname.startsWith("/projects"),
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
      ),
    },
    {
      label: "Tasks",
      href: "/tasks",
      isActive: pathname.startsWith("/tasks"),
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
    },
    {
      label: "Messages",
      href: "/messages",
      isActive: pathname.startsWith("/messages"),
      badge: unreadCount > 0 ? unreadCount : undefined,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
    },
  ];

  return (
    <nav
      data-testid="mobile-bottom-nav"
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-container/95 backdrop-blur-xl border-t border-outline/20 px-2 py-1 flex items-center justify-around select-none transition-all duration-200"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0.35rem)" }}
    >
      {navLinks.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-lg transition-all active:scale-95 ${
            item.isActive
              ? "text-primary font-semibold"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <div className="relative">
            {item.icon}
            {item.badge ? (
              <span className="absolute -top-1 -right-2 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-on-secondary ring-1 ring-surface-container">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </div>
          <span className="text-[10px] font-mono tracking-tight mt-0.5">{item.label}</span>
          {item.isActive && (
            <span className="w-1 h-1 rounded-full bg-primary mt-0.5 animate-in fade-in zoom-in" />
          )}
        </Link>
      ))}

      {/* More / Menu trigger to open full drawer */}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open navigation menu"
        className="flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-lg text-on-surface-variant hover:text-on-surface transition-all active:scale-95 cursor-pointer"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
        <span className="text-[10px] font-mono tracking-tight mt-0.5">More</span>
      </button>
    </nav>
  );
}

