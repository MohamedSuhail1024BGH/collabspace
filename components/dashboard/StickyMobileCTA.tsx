"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

export function StickyMobileCTA() {
  const pathname = usePathname();

  // Hide on auth, messages (has composer), start, and legal pages
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/start" ||
    pathname === "/messages" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/contact" ||
    pathname === "/thank-you"
  ) {
    return null;
  }

  // Context-aware target and label based on current route
  const isProjects = pathname.startsWith("/projects");
  const href = isProjects ? "/projects" : "/tasks";
  const label = isProjects ? "New Project" : "New Issue";

  return (
    <div
      className="fixed bottom-[4.5rem] right-4 z-40 md:hidden pointer-events-auto"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <Link
        href={href}
        className="group flex items-center gap-2 px-4 h-12 rounded-full bg-primary text-primary-foreground font-semibold text-xs shadow-xl active:scale-95 transition-all duration-200 border border-primary/20 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Quick action: ${label}`}
      >
        <div className="flex items-center justify-center size-5 rounded-full bg-primary-foreground/20 text-primary-foreground">
          <Plus className="size-3.5 stroke-[2.5]" aria-hidden="true" />
        </div>
        <span className="tracking-tight">{label}</span>
      </Link>
    </div>
  );
}
