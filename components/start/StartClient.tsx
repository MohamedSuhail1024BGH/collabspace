"use client";

import { useState, useTransition } from "react";
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
        setShowCreateModal(false);
        setWorkspaceName("");
        setWorkspaceDesc("");
        router.push("/");
        router.refresh();
      }
    });
  };

  // Search public workspaces
  const handleWorkspaceSearch = async (q: string) => {
    setWsSearchQuery(q);
    const results = await searchWorkspacesAction(q);
    setFilteredWorkspaces(results);
  };

  // Join a public workspace
  const handleJoinWorkspace = (workspaceId: string) => {
    startTransition(async () => {
      await joinWorkspaceAction(workspaceId);
      router.push("/");
      router.refresh();
    });
  };

  // Search users handler
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 font-bold text-white shadow-lg shadow-violet-950/40">
              CS
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">CollabSpace</span>
              <span className="ml-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                Launchpad
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-xs font-bold text-white shadow">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-medium text-white">{user.name}</p>
                <p className="text-[11px] text-violet-300">@{user.username || "user"}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20 hover:text-rose-200"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Log out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 w-full">
        {/* Welcome Section */}
        <div className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/50 p-6 sm:p-8 shadow-2xl shadow-slate-950/30">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-violet-300 font-semibold">Welcome to CollabSpace</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to collaborate, {user.name}?
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                You are logged in as <span className="text-violet-300 font-semibold">@{user.username || "user"}</span>.
                Choose a workspace to launch into, search for public teams, or discover fellow members.
              </p>
            </div>

            <button
              type="button"
              data-testid="start-create-workspace-btn"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 self-start rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:opacity-95"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create New Workspace</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
          <button
            type="button"
            data-testid="tab-my-workspaces"
            onClick={() => setActiveTab("workspaces")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
              activeTab === "workspaces"
                ? "bg-violet-500/20 text-violet-200 border border-violet-500/30"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>My Workspaces ({initialUserWorkspaces.length})</span>
          </button>

          <button
            type="button"
            data-testid="tab-discover-workspaces"
            onClick={() => setActiveTab("discover_workspaces")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
              activeTab === "discover_workspaces"
                ? "bg-violet-500/20 text-violet-200 border border-violet-500/30"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search Workspaces</span>
          </button>

          <button
            type="button"
            data-testid="tab-discover-users"
            onClick={() => setActiveTab("discover_users")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
              activeTab === "discover_users"
                ? "bg-violet-500/20 text-violet-200 border border-violet-500/30"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Find People (@User Directory)</span>
          </button>
        </div>

        {/* TAB 1: MY WORKSPACES */}
        {activeTab === "workspaces" && (
          <section>
            {initialUserWorkspaces.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {initialUserWorkspaces.map((ws) => (
                  <div
                    key={ws.id}
                    data-testid={`workspace-card-${ws.slug}`}
                    className="group relative flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl transition hover:border-violet-500/40 hover:bg-slate-900"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-lg font-bold text-white shadow-lg shadow-violet-950/50">
                          {ws.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                            ws.userRole === "owner"
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              : ws.userRole === "admin"
                              ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                              : "bg-slate-800 text-slate-300"
                          }`}>
                            {ws.userRole}
                          </span>
                        </div>
                      </div>

                      <h3 className="mt-4 text-xl font-bold text-white group-hover:text-violet-200 transition">
                        {ws.name}
                      </h3>
                      <p className="text-xs text-slate-400">#{ws.slug}</p>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-300">
                        {ws.description || "Shared collaborative workspace for high-velocity teams."}
                      </p>
                    </div>

                    <div className="mt-6 border-t border-white/10 pt-4">
                      <div className="mb-4 flex items-center justify-between text-xs text-slate-400">
                        <span>{ws.memberCount} member{ws.memberCount === 1 ? "" : "s"}</span>
                        <span>{ws.projectCount} project{ws.projectCount === 1 ? "" : "s"}</span>
                      </div>

                      <button
                        type="button"
                        data-testid={`launch-workspace-${ws.slug}`}
                        disabled={isPending}
                        onClick={() => handleLaunchWorkspace(ws.id)}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600/80 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-600 focus:outline-none disabled:opacity-50"
                      >
                        <span>Launch Workspace</span>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-white/15 bg-slate-900/40 p-12 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">No joined workspaces yet</h3>
                <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
                  You are not a member of any workspace yet. Create your first workspace or discover and join existing public workspaces.
                </p>
                <div className="mt-6 flex justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition"
                  >
                    Create Workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("discover_workspaces")}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:text-white hover:border-violet-500/40 transition"
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
          <section className="space-y-6">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                data-testid="search-workspaces-input"
                value={wsSearchQuery}
                onChange={(e) => handleWorkspaceSearch(e.target.value)}
                placeholder="Search public workspaces by name, #slug, or description..."
                className="w-full rounded-2xl border border-white/10 bg-slate-900/80 pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none shadow-xl"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredWorkspaces.map((ws) => {
                const member = isMemberOf(ws.id);
                return (
                  <div
                    key={ws.id}
                    className="flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl transition hover:border-violet-500/30"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-lg font-bold text-white shadow">
                          {ws.name.charAt(0).toUpperCase()}
                        </div>
                      </div>

                      <h3 className="mt-4 text-xl font-bold text-white">{ws.name}</h3>
                      <p className="text-xs text-slate-400">#{ws.slug}</p>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-300">
                        {ws.description || "Public collaborative space."}
                      </p>
                    </div>

                    <div className="mt-6 border-t border-white/10 pt-4 flex items-center justify-between">
                      <span className="text-xs text-slate-400">{ws.memberCount} members</span>
                      {member ? (
                        <button
                          type="button"
                          onClick={() => handleLaunchWorkspace(ws.id)}
                          className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-slate-700 transition"
                        >
                          Already Joined →
                        </button>
                      ) : (
                        <button
                          type="button"
                          data-testid={`join-workspace-${ws.slug}`}
                          onClick={() => handleJoinWorkspace(ws.id)}
                          disabled={isPending}
                          className="rounded-xl bg-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 transition"
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
          <section className="space-y-6">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 text-base font-bold">
                @
              </span>
              <input
                type="text"
                data-testid="search-users-input"
                value={userSearchQuery}
                onChange={(e) => handleUserSearch(e.target.value)}
                placeholder="Search colleagues by @username, full name, or email..."
                className="w-full rounded-2xl border border-white/10 bg-slate-900/80 pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none shadow-xl"
              />
            </div>

            {hasSearchedUsers ? (
              searchResults.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {searchResults.map((u) => (
                    <div
                      key={u.id}
                      data-testid={`user-card-${u.username || u.id}`}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-xl backdrop-blur-xl"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 font-bold text-white shadow">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{u.name}</p>
                          <p className="truncate text-xs text-violet-400 font-medium">@{u.username || "user"}</p>
                          <p className="truncate text-[11px] text-slate-400">{u.email}</p>
                        </div>
                      </div>

                      <span className="shrink-0 rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1 text-[11px] text-slate-400">
                        Registered
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900/40 p-8 text-center text-sm text-slate-400">
                  No users found matching &quot;{userSearchQuery}&quot;. Try searching another handle or name!
                </div>
              )
            ) : (
              <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 text-violet-300 font-bold text-lg">
                  @
                </div>
                <h3 className="text-base font-semibold text-white">Search the Community</h3>
                <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                  Type a username like <code className="text-violet-300">@useranon1</code>, <code className="text-violet-300">@useradm1</code>, or search by name to discover colleagues.
                </p>
              </div>
            )}
          </section>
        )}
      </main>

      {/* CREATE WORKSPACE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div
            data-testid="create-workspace-modal"
            className="w-full max-w-lg rounded-3xl border border-white/15 bg-slate-900 p-6 sm:p-8 shadow-2xl shadow-violet-950/50"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Create a New Workspace</h3>
                <p className="text-xs text-slate-400 mt-1">Spin up an organization hub for your team and projects.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">Workspace Name</label>
                <input
                  type="text"
                  required
                  data-testid="new-workspace-name-input"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g. Acme Innovations, Venture Lab"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">Description</label>
                <textarea
                  rows={3}
                  value={workspaceDesc}
                  onChange={(e) => setWorkspaceDesc(e.target.value)}
                  placeholder="What is this workspace focused on?"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-slate-950/60 text-violet-500 focus:ring-violet-400 focus:ring-offset-0"
                  />
                  <span className="text-xs font-medium text-slate-300">Public & Discoverable</span>
                </label>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-create-workspace-btn"
                  disabled={isPending || !workspaceName.trim()}
                  className="rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:opacity-95 disabled:opacity-50"
                >
                  {isPending ? "Creating..." : "Create & Launch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

