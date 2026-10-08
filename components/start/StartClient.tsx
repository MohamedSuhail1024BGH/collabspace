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
import { WorkspaceAvatar } from "@/components/ui/WorkspaceAvatar";
import { NotificationCenter } from "@/components/ui/NotificationCenter";
import { Logo } from "@/components/ui/Logo";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  Users,
  Search,
  Plus,
  ArrowRight,
  LogOut,
  Settings,
  X,
  ChevronDown,
  Upload,
} from "lucide-react";

type UserWorkspaceItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  plan: string;
  isPublic: boolean;
  avatar?: string | null;
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
  avatar?: string | null;
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
  const [workspaceAvatar, setWorkspaceAvatar] = useState("");
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
  const handleLaunchWorkspace = async (workspaceId: string) => {
    startTransition(async () => {
      const res = await switchWorkspaceAction(workspaceId);
      if (res.success) {
        router.push("/");
        router.refresh();
      }
    });
  };

  // Join workspace handler
  const handleJoinWorkspace = async (workspaceId: string) => {
    startTransition(async () => {
      const res = await joinWorkspaceAction(workspaceId);
      if (res.success) {
        router.push("/");
        router.refresh();
      }
    });
  };

  // Search workspaces handler
  const handleWorkspaceSearch = async (query: string) => {
    setWsSearchQuery(query);
    if (!query.trim()) {
      setFilteredWorkspaces(initialPublicWorkspaces);
      return;
    }
    const res = await searchWorkspacesAction(query);
    setFilteredWorkspaces(res as PublicWorkspaceItem[]);
  };

  // Search users handler
  const handleUserSearch = async (query: string) => {
    setUserSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearchedUsers(false);
      return;
    }
    setHasSearchedUsers(true);
    const results = await searchUsersAction(query);
    setSearchResults(results);
  };

  // Create workspace handler
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;

    startTransition(async () => {
      const res = await createWorkspaceAction({
        name: workspaceName.trim(),
        description: workspaceDesc.trim() || undefined,
        isPublic,
        avatar: workspaceAvatar ? workspaceAvatar.trim() : undefined,
      });

      if (res.success) {
        setShowCreateModal(false);
        setWorkspaceName("");
        setWorkspaceDesc("");
        setWorkspaceAvatar("");
        router.push("/");
        router.refresh();
      }
    });
  };

  const isMemberOf = (workspaceId: string) => {
    return initialUserWorkspaces.some((w) => w.id === workspaceId);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-primary/20">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo size={28} className="h-7 w-7 shadow-xs" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-foreground font-mono">
                CollabSpace
              </span>
              <Badge variant="outline" className="text-[10px] font-mono bg-muted/40">
                HUB
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationCenter />

            {/* Profile Dropdown Toggle */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="group flex items-center gap-2.5 rounded-lg p-1 transition-all hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer select-none"
              >
                <UserAvatar avatar={user.avatar} name={user.name} size="sm" />
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                    {user.name}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground leading-tight">
                    @{user.username || "user"}
                  </p>
                </div>
                <ChevronDown
                  className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
                    isUserMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Downward Popover Menu */}
              {isUserMenuOpen && (
                <Card className="absolute right-0 top-full mt-2 w-52 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 z-50 select-none border-border/80">
                  <div className="px-2 py-1.5 border-b border-border/50 mb-1">
                    <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground truncate">{user.email}</p>
                  </div>

                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setShowSettingsModal(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                    >
                      <Settings className="size-3.5" />
                      <span>Settings</span>
                    </button>

                    <button
                      type="button"
                      data-testid="logout-button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="size-3.5" />
                      <span>Log out</span>
                    </button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl 2xl:max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8 w-full">
        {/* Welcome Command Strip */}
        <Card className="mb-6 p-4 sm:p-6 border-border/60 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-medium">
                  Welcome to CollabSpace
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Ready to collaborate, {user.name}?
              </h1>
              <p className="mt-1 max-w-2xl text-xs font-mono text-muted-foreground leading-relaxed">
                You are logged in as <span className="text-primary font-semibold">@{user.username || "user"}</span>.
                Choose a workspace to launch into, search for public teams, or discover fellow members.
              </p>
            </div>

            <Button
              type="button"
              data-testid="start-create-workspace-btn"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center gap-2 self-start h-10 px-4 text-xs font-medium cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Create New Workspace</span>
            </Button>
          </div>
        </Card>

        {/* Navigation Tabs */}
        <div className="mb-6 border-b border-border/60 pb-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none whitespace-nowrap">
            <button
              type="button"
              data-testid="tab-my-workspaces"
              onClick={() => setActiveTab("workspaces")}
              className={`shrink-0 inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-mono transition-all select-none border cursor-pointer ${
                activeTab === "workspaces"
                  ? "bg-accent text-primary border-primary/40 font-semibold shadow-xs"
                  : "border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <Building2 className="size-3.5" />
              <span>My Workspaces</span>
              <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-4">
                {initialUserWorkspaces.length}
              </Badge>
            </button>

            <button
              type="button"
              data-testid="tab-discover-workspaces"
              onClick={() => setActiveTab("discover_workspaces")}
              className={`shrink-0 inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-mono transition-all select-none border cursor-pointer ${
                activeTab === "discover_workspaces"
                  ? "bg-accent text-primary border-primary/40 font-semibold shadow-xs"
                  : "border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <Search className="size-3.5" />
              <span>Search Workspaces</span>
            </button>

            <button
              type="button"
              data-testid="tab-discover-users"
              onClick={() => setActiveTab("discover_users")}
              className={`shrink-0 inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-mono transition-all select-none border cursor-pointer ${
                activeTab === "discover_users"
                  ? "bg-accent text-primary border-primary/40 font-semibold shadow-xs"
                  : "border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <Users className="size-3.5" />
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
                  <Card
                    key={ws.id}
                    data-testid={`workspace-card-${ws.slug}`}
                    className="group relative flex flex-col justify-between p-5 border-border/60 hover:border-primary/40 transition-all shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <WorkspaceAvatar
                          avatar={ws.avatar}
                          name={ws.name}
                          size="lg"
                          className="rounded-xl shadow-xs"
                        />
                        <Badge variant="outline" className="text-[10px] font-mono capitalize bg-muted/30">
                          {ws.userRole}
                        </Badge>
                      </div>

                      <h3 className="mt-3 text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {ws.name}
                      </h3>
                      <p className="text-[11px] font-mono text-muted-foreground">#{ws.slug}</p>
                      <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                        {ws.description || "Workspace for team collaboration and project tracking."}
                      </p>
                    </div>

                    <div className="mt-5 border-t border-border/50 pt-3.5">
                      <div className="mb-3 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                        <span className="px-2 py-0.5 rounded-md bg-muted/40 border border-border/40">
                          {ws.memberCount} member{ws.memberCount === 1 ? "" : "s"}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-muted/40 border border-border/40">
                          {ws.projectCount} project{ws.projectCount === 1 ? "" : "s"}
                        </span>
                      </div>

                      <Button
                        type="button"
                        data-testid={`launch-workspace-${ws.slug}`}
                        disabled={isPending}
                        onClick={() => handleLaunchWorkspace(ws.id)}
                        className="w-full h-9 text-xs font-medium cursor-pointer"
                      >
                        <span>Launch Workspace</span>
                        <ArrowRight className="size-3.5 ml-1.5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 sm:p-12 text-center border-dashed border-border">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
                  <Building2 className="size-6" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">No joined workspaces yet</h3>
                <p className="mt-1 text-xs font-mono text-muted-foreground max-w-md mx-auto leading-relaxed">
                  You are not a member of any workspace yet. Create your first workspace or discover and join existing public workspaces.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                  <Button
                    size="sm"
                    onClick={() => setShowCreateModal(true)}
                    className="h-9 text-xs font-medium"
                  >
                    Create Workspace
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("discover_workspaces")}
                    className="h-9 text-xs font-medium"
                  >
                    Browse Workspaces
                  </Button>
                </div>
              </Card>
            )}
          </section>
        )}

        {/* TAB 2: DISCOVER WORKSPACES */}
        {activeTab === "discover_workspaces" && (
          <section className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                data-testid="search-workspaces-input"
                value={wsSearchQuery}
                onChange={(e) => handleWorkspaceSearch(e.target.value)}
                placeholder="Search public workspaces by name, #slug, or description..."
                className="pl-10 h-10 text-xs font-mono"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredWorkspaces.map((ws) => {
                const member = isMemberOf(ws.id);
                return (
                  <Card
                    key={ws.id}
                    className="flex flex-col justify-between p-5 border-border/60 hover:border-border transition shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <WorkspaceAvatar
                          avatar={ws.avatar}
                          name={ws.name}
                          size="lg"
                          className="rounded-xl shadow-xs"
                        />
                      </div>

                      <h3 className="mt-3 text-sm font-bold text-foreground">{ws.name}</h3>
                      <p className="text-[11px] font-mono text-muted-foreground">#{ws.slug}</p>
                      <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                        {ws.description || "Public collaborative space."}
                      </p>
                    </div>

                    <div className="mt-5 border-t border-border/50 pt-3.5 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-muted-foreground shrink-0">{ws.memberCount} members</span>
                      {member ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLaunchWorkspace(ws.id)}
                          className="h-8 text-xs font-mono"
                        >
                          <span>Already Joined</span>
                          <ArrowRight className="size-3.5 ml-1" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          data-testid={`join-workspace-${ws.slug}`}
                          onClick={() => handleJoinWorkspace(ws.id)}
                          disabled={isPending}
                          className="h-8 text-xs font-medium"
                        >
                          Join Workspace
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* TAB 3: DISCOVER PEOPLE (@USER DIRECTORY) */}
        {activeTab === "discover_users" && (
          <section className="space-y-4">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary text-xs font-mono font-bold pointer-events-none">
                @
              </span>
              <Input
                type="text"
                data-testid="search-users-input"
                value={userSearchQuery}
                onChange={(e) => handleUserSearch(e.target.value)}
                placeholder="Search colleagues by @username, full name, or email..."
                className="pl-8 h-10 text-xs font-mono"
              />
            </div>

            {hasSearchedUsers ? (
              searchResults.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {searchResults.map((u) => (
                    <Card
                      key={u.id}
                      data-testid={`user-card-${u.username || u.id}`}
                      className="flex items-center justify-between gap-3 p-3.5 border-border/60 shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                        <UserAvatar avatar={u.avatar} name={u.name} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">{u.name}</p>
                          <p className="truncate text-[11px] font-mono text-primary">@{u.username || "user"}</p>
                          <p className="truncate text-[10px] font-mono text-muted-foreground">{u.email}</p>
                        </div>
                      </div>

                      <Badge variant="outline" className="text-[10px] font-mono bg-muted/40 shrink-0">
                        Registered
                      </Badge>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed border-border p-8 text-center text-xs font-mono text-muted-foreground">
                  No users found matching &quot;{userSearchQuery}&quot;. Try searching another handle or name!
                </Card>
              )
            ) : (
              <Card className="p-8 text-center border-border/60 bg-muted/10">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-mono font-bold text-sm shadow-xs">
                  @
                </div>
                <h3 className="text-xs font-semibold text-foreground">Search the Community</h3>
                <p className="mt-1 text-[11px] font-mono text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Type a username like <code className="text-primary font-semibold">@useranon1</code>, <code className="text-primary font-semibold">@useradm1</code>, or search by name to discover colleagues.
                </p>
              </Card>
            )}
          </section>
        )}
      </main>

      {/* CREATE WORKSPACE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <Card
            data-testid="create-workspace-modal"
            className="w-full max-w-md p-4 sm:p-6 shadow-2xl max-h-[88dvh] overflow-y-auto border-border/80"
          >
            <div className="mb-4 flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h3 className="text-base font-semibold text-foreground">Create a New Workspace</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Spin up an organization hub for your team and projects.</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCreateModal(false)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="Close create workspace dialog"
              >
                <X className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Workspace Name
                </label>
                <Input
                  type="text"
                  required
                  data-testid="new-workspace-name-input"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g. Acme Innovations, Venture Lab"
                  className="text-xs"
                />
              </div>

              {/* Workspace Picture (Optional) */}
              <div>
                <label className="mb-1 block text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Workspace Picture (Optional)
                </label>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/60">
                  <WorkspaceAvatar
                    avatar={workspaceAvatar}
                    name={workspaceName || "New Workspace"}
                    size="md"
                    className="rounded-lg shadow-xs"
                  />
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card hover:bg-accent border border-border text-xs font-mono text-foreground transition-colors shadow-xs">
                        <Upload className="size-3 text-primary" />
                        <span>{workspaceAvatar ? "Change Picture" : "Upload Picture"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 2 * 1024 * 1024) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === "string") {
                                setWorkspaceAvatar(reader.result);
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="hidden"
                        />
                      </label>
                      {workspaceAvatar && (
                        <button
                          type="button"
                          onClick={() => setWorkspaceAvatar("")}
                          className="text-[11px] text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Description
                </label>
                <Textarea
                  rows={2}
                  data-testid="new-workspace-description-input"
                  value={workspaceDesc}
                  onChange={(e) => setWorkspaceDesc(e.target.value)}
                  placeholder="What is this workspace focused on?"
                  className="text-xs resize-none"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    data-testid="new-workspace-public-toggle"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-foreground">Public &amp; Discoverable</span>
                </label>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-testid="submit-create-workspace-btn"
                  disabled={isPending || !workspaceName.trim()}
                  size="sm"
                  className="h-8 text-xs font-semibold"
                >
                  {isPending ? "Creating..." : "Create & Launch"}
                </Button>
              </div>
            </form>
          </Card>
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
