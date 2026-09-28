"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createWorkspaceAction,
  switchWorkspaceAction,
  joinWorkspaceAction,
  searchUsersAction,
  searchWorkspacesAction,
  logoutAction,
} from "@/app/actions";
import type { DbUser } from "@/lib/db/schema";
import { FloatingSettingsModal } from "@/components/dashboard/FloatingSettingsModal";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Logo } from "@/components/ui/Logo";

type UserWorkspaceItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  plan: string;
  isPublic: boolean;
  createdAt: string;
  userRole: string;
  memberCount: number;
  projectCount: number;
};

type PublicWorkspaceItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  plan: string;
  isPublic: boolean;
  createdAt: string;
  memberCount: number;
};

type StartClientProps = {
  user: Omit<DbUser, "passwordHash">;
  userWorkspaces: UserWorkspaceItem[];
  publicWorkspaces: PublicWorkspaceItem[];
};

export function StartClient({
  user,
  userWorkspaces: initialUserWorkspaces,
  publicWorkspaces: initialPublicWorkspaces,
}: StartClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Expandable User Account Menu State
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Active view tab
  const [activeTab, setActiveTab] = useState<"workspaces" | "discover_workspaces" | "discover_users">("workspaces");

  // Create Workspace Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDesc, setWorkspaceDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  // Search Workspaces State
  const [wsSearchQuery, setWsSearchQuery] = useState("");
  const [filteredWorkspaces, setFilteredWorkspaces] = useState<PublicWorkspaceItem[]>(initialPublicWorkspaces);

  // Search Users State
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; name: string; username: string | null; email: string; avatar: string | null; bio: string | null }[]
  >([]);
  const [hasSearchedUsers, setHasSearchedUsers] = useState(false);

  // Logout handler
  const handleLogout = async () => {
    await logoutAction();
    router.push("/login");
    router.refresh();
  };

  // Launch workspace handler
  const handleLaunchWorkspace = (workspaceId: string) => {
    startTransition(async () => {
      await switchWorkspaceAction(workspaceId);
      router.push("/");
      router.refresh();
    });
  };

  // Create workspace handler
  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;

    startTransition(async () => {
      const res = await createWorkspaceAction({
        name: workspaceName.trim(),
        description: workspaceDesc.trim(),
        plan: "Pro",
        isPublic,
      });

      if (res.success && res.id) {
        await switchWorkspaceAction(res.id);
        setShowCreateModal(false);
        router.push("/");
        router.refresh();
      }
    });
  };

  // Join public workspace handler
  const handleJoinWorkspace = (workspaceId: string) => {
    startTransition(async () => {
      const res = await joinWorkspaceAction(workspaceId);
      if (res.success) {
        await switchWorkspaceAction(workspaceId);
        router.push("/");
        router.refresh();
      }
    });
  };

  // Live filter workspaces
  const handleWorkspaceSearch = async (q: string) => {
    setWsSearchQuery(q);
    if (!q.trim()) {
      setFilteredWorkspaces(initialPublicWorkspaces);
      return;
    }
    const res = await searchWorkspacesAction(q);
    setFilteredWorkspaces(res);
  };

  // Live search users
  const handleUserSearch = async (q: string) => {
    setUserSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      setHasSearchedUsers(false);
      return;
    }
    const users = await searchUsersAction(q);
    setSearchResults(users);
    setHasSearchedUsers(true);
  };

  const isMemberOf = (workspaceId: string) => {
    return initialUserWorkspaces.some((w) => w.id === workspaceId);
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      {/* Top Header (Stitch Precision Engineering Dark) */}
      <header className="border-b border-outline/10 bg-surface-container-low sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo size={36} className="h-9 w-9 shadow-xs" />
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold tracking-tight text-on-surface">CollabSpace</span>
              <span className="rounded bg-surface-container-high border border-outline-variant/20 px-2 py-0.5 text-[10px] font-mono font-medium text-secondary">
                LAUNCHPAD
              </span>
            </div>

            {/* Real-time SSE Network Status Chip */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-lowest border border-outline-variant/20 font-mono text-[11px] text-on-surface-variant select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse ring-2 ring-secondary/25"></span>
              <span className="text-secondary font-medium">SSE Connected</span>
            </div>
          </div>

          {/* Expandable User Account Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              data-testid="start-user-dropdown-trigger"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-2.5 rounded-lg bg-surface-lowest hover:bg-surface-container border border-outline-variant/20 p-1.5 pr-2.5 text-xs transition-all group focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none select-none"
            >
              <UserAvatar avatar={user.avatar} name={user.name} size="sm" showStatus />

              <div className="text-left hidden sm:block">
                <p className="text-xs font-medium text-on-surface leading-tight group-hover:text-primary transition-colors">
                  {user.name}
                </p>
                <p className="text-[10px] font-mono text-primary leading-tight">
                  @{user.username || "user"}
                </p>
              </div>

              <svg
                className={`h-4 w-4 text-on-surface-variant group-hover:text-on-surface transition-transform duration-200 ${
                  isUserMenuOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Downward Popover Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-lg bg-surface-container-high border border-outline/20 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 z-50 select-none">
                {/* User Header Info */}
                <div className="px-2 py-1.5 border-b border-outline/10 mb-1">
                  <p className="text-xs font-medium text-on-surface truncate">{user.name}</p>
                  <p className="text-[10px] font-mono text-on-surface-variant truncate">{user.email}</p>
                </div>

                <div className="space-y-0.5">
                  {/* Option 1: Settings */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setShowSettingsModal(true);
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors font-body-sm"
                  >
                    <svg className="h-3.5 w-3.5 text-on-surface-variant shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Settings</span>
                  </button>

                  {/* Option 2: Logout */}
                  <button
                    type="button"
                    data-testid="logout-button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-error/90 hover:bg-error/10 hover:text-error transition-colors font-body-sm"
                  >
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 w-full">
        {/* Welcome Command Strip */}
        <div className="mb-6 rounded-xl border border-outline/20 bg-surface-container-low p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-secondary font-medium">
                  Welcome to CollabSpace
                </span>
                <span className="text-on-surface-variant text-[10px]">·</span>
                <span className="text-[10px] font-mono text-on-surface-variant">SYS-ONLINE</span>
              </div>
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-on-surface">
                Ready to collaborate, {user.name}?
              </h1>
              <p className="mt-1 max-w-2xl text-xs font-mono text-on-surface-variant leading-relaxed">
                You are logged in as <span className="text-primary font-semibold">@{user.username || "user"}</span>.
                Choose a workspace to launch into, search for public teams, or discover fellow members.
              </p>
            </div>

            <button
              type="button"
              data-testid="start-create-workspace-btn"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-4 py-2.5 text-xs font-medium shadow-xs transition active:scale-[0.98] min-h-[40px]"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create New Workspace</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Stitch Minimalist Segment Control - Scrollable on mobile) */}
        <div className="mb-5 border-b border-outline/10 pb-2.5">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none whitespace-nowrap -mx-4 px-4 sm:mx-0 sm:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x">
            <button
              type="button"
              data-testid="tab-my-workspaces"
              onClick={() => setActiveTab("workspaces")}
              className={`shrink-0 inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-mono transition-all select-none border ${
                activeTab === "workspaces"
                  ? "bg-surface-container-high text-primary border-primary/40 font-medium shadow-xs"
                  : "border-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              <svg className="h-4 w-4 shrink-0 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>My Workspaces</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                activeTab === "workspaces"
                  ? "bg-primary/20 text-primary font-semibold"
                  : "bg-surface-lowest text-on-surface-variant"
              }`}>
                {initialUserWorkspaces.length}
              </span>
            </button>

            <button
              type="button"
              data-testid="tab-discover-workspaces"
              onClick={() => setActiveTab("discover_workspaces")}
              className={`shrink-0 inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-mono transition-all select-none border ${
                activeTab === "discover_workspaces"
                  ? "bg-surface-container-high text-primary border-primary/40 font-medium shadow-xs"
                  : "border-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              <svg className="h-4 w-4 shrink-0 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search Workspaces</span>
            </button>

            <button
              type="button"
              data-testid="tab-discover-users"
              onClick={() => setActiveTab("discover_users")}
              className={`shrink-0 inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-mono transition-all select-none border ${
                activeTab === "discover_users"
                  ? "bg-surface-container-high text-primary border-primary/40 font-medium shadow-xs"
                  : "border-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              <svg className="h-4 w-4 shrink-0 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Find People (@User Directory)</span>
            </button>
          </div>
        </div>

        {/* TAB 1: MY WORKSPACES */}
        {activeTab === "workspaces" && (
          <section>
            {initialUserWorkspaces.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {initialUserWorkspaces.map((ws) => (
                  <div
                    key={ws.id}
                    data-testid={`workspace-card-${ws.slug}`}
                    className="group relative flex flex-col justify-between rounded-xl border border-outline-variant/20 bg-surface-container p-5 shadow-xs transition-all duration-150 hover:border-primary/40 hover:bg-surface-high"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-lowest border border-outline-variant/20 text-sm font-mono font-bold text-primary shadow-xs">
                          {ws.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono text-xs px-2 py-0.5 rounded-md bg-surface-lowest border border-outline-variant/20 uppercase tracking-wider font-medium ${
                            ws.userRole === "owner"
                              ? "text-secondary border-secondary/30"
                              : ws.userRole === "admin"
                              ? "text-primary border-primary/30"
                              : "text-on-surface-variant"
                          }`}>
                            {ws.userRole}
                          </span>
                        </div>
                      </div>

                      <h3 className="mt-3 text-sm font-bold text-on-surface group-hover:text-primary transition-colors font-headline-sm">
                        {ws.name}
                      </h3>
                      <p className="text-[11px] font-mono text-on-surface-variant">#{ws.slug}</p>
                      <p className="mt-1.5 line-clamp-2 text-xs text-on-surface-variant leading-relaxed font-body-sm">
                        {ws.description || "Shared collaborative workspace for high-velocity teams."}
                      </p>
                    </div>

                    <div className="mt-5 border-t border-outline-variant/15 pt-3.5">
                      <div className="mb-3 flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
                        <span className="px-2 py-0.5 rounded-md bg-surface-lowest border border-outline-variant/15">
                          {ws.memberCount} member{ws.memberCount === 1 ? "" : "s"}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-surface-lowest border border-outline-variant/15">
                          {ws.projectCount} project{ws.projectCount === 1 ? "" : "s"}
                        </span>
                      </div>

                      <button
                        type="button"
                        data-testid={`launch-workspace-${ws.slug}`}
                        disabled={isPending}
                        onClick={() => handleLaunchWorkspace(ws.id)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-3 py-2 text-xs font-medium transition-all disabled:opacity-50 shadow-xs focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
                      >
                        <span>Launch Workspace</span>
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-outline/20 bg-surface-container-lowest p-8 sm:p-10 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-surface-container-high text-primary shadow-xs">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-on-surface">No joined workspaces yet</h3>
                <p className="mt-1 text-xs font-mono text-on-surface-variant max-w-md mx-auto leading-relaxed">
                  You are not a member of any workspace yet. Create your first workspace or discover and join existing public workspaces.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center justify-center rounded-lg bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-4 py-2 text-xs font-medium transition min-h-[38px] active:scale-[0.98]"
                  >
                    Create Workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("discover_workspaces")}
                    className="inline-flex items-center justify-center rounded-lg bg-surface-container-high hover:bg-surface-container-highest border border-outline/20 px-4 py-2 text-xs font-medium text-on-surface transition min-h-[38px] active:scale-[0.98]"
                  >
                    Browse Workspaces
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 2: DISCOVER WORKSPACES */}
        {activeTab === "discover_workspaces" && (
          <section className="space-y-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-on-surface-variant pointer-events-none">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                data-testid="search-workspaces-input"
                value={wsSearchQuery}
                onChange={(e) => handleWorkspaceSearch(e.target.value)}
                placeholder="Search public workspaces by name, #slug, or description..."
                className="w-full rounded-lg bg-surface-container-lowest border border-outline/20 pl-9 pr-4 py-2.5 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none transition font-mono min-h-[40px]"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredWorkspaces.map((ws) => {
                const member = isMemberOf(ws.id);
                return (
                  <div
                    key={ws.id}
                    className="flex flex-col justify-between rounded-xl border border-outline/20 bg-surface-container-low p-5 shadow-xs transition hover:border-outline/40"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-high border border-outline/20 text-sm font-mono font-bold text-primary shadow-xs">
                          {ws.name.charAt(0).toUpperCase()}
                        </div>
                      </div>

                      <h3 className="mt-3 text-sm font-bold text-on-surface">{ws.name}</h3>
                      <p className="text-[11px] font-mono text-on-surface-variant">#{ws.slug}</p>
                      <p className="mt-1.5 line-clamp-2 text-xs text-on-surface-variant leading-relaxed font-body-sm">
                        {ws.description || "Public collaborative space."}
                      </p>
                    </div>

                    <div className="mt-5 border-t border-outline/10 pt-3.5 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-on-surface-variant shrink-0">{ws.memberCount} members</span>
                      {member ? (
                        <button
                          type="button"
                          onClick={() => handleLaunchWorkspace(ws.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-surface-container-high border border-outline/20 px-3 py-1.5 text-xs font-mono font-medium text-primary hover:bg-surface-container-highest transition group min-h-[36px]"
                        >
                          <span>Already Joined</span>
                          <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          type="button"
                          data-testid={`join-workspace-${ws.slug}`}
                          onClick={() => handleJoinWorkspace(ws.id)}
                          disabled={isPending}
                          className="inline-flex items-center rounded-lg bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-3.5 py-1.5 text-xs font-medium transition disabled:opacity-50 min-h-[36px] active:scale-[0.98]"
                        >
                          Join Workspace
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* TAB 3: DISCOVER PEOPLE (@USER DIRECTORY) */}
        {activeTab === "discover_users" && (
          <section className="space-y-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-primary text-xs font-mono font-bold pointer-events-none">
                @
              </span>
              <input
                type="text"
                data-testid="search-users-input"
                value={userSearchQuery}
                onChange={(e) => handleUserSearch(e.target.value)}
                placeholder="Search colleagues by @username, full name, or email..."
                className="w-full rounded-lg bg-surface-container-lowest border border-outline/20 pl-8 pr-4 py-2.5 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none transition font-mono min-h-[40px]"
              />
            </div>

            {hasSearchedUsers ? (
              searchResults.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {searchResults.map((u) => (
                    <div
                      key={u.id}
                      data-testid={`user-card-${u.username || u.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-outline/20 bg-surface-container-low p-3.5 shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                        <UserAvatar avatar={u.avatar} name={u.name} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-on-surface">{u.name}</p>
                          <p className="truncate text-[11px] font-mono text-primary">@{u.username || "user"}</p>
                          <p className="truncate text-[10px] font-mono text-on-surface-variant">{u.email}</p>
                        </div>
                      </div>

                      <span className="shrink-0 rounded-md bg-surface-container-high border border-outline/20 px-2 py-0.5 text-[10px] font-mono text-on-surface-variant">
                        Registered
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-outline/20 bg-surface-container-lowest p-8 text-center text-xs font-mono text-on-surface-variant">
                  No users found matching &quot;{userSearchQuery}&quot;. Try searching another handle or name!
                </div>
              )
            ) : (
              <div className="rounded-xl border border-outline/20 bg-surface-container-low p-8 text-center">
                <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-high text-primary font-mono font-bold text-sm shadow-xs">
                  @
                </div>
                <h3 className="text-xs font-semibold text-on-surface">Search the Community</h3>
                <p className="mt-1 text-[11px] font-mono text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                  Type a username like <code className="text-primary font-semibold">@useranon1</code>, <code className="text-primary font-semibold">@useradm1</code>, or search by name to discover colleagues.
                </p>
              </div>
            )}
          </section>
        )}
      </main>

      {/* CREATE WORKSPACE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            data-testid="create-workspace-modal"
            className="w-full max-w-md rounded-xl bg-surface-container border border-outline/30 p-5 sm:p-6 shadow-2xl max-h-[90dvh] overflow-y-auto"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-on-surface">Create a New Workspace</h3>
                <p className="text-[11px] font-mono text-on-surface-variant mt-0.5">Spin up an organization hub for your team and projects.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-[11px] font-mono uppercase tracking-wider text-on-surface-variant">Workspace Name</label>
                <input
                  type="text"
                  required
                  data-testid="new-workspace-name-input"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g. Acme Innovations, Venture Lab"
                  className="w-full rounded-lg bg-surface-container-lowest border border-outline/20 px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none transition min-h-[38px]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-mono uppercase tracking-wider text-on-surface-variant">Description</label>
                <textarea
                  rows={2}
                  value={workspaceDesc}
                  onChange={(e) => setWorkspaceDesc(e.target.value)}
                  placeholder="What is this workspace focused on?"
                  className="w-full rounded-lg bg-surface-container-lowest border border-outline/20 px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none transition"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="h-4 w-4 rounded border-outline/30 bg-surface-container-lowest text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-on-surface">Public &amp; Discoverable</span>
                </label>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-outline/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg bg-surface-container-high hover:bg-surface-container-highest px-3.5 py-2 text-xs font-medium text-on-surface transition min-h-[36px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-create-workspace-btn"
                  disabled={isPending || !workspaceName.trim()}
                  className="rounded-lg bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-4 py-2 text-xs font-medium transition disabled:opacity-50 shadow-xs min-h-[36px] active:scale-[0.98]"
                >
                  {isPending ? "Creating..." : "Create & Launch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Settings Modal */}
      <FloatingSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        user={user}
      />
    </div>
  );
}
