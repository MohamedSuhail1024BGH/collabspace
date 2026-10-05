"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DbWorkspace, DbUser } from "@/lib/db/schema";
import {
  updateWorkspaceAction,
  deleteWorkspaceAction,
  leaveWorkspaceAction,
  transferWorkspaceOwnershipAction,
  addWorkspaceMemberAction,
  removeWorkspaceMemberAction,
  searchUsersForInviteAction,
} from "@/app/actions";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  Users,
  Copy,
  Check,
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  LogOut,
  Shield,
  UserPlus,
} from "lucide-react";

export type WorkspaceMemberItem = {
  membershipId: string;
  role: string;
  status?: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    username: string | null;
    email: string;
    avatar: string | null;
  };
};

type WorkspacePreferencesClientProps = {
  user: Omit<DbUser, "passwordHash">;
  workspace: DbWorkspace | null;
  initialMembers?: WorkspaceMemberItem[];
};

export function WorkspacePreferencesClient({
  user,
  workspace,
  initialMembers,
}: WorkspacePreferencesClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"details" | "members">("details");

  // Compute Current User's Workspace Role
  const [members, setMembers] = useState<WorkspaceMemberItem[]>(initialMembers ?? []);
  const currentMember = members.find((m) => m.user.id === user.id);
  const currentUserRole = (currentMember?.role as "owner" | "admin" | "member" | "viewer") || "member";
  const isOwner = currentUserRole === "owner";
  const isAdmin = isOwner || currentUserRole === "admin";

  // Workspace Form State
  const [workspaceName, setWorkspaceName] = useState(workspace?.name ?? "");
  const [workspaceDescription, setWorkspaceDescription] = useState(workspace?.description ?? "");
  const [workspaceIsPublic, setWorkspaceIsPublic] = useState(workspace?.isPublic ?? true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Workspace Members Search State
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState<
    { id: string; name: string; username: string | null; email: string; avatar: string | null }[]
  >([]);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);
  const [selectedRoleForNewMember, setSelectedRoleForNewMember] = useState<"admin" | "member" | "viewer">("member");
  const latestSearchQueryRef = useRef("");

  // Modals & Action States
  const [showDeleteWorkspaceModal, setShowDeleteWorkspaceModal] = useState(false);
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);
  const [showLeaveWorkspaceModal, setShowLeaveWorkspaceModal] = useState(false);
  const [isLeavingWorkspace, setIsLeavingWorkspace] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMemberItem | null>(null);
  const [memberToTransfer, setMemberToTransfer] = useState<WorkspaceMemberItem | null>(null);
  const [isTransferringOwnership, setIsTransferringOwnership] = useState(false);

  // Status & Feedback Banner
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Sync state with props when workspace or initialMembers changes
  const [prevWorkspaceId, setPrevWorkspaceId] = useState(workspace?.id);
  if (workspace && workspace.id !== prevWorkspaceId) {
    setPrevWorkspaceId(workspace.id);
    setWorkspaceName(workspace.name);
    setWorkspaceDescription(workspace.description ?? "");
    setWorkspaceIsPublic(workspace.isPublic ?? true);
  }

  const [prevInitialMembers, setPrevInitialMembers] = useState(initialMembers);
  if (initialMembers && initialMembers !== prevInitialMembers) {
    setPrevInitialMembers(initialMembers);
    setMembers(initialMembers);
  }

  // Copy Workspace URL slug
  const handleCopySlug = () => {
    if (!workspace) return;
    const url = `${window.location.origin}/w/${workspace.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
    setFeedback({ type: "success", message: "Workspace share link copied to clipboard!" });
  };

  // Workspace Save Handler
  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    setFeedback(null);

    startTransition(async () => {
      const res = await updateWorkspaceAction({
        name: workspaceName.trim(),
        description: workspaceDescription.trim(),
        isPublic: workspaceIsPublic,
      });

      if (res.success) {
        setFeedback({ type: "success", message: "Workspace preferences saved successfully." });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update workspace." });
      }
    });
  };

  // Search members handler
  const handleSearchUsersForInvite = async (q: string) => {
    setMemberSearchQuery(q);
    latestSearchQueryRef.current = q;

    if (!q.trim()) {
      setMemberSearchResults([]);
      setIsSearchingMembers(false);
      return;
    }

    setIsSearchingMembers(true);
    const results = await searchUsersForInviteAction(q, workspace?.id);

    if (latestSearchQueryRef.current === q) {
      const existingUserIds = new Set(members.map((m) => m.user.id));
      setMemberSearchResults(results.filter((u) => !existingUserIds.has(u.id)));
      setIsSearchingMembers(false);
    }
  };

  // Add Member Handler
  const handleAddMember = async (targetUserId: string) => {
    if (!workspace) return;
    const targetUser = memberSearchResults.find((u) => u.id === targetUserId);

    if (targetUser) {
      const optimisticMember: WorkspaceMemberItem = {
        membershipId: `temp-${targetUser.id}-${members.length}`,
        role: selectedRoleForNewMember,
        status: "pending",
        joinedAt: "Just now",
        user: {
          id: targetUser.id,
          name: targetUser.name,
          username: targetUser.username,
          email: targetUser.email,
          avatar: targetUser.avatar,
        },
      };
      setMembers((prev) => [...prev, optimisticMember]);
      setMemberSearchResults((prev) => prev.filter((u) => u.id !== targetUserId));
    }

    startTransition(async () => {
      const res = await addWorkspaceMemberAction({
        workspaceId: workspace.id,
        userId: targetUserId,
        role: selectedRoleForNewMember,
      });

      if (res.success) {
        setFeedback({ type: "success", message: "Invitation sent to member." });
        setMemberSearchQuery("");
        router.refresh();
      } else {
        setMembers((prev) => prev.filter((m) => m.user.id !== targetUserId));
        setFeedback({ type: "error", message: res.error || "Failed to add member." });
      }
    });
  };

  // Update Member Role Handler
  const handleUpdateMemberRole = async (targetUserId: string, newRole: "admin" | "member" | "viewer") => {
    if (!workspace) return;
    const previousMembers = [...members];

    setMembers((prev) =>
      prev.map((item) => (item.user.id === targetUserId ? { ...item, role: newRole } : item))
    );

    startTransition(async () => {
      const res = await addWorkspaceMemberAction({
        workspaceId: workspace.id,
        userId: targetUserId,
        role: newRole,
      });

      if (res.success) {
        setFeedback({ type: "success", message: `Member role updated to ${newRole}.` });
        router.refresh();
      } else {
        setMembers(previousMembers);
        setFeedback({ type: "error", message: res.error || "Failed to update member role." });
      }
    });
  };

  // Remove Member Handler
  const handleRemoveMemberConfirm = async () => {
    if (!workspace || !memberToRemove) return;
    const targetUserId = memberToRemove.user.id;
    const previousMembers = [...members];

    setMembers((prev) => prev.filter((m) => m.user.id !== targetUserId));
    setMemberToRemove(null);

    startTransition(async () => {
      const res = await removeWorkspaceMemberAction(workspace.id, targetUserId);
      if (res.success) {
        setFeedback({ type: "success", message: "Member removed from workspace." });
        router.refresh();
      } else {
        setMembers(previousMembers);
        setFeedback({ type: "error", message: res.error || "Failed to remove member." });
      }
    });
  };

  // Transfer Ownership Handler
  const handleTransferOwnership = async () => {
    if (!workspace || !memberToTransfer) return;
    const targetUserId = memberToTransfer.user.id;
    setIsTransferringOwnership(true);

    const res = await transferWorkspaceOwnershipAction(workspace.id, targetUserId);
    setIsTransferringOwnership(false);
    setMemberToTransfer(null);

    if (res.success) {
      setFeedback({ type: "success", message: "Ownership transferred successfully." });
      router.refresh();
    } else {
      setFeedback({ type: "error", message: res.error || "Failed to transfer ownership." });
    }
  };

  // Delete Workspace Handler
  const handleDeleteWorkspace = async () => {
    if (!workspace) return;
    setIsDeletingWorkspace(true);
    const res = await deleteWorkspaceAction(workspace.id);
    setIsDeletingWorkspace(false);
    setShowDeleteWorkspaceModal(false);

    if (res.success) {
      if ((res.remainingCount ?? 0) > 0) {
        router.push("/");
      } else {
        router.push("/start");
      }
      router.refresh();
    } else {
      setFeedback({ type: "error", message: res.error || "Failed to delete workspace." });
    }
  };

  // Leave Workspace Handler
  const handleLeaveWorkspace = async () => {
    if (!workspace) return;
    setIsLeavingWorkspace(true);
    const res = await leaveWorkspaceAction(workspace.id);
    setIsLeavingWorkspace(false);
    setShowLeaveWorkspaceModal(false);

    if (res.success) {
      if ((res.remainingCount ?? 0) > 0) {
        router.push("/");
      } else {
        router.push("/start");
      }
      router.refresh();
    } else {
      setFeedback({ type: "error", message: res.error || "Failed to leave workspace." });
    }
  };

  if (!workspace) {
    return (
      <div className="p-8 text-center text-muted-foreground font-body-md">
        No active workspace selected. Please switch or create a workspace.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl 2xl:max-w-6xl mx-auto">
      {/* Top Utility Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground font-mono text-[10px] sm:text-[11px] uppercase tracking-wider">
            <span>Workspace</span>
            <span className="text-muted-foreground/60">/</span>
            <span className="text-primary font-medium">{workspace.name}</span>
            <span className="text-muted-foreground/60">/</span>
            <span className="text-foreground">Preferences</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
            Workspace Preferences
          </h1>
          <p className="text-xs text-muted-foreground">
            Configure tenant namespace, public accessibility, and team permissions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="copy-workspace-slug-btn"
            onClick={handleCopySlug}
            className="h-8 px-3 text-xs font-mono"
          >
            {copiedLink ? <Check className="size-3.5 mr-1 text-emerald-500" /> : <Copy className="size-3.5 mr-1" />}
            <span>{copiedLink ? "Copied URL!" : "Share Link"}</span>
          </Button>
        </div>
      </div>

      {/* Feedback Alert Banner */}
      {feedback && (
        <div
          data-testid="settings-feedback-banner"
          className={`flex items-center justify-between p-3 rounded-lg text-xs border animate-in fade-in duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-muted-foreground hover:text-foreground ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex items-center border-b border-border/60 pb-2 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setActiveTab("details");
            setFeedback(null);
          }}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition shrink-0 cursor-pointer ${
            activeTab === "details"
              ? "bg-accent text-accent-foreground font-semibold shadow-xs border border-border"
              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          }`}
        >
          <Building2 className="size-3.5" />
          <span>Workspace Details</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("members");
            setFeedback(null);
          }}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition shrink-0 cursor-pointer ${
            activeTab === "members"
              ? "bg-accent text-accent-foreground font-semibold shadow-xs border border-border"
              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          }`}
        >
          <Users className="size-3.5" />
          <span>Members & Roles</span>
          <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-4">
            {members.length}
          </Badge>
        </button>
      </div>

      {/* Tab 1: Workspace Details */}
      {activeTab === "details" && (
        <div className="space-y-6">
          <Card className="p-5 border-border/60 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/50 gap-2">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Workspace Attributes</h2>
                <p className="text-xs text-muted-foreground">
                  Global tenant namespace, endpoint identifier, and branding.
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono bg-muted/30">
                ID: #{workspace.id}
              </Badge>
            </div>

            <form onSubmit={handleSaveWorkspace} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-mono text-muted-foreground uppercase">
                  Workspace Name
                </label>
                <Input
                  type="text"
                  data-testid="workspace-name-input"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  disabled={!isAdmin || isPending}
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-mono text-muted-foreground uppercase">
                  Workspace Description
                </label>
                <Textarea
                  data-testid="workspace-description-input"
                  rows={3}
                  value={workspaceDescription}
                  onChange={(e) => setWorkspaceDescription(e.target.value)}
                  disabled={!isAdmin || isPending}
                  placeholder="Describe your workspace mission and focus..."
                  className="text-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-xs font-medium text-foreground">Public Workspace</p>
                  <p className="text-[11px] text-muted-foreground">
                    Allow other authenticated members to discover and request access.
                  </p>
                </div>
                <input
                  type="checkbox"
                  data-testid="workspace-public-toggle"
                  checked={workspaceIsPublic}
                  onChange={(e) => setWorkspaceIsPublic(e.target.checked)}
                  disabled={!isAdmin || isPending}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-0 cursor-pointer"
                />
              </div>

              {isAdmin && (
                <div className="pt-3 border-t border-border/50 flex justify-end">
                  <Button
                    type="submit"
                    data-testid="save-workspace-button"
                    disabled={isPending}
                    size="sm"
                    className="h-9 text-xs font-medium"
                  >
                    {isPending ? "Saving changes..." : "Save Workspace Settings"}
                  </Button>
                </div>
              )}
            </form>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/30 p-5 space-y-4 shadow-xs">
            <div className="pb-3 border-b border-destructive/20">
              <h3 className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                <AlertTriangle className="size-4" />
                <span>Workspace Danger Zone</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                High-impact destructive actions affecting all workspace collaborators and data.
              </p>
            </div>

            <div className="space-y-3">
              {isOwner ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-destructive/5 border border-destructive/20">
                  <div>
                    <h4 className="text-xs font-semibold text-destructive">Delete Entire Workspace</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      Permanently destroys all projects, tasks, comments, and channels in this workspace.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="workspace-delete-button"
                    onClick={() => setShowDeleteWorkspaceModal(true)}
                    className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
                  >
                    <Trash2 className="size-3.5 mr-1" />
                    Delete Workspace
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-muted/20 border border-border/40">
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">Leave Workspace</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      Revoke your membership and access to this workspace.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="workspace-leave-button"
                    onClick={() => setShowLeaveWorkspaceModal(true)}
                    className="text-xs text-destructive hover:bg-destructive/10 shrink-0"
                  >
                    <LogOut className="size-3.5 mr-1" />
                    Leave Workspace
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Members & Roles */}
      {activeTab === "members" && (
        <div className="space-y-6">
          <Card className="p-5 border-border/60 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/50 gap-2">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Workspace Collaborators</h2>
                <p className="text-xs text-muted-foreground">
                  Manage collaborators, assign role-based permissions, and invite team members.
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono bg-muted/30">
                Total: {members.length}
              </Badge>
            </div>

            {/* Invite Form */}
            {isAdmin && (
              <Card className="p-3.5 bg-muted/20 border-border/50 space-y-3">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <UserPlus className="size-3.5 text-primary" />
                  <span>Invite Team Member</span>
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      type="text"
                      data-testid="invite-user-search-input"
                      value={memberSearchQuery}
                      onChange={(e) => handleSearchUsersForInvite(e.target.value)}
                      placeholder="Search users by name, username, or email..."
                      className="pl-8 text-xs h-9"
                    />
                    {isSearchingMembers && (
                      <span className="absolute right-3 top-2.5 text-[10px] font-mono text-muted-foreground">
                        Searching...
                      </span>
                    )}
                  </div>

                  <select
                    data-testid="invite-role-select"
                    value={selectedRoleForNewMember}
                    onChange={(e) => setSelectedRoleForNewMember(e.target.value as "admin" | "member" | "viewer")}
                    className="w-full sm:w-auto h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>

                {/* Search Results Dropdown */}
                {memberSearchResults.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-48 overflow-y-auto border border-border/60 rounded-lg p-1.5 bg-card">
                    {memberSearchResults.map((u) => (
                      <div
                        key={u.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/40 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <UserAvatar avatar={u.avatar} name={u.name} size="xs" />
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{u.name}</p>
                            <p className="text-[10px] font-mono text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddMember(u.id)}
                          className="h-7 px-2.5 text-xs self-end sm:self-auto"
                        >
                          Add as {selectedRoleForNewMember}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Desktop Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground font-mono text-[10px] uppercase">
                    <th className="pb-2">User</th>
                    <th className="pb-2">Role</th>
                    <th className="pb-2">Joined</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {members.map((m) => {
                    const isSelf = m.user.id === user.id;
                    const canManage = isOwner && !isSelf;

                    return (
                      <tr key={m.membershipId} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <UserAvatar avatar={m.user.avatar} name={m.user.name} size="xs" />
                            <div>
                              <div className="font-medium text-foreground flex items-center gap-1.5">
                                <span>{m.user.name}</span>
                                {isSelf && (
                                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                                    You
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] font-mono text-muted-foreground">{m.user.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5">
                          <div className="flex items-center gap-1.5">
                            {canManage && m.role !== "owner" ? (
                              <select
                                value={m.role}
                                onChange={(e) =>
                                  handleUpdateMemberRole(
                                    m.user.id,
                                    e.target.value as "admin" | "member" | "viewer"
                                  )
                                }
                                aria-label={`Change role for ${m.user.name}`}
                                className="h-6 rounded-md border border-input bg-card px-2 text-[10px] font-mono text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer capitalize"
                              >
                                <option value="admin">Admin</option>
                                <option value="member">Member</option>
                                <option value="viewer">Viewer</option>
                              </select>
                            ) : (
                              <Badge
                                variant={m.role === "owner" ? "default" : m.role === "admin" ? "secondary" : "outline"}
                                className="text-[10px] font-mono capitalize"
                              >
                                {m.role}
                              </Badge>
                            )}
                            {m.status === "pending" && (
                              <Badge variant="outline" className="text-[9px] font-mono text-amber-500 border-amber-500/30">
                                Pending
                              </Badge>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 font-mono text-[10px] text-muted-foreground">
                          {new Date(m.joinedAt).toLocaleDateString()}
                        </td>

                        <td className="py-2.5 text-right">
                          {canManage && (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setMemberToTransfer(m)}
                                title="Transfer Ownership"
                                className="h-6 px-2 text-[10px] font-mono"
                              >
                                Transfer
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setMemberToRemove(m)}
                                title="Remove Member"
                                className="h-6 px-2 text-[10px] font-mono text-destructive hover:bg-destructive/10"
                              >
                                Remove
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Workspace Confirmation Modal */}
      {showDeleteWorkspaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-md p-4 sm:p-5 shadow-2xl space-y-4 border-destructive/40 max-h-[88dvh] overflow-y-auto">
            <h3 className="text-base font-semibold text-destructive">Delete Workspace?</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-foreground">{workspace.name}</span>?
              This will permanently purge all tasks, projects, calendars, and conversation channels. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteWorkspaceModal(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteWorkspace}
                disabled={isDeletingWorkspace}
                className="h-8 text-xs font-semibold"
              >
                {isDeletingWorkspace ? "Deleting..." : "Confirm Delete Workspace"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Leave Workspace Confirmation Modal */}
      {showLeaveWorkspaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-md p-4 sm:p-5 shadow-2xl space-y-4 border-destructive/40 max-h-[88dvh] overflow-y-auto">
            <h3 className="text-base font-semibold text-destructive">Leave Workspace?</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to leave <span className="font-semibold text-foreground">{workspace.name}</span>? You will lose access until re-invited.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLeaveWorkspaceModal(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLeaveWorkspace}
                disabled={isLeavingWorkspace}
                className="h-8 text-xs font-semibold"
              >
                {isLeavingWorkspace ? "Leaving..." : "Confirm Leave"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-md p-4 sm:p-5 shadow-2xl space-y-4 border-destructive/40 max-h-[88dvh] overflow-y-auto">
            <h3 className="text-base font-semibold text-destructive">Remove Member?</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to revoke access for <span className="font-semibold text-foreground">{memberToRemove.user.name}</span>?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMemberToRemove(null)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveMemberConfirm}
                className="h-8 text-xs font-semibold"
              >
                Revoke Access
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Transfer Ownership Confirmation Modal */}
      {memberToTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-md p-4 sm:p-5 shadow-2xl space-y-4 border-border/80 max-h-[88dvh] overflow-y-auto">
            <h3 className="text-base font-semibold text-foreground">Transfer Ownership?</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Transferring workspace ownership to <span className="font-semibold text-foreground">{memberToTransfer.user.name}</span> will demote your account to Admin. Are you sure?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMemberToTransfer(null)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleTransferOwnership}
                disabled={isTransferringOwnership}
                className="h-8 text-xs font-semibold"
              >
                {isTransferringOwnership ? "Transferring..." : "Confirm Transfer"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
