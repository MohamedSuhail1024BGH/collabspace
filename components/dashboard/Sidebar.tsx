"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import type { DbWorkspace, DbUser } from "@/lib/db/schema";
import { logoutAction } from "@/app/actions";

type SidebarProps = {
  navItems: string[];
  pathname: string;
  activeWorkspace?: DbWorkspace;
  workspaces?: DbWorkspace[];
  user?: Omit<DbUser, "passwordHash"> | null;
};

const hrefLookup: Record<string, string> = {
  Overview: "/",
  Projects: "/projects",
  Tasks: "/tasks",
  Messages: "/messages",
  Calendar: "/calendar",
  Reports: "/reports",
  Settings: "/settings",
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
}: SidebarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logoutAction();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="sidebar-container hidden w-72 shrink-0 rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/30 lg:flex lg:flex-col transition-all duration-200">
      <WorkspaceSwitcher activeWorkspace={activeWorkspace} workspaces={workspaces} />

      <div className="mb-4">
        <Link
          href="/start"
          data-testid="sidebar-start-hub-btn"
          className="theme-accent-badge flex items-center justify-between rounded-2xl border px-3.5 py-2.5 text-xs font-semibold transition hover:opacity-90"
        >
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span>Start Hub</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider opacity-80">All Workspaces</span>
        </Link>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const href = hrefLookup[item];
          const isActive = pathname === href;

          return (
            <Link
              key={item}
              href={href}
              className={[
                "flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm transition font-medium",
                isActive
                  ? "theme-nav-active font-semibold"
                  : "text-slate-300 hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              <span>{item}</span>
              {isActive ? <span className="text-xs opacity-90">Live</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="theme-focus-card mt-auto rounded-2xl border p-4 transition-all">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Focus sprint</p>
        <p className="mt-3 text-xl font-semibold text-white">Launch readiness</p>
        <p className="mt-2 text-sm text-slate-300">12 milestones left before the next release.</p>
      </div>

      {/* Logged In User Profile & Logout */}
      {user && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-xs font-bold text-white shadow">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-white">{user.name}</p>
              <p className="truncate text-[10px] text-slate-400">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            data-testid="logout-button"
            onClick={handleLogout}
            title="Log out"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-rose-400"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      )}
    </aside>
  );
}
