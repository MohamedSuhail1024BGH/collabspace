"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DbWorkspace, DbUser } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { deleteAccountAction, changePasswordAction } from "@/app/actions-auth";
import { updateUserProfileAction } from "@/app/actions-profile";
import { searchUsersForInviteAction } from "@/app/actions-search";
import { updateWorkspaceAction, deleteWorkspaceAction, leaveWorkspaceAction, transferWorkspaceOwnershipAction, addWorkspaceMemberAction, removeWorkspaceMemberAction } from "@/app/actions-workspaces";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { WorkspaceAvatar } from "@/components/ui/WorkspaceAvatar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  Users,
  User,
  Palette,
  Copy,
  Check,
  Search,
  Trash2,
  AlertTriangle,
  LogOut,
  Laptop,
  Moon,
  Sun,
  ArrowRightLeft,
  Upload,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Bell,
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

type SettingsClientProps = {
  user: Omit<DbUser, "passwordHash">;
  workspace: DbWorkspace | null;
  initialMembers?: WorkspaceMemberItem[];
};

const COLOR_THEMES = [
  { name: "Violet", class: "from-violet-500 to-indigo-600", border: "border-violet-500" },
  { name: "Cyan", class: "from-cyan-500 to-blue-600", border: "border-cyan-500" },
  { name: "Emerald", class: "from-emerald-500 to-teal-600", border: "border-emerald-500" },
  { name: "Amber", class: "from-amber-500 to-orange-600", border: "border-amber-500" },
  { name: "Rose", class: "from-rose-500 to-pink-600", border: "border-rose-500" },
];

export function SettingsClient({ user, workspace, initialMembers }: SettingsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"workspace" | "members" | "account" | "ui">("workspace");

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
  const [workspaceAvatar, setWorkspaceAvatar] = useState(workspace?.avatar ?? "");
  const [copiedLink, setCopiedLink] = useState(false);

  // User Profile Form State
  const [userName, setUserName] = useState(user.name);
  const [userUsername, setUserUsername] = useState(user.username ?? "");
  const [userBio, setUserBio] = useState(user.bio ?? "");
  const [avatarColor, setAvatarColor] = useState(user.avatar ?? "from-violet-500 to-cyan-400");

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Workspace Members Search State
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState<
    { id: string; name: string; username: string | null; email: string; avatar: string | null }[]
  >([]);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);
  const [selectedRoleForNewMember, setSelectedRoleForNewMember] = useState<"admin" | "member" | "viewer">("member");
  const latestSearchQueryRef = useRef("");

  // UI Preferences State
  const [appTheme, setAppTheme] = useState<"system" | "dark" | "light">("system");
  const [accentTheme, setAccentTheme] = useState("Violet");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [taskAlerts, setTaskAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  // Modals & Action States
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

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

  // Synchronize state when props update
  const [prevInitialMembers, setPrevInitialMembers] = useState(initialMembers);
  if (initialMembers && initialMembers !== prevInitialMembers) {
    setPrevInitialMembers(initialMembers);
    setMembers(initialMembers);
  }

  const [prevWorkspaceId, setPrevWorkspaceId] = useState(workspace?.id);
  if (workspace && workspace.id !== prevWorkspaceId) {
    setPrevWorkspaceId(workspace.id);
    setWorkspaceName(workspace.name);
    setWorkspaceDescription(workspace.description ?? "");
    setWorkspaceIsPublic(workspace.isPublic ?? true);
    setWorkspaceAvatar(workspace.avatar ?? "");
  }

  const [prevUserId, setPrevUserId] = useState(user?.id);
  if (user && user.id !== prevUserId) {
    setPrevUserId(user.id);
    setUserName(user.name);
    setUserUsername(user.username ?? "");
    setUserBio(user.bio ?? "");
    setAvatarColor(user.avatar ?? "from-violet-500 to-cyan-400");
  }

  // Load saved preferences from localStorage
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const savedAppTheme = localStorage.getItem("collabspace_theme_mode") as "system" | "dark" | "light" | null;
        if (savedAppTheme) {
          setAppTheme(savedAppTheme);
        }

        const savedTheme = localStorage.getItem("collabspace_accent_theme");
        if (savedTheme) {
          setAccentTheme(savedTheme);
          document.documentElement.setAttribute("data-accent", savedTheme.toLowerCase());
        }

        const savedDensity = localStorage.getItem("collabspace_density");
        if (savedDensity === "comfortable" || savedDensity === "compact") {
          setDensity(savedDensity);
          document.documentElement.setAttribute("data-density", savedDensity.toLowerCase());
        }

        const savedEmailAlerts = localStorage.getItem("collabspace_email_alerts");
        if (savedEmailAlerts !== null) setEmailAlerts(savedEmailAlerts === "true");

        const savedTaskAlerts = localStorage.getItem("collabspace_task_alerts");
        if (savedTaskAlerts !== null) setTaskAlerts(savedTaskAlerts === "true");

        const savedWeeklyDigest = localStorage.getItem("collabspace_weekly_digest");
        if (savedWeeklyDigest !== null) setWeeklyDigest(savedWeeklyDigest === "true");
      } catch {
        // Ignore localStorage read errors in SSR/sandboxes
      }
    });
  }, []);

  // Listen to OS scheme changes if appTheme is system
  useEffect(() => {
    if (appTheme !== "system") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute("data-theme", e.matches ? "light" : "dark");
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [appTheme]);

  const handleAppThemeChange = (mode: "system" | "dark" | "light") => {
    setAppTheme(mode);
    try {
      localStorage.setItem("collabspace_theme_mode", mode);
      let resolved = mode;
      if (mode === "system") {
        resolved = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      }
      document.documentElement.setAttribute("data-theme", resolved);
      window.dispatchEvent(new Event("collabspace_preferences_changed"));
    } catch {
      // Ignore
    }
    setFeedback({
      type: "success",
      message: `Application theme switched to ${mode.charAt(0).toUpperCase() + mode.slice(1)}.`,
    });
  };

  const handleAccentChange = (themeName: string) => {
    setAccentTheme(themeName);
    try {
      localStorage.setItem("collabspace_accent_theme", themeName);
      document.documentElement.setAttribute("data-accent", themeName.toLowerCase());
      window.dispatchEvent(new Event("collabspace_preferences_changed"));
    } catch {
      // Ignore
    }
    setFeedback({ type: "success", message: `Accent theme switched to ${themeName}.` });
  };

  const handleDensityChange = (newDensity: "comfortable" | "compact") => {
    setDensity(newDensity);
    try {
      localStorage.setItem("collabspace_density", newDensity);
      document.documentElement.setAttribute("data-density", newDensity.toLowerCase());
      window.dispatchEvent(new Event("collabspace_preferences_changed"));
    } catch {
      // Ignore
    }
    setFeedback({
      type: "success",
      message: `Layout density set to ${newDensity === "comfortable" ? "Comfortable" : "Compact"}.`,
    });
  };

  const handleToggleNotification = (type: "email" | "task" | "digest", checked: boolean) => {
    try {
      if (type === "email") {
        setEmailAlerts(checked);
        localStorage.setItem("collabspace_email_alerts", String(checked));
        setFeedback({ type: "success", message: `Email notifications ${checked ? "enabled" : "disabled"}.` });
      } else if (type === "task") {
        setTaskAlerts(checked);
        localStorage.setItem("collabspace_task_alerts", String(checked));
        setFeedback({ type: "success", message: `Task assignment alerts ${checked ? "enabled" : "disabled"}.` });
      } else if (type === "digest") {
        setWeeklyDigest(checked);
        localStorage.setItem("collabspace_weekly_digest", String(checked));
        setFeedback({ type: "success", message: `Weekly performance digest ${checked ? "enabled" : "disabled"}.` });
      }
    } catch {
      // Ignore
    }
  };

  // Member Management Handlers
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

    // Prevent race conditions where an older query completes after a newer one
    if (latestSearchQueryRef.current === q) {
      const existingUserIds = new Set(members.map((m) => m.user.id));
      setMemberSearchResults(results.filter((u) => !existingUserIds.has(u.id)));
      setIsSearchingMembers(false);
    }
  };

  const handleAddMember = async (targetUserId: string) => {
    if (!workspace) return;
    const targetUser = memberSearchResults.find((u) => u.id === targetUserId);

    // Optimistic addition
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
        // Rollback optimistic addition
        setMembers((prev) => prev.filter((m) => m.user.id !== targetUserId));
        setFeedback({ type: "error", message: res.error || "Failed to add member." });
      }
    });
  };

  const handleUpdateMemberRole = async (targetUserId: string, newRole: "admin" | "member" | "viewer") => {
    if (!workspace) return;
    const previousMembers = [...members];

    // Optimistically update
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

  const handleRemoveMember = async () => {
    if (!workspace || !memberToRemove) return;
    const targetUserId = memberToRemove.user.id;
    const previousMembers = [...members];

    // Optimistically remove
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

  const handleTransferOwnership = async () => {
    if (!workspace || !memberToTransfer) return;
    setIsTransferringOwnership(true);
    const targetUserId = memberToTransfer.user.id;

    const res = await transferWorkspaceOwnershipAction(workspace.id, targetUserId);
    setIsTransferringOwnership(false);
    setMemberToTransfer(null);

    if (res.success) {
      setFeedback({
        type: "success",
        message: `Workspace ownership successfully transferred to ${memberToTransfer.user.name}. You are now an Admin.`,
      });
      router.refresh();
    } else {
      setFeedback({ type: "error", message: res.error || "Failed to transfer ownership." });
    }
  };

  // Workspace Form Handler
  const handleSaveWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const res = await updateWorkspaceAction({
        name: workspaceName,
        description: workspaceDescription,
        isPublic: workspaceIsPublic,
        avatar: workspaceAvatar ? workspaceAvatar.trim() : null,
      });

      if (res.success) {
        setFeedback({ type: "success", message: "Workspace settings updated successfully." });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update workspace." });
      }
    });
  };

  const handleWorkspaceFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFeedback({ type: "error", message: "Please select an image file (JPEG, PNG, WebP, or SVG)." });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFeedback({ type: "error", message: "Workspace picture size must be under 2MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setWorkspaceAvatar(reader.result);
        setFeedback({ type: "success", message: "Custom workspace picture selected. Click 'Save Workspace' to apply." });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFeedback({ type: "error", message: "Image size must be under 2MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarColor(reader.result);
        setFeedback({ type: "success", message: "Custom profile picture selected. Click 'Save Profile' to apply." });
      }
    };
    reader.readAsDataURL(file);
  };

  // User Profile Form Handler
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const res = await updateUserProfileAction({
        name: userName,
        username: userUsername,
        bio: userBio,
        avatar: avatarColor,
      });

      if (res.success) {
        setFeedback({ type: "success", message: "Account profile updated successfully." });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update profile." });
      }
    });
  };

  // Password Change Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (!currentPassword || !newPassword) {
      setPasswordFeedback({ type: "error", message: "Please enter both current and new passwords." });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordFeedback({ type: "error", message: "New password must be at least 6 characters long." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: "error", message: "New passwords do not match." });
      return;
    }

    setIsChangingPassword(true);
    const res = await changePasswordAction({ currentPassword, newPassword });
    setIsChangingPassword(false);

    if (res.success) {
      setPasswordFeedback({ type: "success", message: "Password changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setPasswordFeedback({ type: "error", message: res.error || "Failed to change password." });
    }
  };

  // Workspace Deletion & Leave Handlers
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

  // Account Deletion Handler
  const handleDeleteAccount = async () => {
    setDeleteAccountError(null);
    setIsDeletingAccount(true);
    const res = await deleteAccountAction();
    if (res.success) {
      router.push("/login?deleted=true");
      router.refresh();
    } else {
      setDeleteAccountError(res.error || "Failed to delete account.");
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl 2xl:max-w-6xl mx-auto">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 border-b border-border pb-3 overflow-x-auto no-scrollbar">
        <Button
          type="button"
          data-testid="settings-workspace-tab"
          variant={activeTab === "workspace" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => {
            setActiveTab("workspace");
            setFeedback(null);
          }}
          className={`shrink-0 text-xs font-medium gap-2 ${
            activeTab === "workspace" ? "font-semibold text-foreground shadow-xs" : "text-muted-foreground"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Workspace</span>
        </Button>

        <Button
          type="button"
          data-testid="settings-members-tab"
          variant={activeTab === "members" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => {
            setActiveTab("members");
            setFeedback(null);
          }}
          className={`shrink-0 text-xs font-medium gap-2 ${
            activeTab === "members" ? "font-semibold text-foreground shadow-xs" : "text-muted-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Members & Roles</span>
        </Button>

        <Button
          type="button"
          data-testid="settings-account-tab"
          variant={activeTab === "account" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => {
            setActiveTab("account");
            setFeedback(null);
          }}
          className={`shrink-0 text-xs font-medium gap-2 ${
            activeTab === "account" ? "font-semibold text-foreground shadow-xs" : "text-muted-foreground"
          }`}
        >
          <User className="h-4 w-4" />
          <span>Account</span>
        </Button>

        <Button
          type="button"
          data-testid="settings-ui-tab"
          variant={activeTab === "ui" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => {
            setActiveTab("ui");
            setFeedback(null);
          }}
          className={`shrink-0 text-xs font-medium gap-2 ${
            activeTab === "ui" ? "font-semibold text-foreground shadow-xs" : "text-muted-foreground"
          }`}
        >
          <Palette className="h-4 w-4" />
          <span>UI & Preferences</span>
        </Button>
      </div>

      {/* Global Status Feedback Banner */}
      {feedback && (
        <div
          data-testid="settings-feedback-banner"
          className={`flex items-center gap-2.5 rounded-lg border p-3 text-xs transition-colors ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. WORKSPACE SETTINGS TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "workspace" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">Workspace Information</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Manage your organization identity, description, and team URL identifiers.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Your Role:</span>
                  <Badge variant={isOwner ? "default" : isAdmin ? "secondary" : "outline"} className="capitalize font-semibold">
                    {currentUserRole}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {!isAdmin && (
                <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>You have <strong>{currentUserRole}</strong> access. Only workspace owners and admins can update organization settings.</span>
                </div>
              )}

              <form onSubmit={handleSaveWorkspace} className="space-y-4 max-w-xl">
                {/* Workspace Picture Section */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Workspace Picture
                  </label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3.5 rounded-xl bg-muted/20 border border-border/60">
                    <div className="relative shrink-0">
                      <WorkspaceAvatar
                        avatar={workspaceAvatar}
                        name={workspaceName || workspace?.name}
                        size="lg"
                        className="shadow-sm"
                      />
                    </div>

                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex flex-wrap items-center gap-2">
                        <label
                          className={cn(
                            "cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card hover:bg-accent border border-border text-xs font-medium text-foreground transition-colors shadow-xs",
                            (!isAdmin || isPending) && "opacity-50 pointer-events-none"
                          )}
                        >
                          <Upload className="size-3.5 text-primary" />
                          <span>Upload Picture</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleWorkspaceFileUpload}
                            disabled={!isAdmin || isPending}
                            className="hidden"
                          />
                        </label>

                        {workspaceAvatar && isAdmin && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() => {
                              setWorkspaceAvatar("");
                              setFeedback({
                                type: "success",
                                message: "Workspace picture removed. Click 'Save Workspace' to apply.",
                              });
                            }}
                            className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                          >
                            <Trash2 className="size-3 mr-1" />
                            <span>Remove Picture</span>
                          </Button>
                        )}
                      </div>

                      <div>
                        <Input
                          type="text"
                          value={workspaceAvatar.startsWith("data:image/") ? "" : workspaceAvatar}
                          onChange={(e) => setWorkspaceAvatar(e.target.value)}
                          disabled={!isAdmin || isPending}
                          placeholder={
                            workspaceAvatar.startsWith("data:image/")
                              ? "Custom uploaded image active"
                              : "Or enter remote image URL (https://...)"
                          }
                          className="text-xs h-8"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="ws-name" className="block text-xs font-medium text-foreground mb-1.5">
                    Workspace Name
                  </label>
                  <Input
                    id="ws-name"
                    data-testid="workspace-name-input"
                    type="text"
                    disabled={!isAdmin || isPending}
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="e.g. Product Engineering, Design Studio"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="ws-slug" className="block text-xs font-medium text-foreground mb-1.5">
                    Workspace Identifier & URL
                  </label>
                  <div className="flex items-center rounded-lg border border-input bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground font-mono">
                    <span className="text-muted-foreground/60 mr-1">collabspace.app/</span>
                    <span className="text-foreground font-semibold">{workspace?.slug ?? "workspace"}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-testid="copy-workspace-slug-btn"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          const fullUrl = `${window.location.origin}/start?join=${workspace?.slug}`;
                          navigator.clipboard.writeText(fullUrl);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }
                      }}
                      className="ml-auto h-7 px-2.5 text-xs gap-1.5"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Share this identifier with prospective team members to let them request access.
                  </p>
                </div>

                <div>
                  <label htmlFor="ws-desc" className="block text-xs font-medium text-foreground mb-1.5">
                    Workspace Description
                  </label>
                  <Textarea
                    id="ws-desc"
                    data-testid="workspace-description-input"
                    rows={3}
                    disabled={!isAdmin || isPending}
                    value={workspaceDescription}
                    onChange={(e) => setWorkspaceDescription(e.target.value)}
                    placeholder="Describe your organization mission or team objective..."
                  />
                </div>

                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      data-testid="workspace-public-toggle"
                      disabled={!isAdmin || isPending}
                      checked={workspaceIsPublic}
                      onChange={(e) => setWorkspaceIsPublic(e.target.checked)}
                      className="h-4 w-4 mt-0.5 rounded border-input bg-background accent-primary disabled:opacity-60"
                    />
                    <div>
                      <span className="text-xs font-medium text-foreground">Public & Discoverable</span>
                      <p className="text-[11px] text-muted-foreground">Allow other CollabSpace members to discover and request access to this workspace.</p>
                    </div>
                  </label>
                </div>

                {isAdmin && (
                  <div className="pt-2">
                    <Button
                      type="submit"
                      data-testid="save-workspace-button"
                      disabled={isPending}
                    >
                      {isPending ? "Saving..." : "Save Workspace"}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Workspace Danger Zone */}
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span>Workspace Danger Zone</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {isOwner
                  ? "Permanently delete this workspace and all associated projects, tasks, events, and memberships. Or transfer ownership to another member in the Members tab."
                  : "Leave this workspace. You will lose access to all internal projects and documents."}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="flex flex-wrap gap-2.5">
                {isOwner ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    data-testid="workspace-delete-button"
                    onClick={() => setShowDeleteWorkspaceModal(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Delete Workspace
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid="workspace-leave-button"
                    onClick={() => setShowLeaveWorkspaceModal(true)}
                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1.5" />
                    Leave Workspace
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. WORKSPACE MEMBERS & ROLES TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "members" && (
        <div className="space-y-6">
          {/* Add Members Section (Only for Owners & Admins) */}
          {isAdmin ? (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Invite & Add Members</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Search registered users by @username or full name to add them to this workspace.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      data-testid="invite-user-search-input"
                      value={memberSearchQuery}
                      onChange={(e) => handleSearchUsersForInvite(e.target.value)}
                      placeholder="Search by username (e.g. useradm1, usermem1) or name..."
                      className="pl-9"
                    />
                  </div>

                  <select
                    data-testid="invite-role-select"
                    value={selectedRoleForNewMember}
                    onChange={(e) => setSelectedRoleForNewMember(e.target.value as "admin" | "member" | "viewer")}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-xs focus:border-primary focus:outline-none"
                  >
                    <option value="member">Member (Standard)</option>
                    {isOwner && <option value="admin">Admin (Management)</option>}
                    <option value="viewer">Viewer (Read-only)</option>
                  </select>
                </div>

                {/* Search Results for Member Invitation */}
                {memberSearchResults.length > 0 && (
                  <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Available Users</p>
                    {memberSearchResults.map((u) => (
                      <div
                        key={u.id}
                        data-testid={`invite-user-row-${u.username || u.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card p-2.5"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <UserAvatar avatar={u.avatar} name={u.name} size="xs" />
                          <div className="truncate">
                            <span className="text-xs font-semibold text-foreground">{u.name}</span>
                            <span className="ml-2 text-[11px] text-primary">@{u.username || "user"}</span>
                            <span className="ml-2 text-[10px] text-muted-foreground hidden sm:inline">({u.email})</span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          data-testid={`add-member-btn-${u.username || u.id}`}
                          disabled={isPending}
                          onClick={() => handleAddMember(u.id)}
                          className="shrink-0 text-xs"
                        >
                          Add as {selectedRoleForNewMember}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {memberSearchQuery.trim() !== "" && !isSearchingMembers && memberSearchResults.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    No matching users found for &quot;{memberSearchQuery}&quot;.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-4 text-xs text-muted-foreground">
                Only workspace owners and admins can invite new members or change team privileges.
              </CardContent>
            </Card>
          )}

          {/* Current Workspace Members Listing */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">Workspace Members ({members.length})</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Manage member privileges under organization guidelines.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="divide-y divide-border">
                {members.map((m) => {
                  const isTargetOwner = m.role === "owner";
                  const isTargetAdmin = m.role === "admin";
                  const isSelf = m.user.id === user.id;

                  const canModifyRole = !isSelf && !isTargetOwner && (isOwner || (isAdmin && !isTargetAdmin));
                  const canRemove = !isSelf && !isTargetOwner && (isOwner || (isAdmin && !isTargetAdmin));
                  const canTransferOwnership = isOwner && !isTargetOwner && !isSelf;

                  return (
                    <div
                      key={m.membershipId}
                      data-testid={`workspace-member-${m.user.username || m.user.id}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <UserAvatar avatar={m.user.avatar} name={m.user.name} size="sm" />
                        <div className="truncate min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <p className="text-xs font-semibold text-foreground truncate">{m.user.name}</p>
                            {isSelf && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-semibold text-primary border-primary/30 bg-primary/10">
                                You
                              </Badge>
                            )}
                            {m.status === "pending" && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-semibold text-amber-600 border-amber-500/30 bg-amber-500/10">
                                Pending
                              </Badge>
                            )}
                            <span className="text-[11px] text-primary">@{m.user.username || "user"}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{m.user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1 sm:pt-0 border-t border-border/50 sm:border-t-0">
                        {canModifyRole ? (
                          <select
                            data-testid={`change-role-${m.user.username || m.user.id}`}
                            value={m.role}
                            disabled={isPending}
                            onChange={(e) =>
                              handleUpdateMemberRole(
                                m.user.id,
                                e.target.value as "admin" | "member" | "viewer"
                              )
                            }
                            aria-label={`Change role for ${m.user.name}`}
                            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                          >
                            {isOwner && <option value="admin">Admin</option>}
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        ) : (
                          <Badge variant={isTargetOwner ? "default" : isTargetAdmin ? "secondary" : "outline"} className="capitalize font-semibold text-xs">
                            {m.role}
                          </Badge>
                        )}

                        <div className="flex items-center gap-1">
                          {canTransferOwnership && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              data-testid={`transfer-ownership-${m.user.username || m.user.id}`}
                              disabled={isPending}
                              onClick={() => setMemberToTransfer(m)}
                              title="Transfer workspace ownership"
                              className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                            </Button>
                          )}

                          {canRemove && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              data-testid={`remove-member-${m.user.username || m.user.id}`}
                              disabled={isPending}
                              onClick={() => setMemberToRemove(m)}
                              title="Remove from workspace"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. ACCOUNT SETTINGS TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "account" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <span>Personal Profile</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Update your account identity, handle, and avatar style across CollabSpace.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border">
                  <UserAvatar avatar={avatarColor} name={userName} size="xl" />

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer">
                        <Button variant="outline" size="sm" type="button" asChild>
                          <span className="flex items-center gap-1.5 text-xs">
                            <Upload className="w-3.5 h-3.5 text-primary" />
                            <span>Upload Photo</span>
                          </span>
                        </Button>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>

                      {avatarColor && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setAvatarColor("")}
                          className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          <span>Remove Photo</span>
                        </Button>
                      )}
                    </div>

                    <div>
                      <Input
                        type="text"
                        value={avatarColor.startsWith("data:image/") ? "" : avatarColor}
                        onChange={(e) => setAvatarColor(e.target.value)}
                        placeholder={avatarColor.startsWith("data:image/") ? "Custom uploaded image active" : "Or enter remote image URL (https://...)"}
                        className="font-mono text-xs"
                      />
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      JPEG, PNG, WebP or SVG under 2MB. If no image is provided, your initials or avatar will be shown as default.
                    </p>
                  </div>
                </div>

                <div>
                  <label htmlFor="user-name" className="block text-xs font-medium text-foreground mb-1.5">
                    Full Display Name
                  </label>
                  <Input
                    id="user-name"
                    data-testid="user-name-input"
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="user-username" className="block text-xs font-medium text-foreground mb-1.5">
                    Username Handle
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-muted-foreground">@</span>
                    <Input
                      id="user-username"
                      data-testid="user-username-input"
                      type="text"
                      value={userUsername}
                      onChange={(e) => setUserUsername(e.target.value)}
                      placeholder="username"
                      className="pl-7"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">Used for mentions and team directory lookups.</p>
                </div>

                <div>
                  <label htmlFor="user-bio" className="block text-xs font-medium text-foreground mb-1.5">
                    Bio / Role Title
                  </label>
                  <Textarea
                    id="user-bio"
                    data-testid="user-bio-input"
                    rows={2}
                    value={userBio}
                    onChange={(e) => setUserBio(e.target.value)}
                    placeholder="e.g. Senior Frontend Architect & Design Systems Lead"
                  />
                </div>

                <div>
                  <label htmlFor="user-email" className="block text-xs font-medium text-foreground mb-1.5">
                    Email Address
                  </label>
                  <Input
                    id="user-email"
                    type="email"
                    value={user.email}
                    disabled
                    className="opacity-70 cursor-not-allowed bg-muted/50"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">Email address cannot be changed directly.</p>
                </div>

                <div>
                  <Button
                    type="submit"
                    data-testid="save-profile-button"
                    disabled={isPending}
                  >
                    {isPending ? "Saving..." : "Save Profile"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Security & Password Change */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                <span>Security & Password</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Update your account password to maintain security across devices.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {passwordFeedback && (
                <div
                  data-testid="password-feedback-banner"
                  className={`mb-4 flex items-center gap-2 rounded-lg border p-3 text-xs ${
                    passwordFeedback.type === "success"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                  }`}
                >
                  {passwordFeedback.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <span>{passwordFeedback.message}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
                <div>
                  <label htmlFor="curr-password" className="block text-xs font-medium text-foreground mb-1.5">
                    Current Password
                  </label>
                  <Input
                    id="curr-password"
                    data-testid="current-password-input"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="new-password" className="block text-xs font-medium text-foreground mb-1.5">
                      New Password
                    </label>
                    <Input
                      id="new-password"
                      data-testid="new-password-input"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                    />
                  </div>

                  <div>
                    <label htmlFor="confirm-password" className="block text-xs font-medium text-foreground mb-1.5">
                      Confirm Password
                    </label>
                    <Input
                      id="confirm-password"
                      data-testid="confirm-password-input"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <Button
                    type="submit"
                    data-testid="change-password-button"
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Account Danger Zone */}
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span>Account Danger Zone</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Permanently remove your personal account and all associated memberships. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                data-testid="settings-delete-account-button"
                onClick={() => {
                  setDeleteAccountError(null);
                  setShowDeleteAccountModal(true);
                }}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. UI & PREFERENCES TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "ui" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <span>Appearance & Theme</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Personalize visual accents and interface density for your account.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 max-w-xl">
              <div>
                <label className="block text-xs font-medium text-foreground mb-2">
                  Application Theme
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                  <Button
                    type="button"
                    data-testid="settings-app-theme-system-btn"
                    variant={appTheme === "system" ? "secondary" : "outline"}
                    onClick={() => handleAppThemeChange("system")}
                    className={`h-auto py-2.5 px-3 flex flex-col sm:flex-row items-center gap-1.5 text-xs ${
                      appTheme === "system" ? "border-primary bg-primary/10 text-primary font-semibold" : ""
                    }`}
                  >
                    <Laptop className="h-4 w-4 shrink-0" />
                    <span>System</span>
                  </Button>

                  <Button
                    type="button"
                    data-testid="settings-app-theme-dark-btn"
                    variant={appTheme === "dark" ? "secondary" : "outline"}
                    onClick={() => handleAppThemeChange("dark")}
                    className={`h-auto py-2.5 px-3 flex flex-col sm:flex-row items-center gap-1.5 text-xs ${
                      appTheme === "dark" ? "border-primary bg-primary/10 text-primary font-semibold" : ""
                    }`}
                  >
                    <Moon className="h-4 w-4 shrink-0" />
                    <span>Dark</span>
                  </Button>

                  <Button
                    type="button"
                    data-testid="settings-app-theme-light-btn"
                    variant={appTheme === "light" ? "secondary" : "outline"}
                    onClick={() => handleAppThemeChange("light")}
                    className={`h-auto py-2.5 px-3 flex flex-col sm:flex-row items-center gap-1.5 text-xs ${
                      appTheme === "light" ? "border-primary bg-primary/10 text-primary font-semibold" : ""
                    }`}
                  >
                    <Sun className="h-4 w-4 shrink-0" />
                    <span>Light</span>
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-2">
                  Theme Accent Color
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                  {COLOR_THEMES.map((theme) => {
                    const isSelected = accentTheme.toLowerCase() === theme.name.toLowerCase();
                    return (
                      <Button
                        key={theme.name}
                        type="button"
                        variant={isSelected ? "secondary" : "outline"}
                        onClick={() => handleAccentChange(theme.name)}
                        className={`h-auto py-2 px-2.5 flex items-center justify-start gap-2 text-xs ${
                          isSelected ? "border-primary bg-primary/10 font-semibold text-primary" : ""
                        }`}
                      >
                        <div className={`h-3 w-3 rounded-full shrink-0 bg-gradient-to-br ${theme.class}`} />
                        <span className="truncate">{theme.name}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-2">
                  Interface Layout Density
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Button
                    type="button"
                    variant={density === "comfortable" ? "secondary" : "outline"}
                    onClick={() => handleDensityChange("comfortable")}
                    className={`h-auto p-3 flex flex-col items-start text-left ${
                      density === "comfortable" ? "border-primary bg-primary/10 text-primary font-semibold" : ""
                    }`}
                  >
                    <p className="text-xs font-semibold">Comfortable</p>
                    <p className="text-[11px] text-muted-foreground font-normal">Generous padding and card spacing</p>
                  </Button>

                  <Button
                    type="button"
                    variant={density === "compact" ? "secondary" : "outline"}
                    onClick={() => handleDensityChange("compact")}
                    className={`h-auto p-3 flex flex-col items-start text-left ${
                      density === "compact" ? "border-primary bg-primary/10 text-primary font-semibold" : ""
                    }`}
                  >
                    <p className="text-xs font-semibold">Compact</p>
                    <p className="text-[11px] text-muted-foreground font-normal">High information density for larger screens</p>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <span>Notification Preferences</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Choose how and when you receive workspace updates (saved to local preferences).
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 max-w-xl">
              <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-card cursor-pointer hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-xs font-medium text-foreground">Email Notifications</p>
                  <p className="text-[11px] text-muted-foreground">Receive email alerts for important workspace events</p>
                </div>
                <input
                  type="checkbox"
                  data-testid="email-alerts-toggle"
                  checked={emailAlerts}
                  onChange={(e) => handleToggleNotification("email", e.target.checked)}
                  className="h-4 w-4 rounded border-input bg-background accent-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-card cursor-pointer hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-xs font-medium text-foreground">Task Assignment Alerts</p>
                  <p className="text-[11px] text-muted-foreground">Notify when someone assigns or mentions you in a task</p>
                </div>
                <input
                  type="checkbox"
                  data-testid="task-alerts-toggle"
                  checked={taskAlerts}
                  onChange={(e) => handleToggleNotification("task", e.target.checked)}
                  className="h-4 w-4 rounded border-input bg-background accent-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-card cursor-pointer hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-xs font-medium text-foreground">Weekly Performance Digest</p>
                  <p className="text-[11px] text-muted-foreground">Summary of project completion rates sent every Monday</p>
                </div>
                <input
                  type="checkbox"
                  data-testid="weekly-digest-toggle"
                  checked={weeklyDigest}
                  onChange={(e) => handleToggleNotification("digest", e.target.checked)}
                  className="h-4 w-4 rounded border-input bg-background accent-primary"
                />
              </label>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODALS */}
      {/* ------------------------------------------------------------- */}

      {/* 1. Account Deletion Modal */}
      {showDeleteAccountModal && (
        <div
          data-testid="settings-delete-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-xl border border-destructive/30 bg-card p-4 sm:p-6 shadow-2xl max-h-[88dvh] overflow-y-auto">
            <div className="flex items-center gap-3 text-destructive">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Delete Account</h3>
            </div>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete your account? All your workspace memberships and data will be permanently removed.
            </p>

            {deleteAccountError && (
              <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                {deleteAccountError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteAccountModal(false)}
                disabled={isDeletingAccount}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                data-testid="confirm-delete-account-button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? "Deleting..." : "Yes, Delete Account"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Workspace Deletion Modal */}
      {showDeleteWorkspaceModal && (
        <div
          data-testid="delete-workspace-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-xl border border-destructive/30 bg-card p-4 sm:p-6 shadow-2xl max-h-[88dvh] overflow-y-auto">
            <div className="flex items-center gap-3 text-destructive">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Delete Workspace</h3>
            </div>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-foreground">{workspace?.name}</strong>? All projects, tasks, and member access will be permanently destroyed.
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteWorkspaceModal(false)}
                disabled={isDeletingWorkspace}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                data-testid="confirm-delete-workspace-button"
                onClick={handleDeleteWorkspace}
                disabled={isDeletingWorkspace}
              >
                {isDeletingWorkspace ? "Deleting..." : "Yes, Delete Workspace"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Leave Workspace Modal */}
      {showLeaveWorkspaceModal && (
        <div
          data-testid="leave-workspace-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-4 sm:p-6 shadow-2xl max-h-[88dvh] overflow-y-auto">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15">
                <LogOut className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Leave Workspace</h3>
            </div>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to leave <strong className="text-foreground">{workspace?.name}</strong>? You will need an invitation to regain access.
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowLeaveWorkspaceModal(false)}
                disabled={isLeavingWorkspace}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                data-testid="confirm-leave-workspace-button"
                onClick={handleLeaveWorkspace}
                disabled={isLeavingWorkspace}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isLeavingWorkspace ? "Leaving..." : "Leave Workspace"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Remove Member Confirmation Modal */}
      {memberToRemove && (
        <div
          data-testid="confirm-remove-member-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-xl border border-destructive/30 bg-card p-4 sm:p-6 shadow-2xl max-h-[88dvh] overflow-y-auto">
            <div className="flex items-center gap-3 text-destructive">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Remove Member</h3>
            </div>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to remove <strong className="text-foreground">{memberToRemove.user.name}</strong> from this workspace?
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMemberToRemove(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                data-testid="confirm-remove-member-btn"
                onClick={handleRemoveMember}
                disabled={isPending}
              >
                {isPending ? "Removing..." : "Remove Member"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Transfer Workspace Ownership Modal */}
      {memberToTransfer && (
        <div
          data-testid="transfer-ownership-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-4 sm:p-6 shadow-2xl max-h-[88dvh] overflow-y-auto">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Transfer Ownership</h3>
            </div>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to transfer ownership of <strong className="text-foreground">{workspace?.name}</strong> to <strong className="text-foreground">{memberToTransfer.user.name}</strong>?
            </p>
            <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-400">
              You will remain an Admin of the workspace, but <strong className="text-foreground">{memberToTransfer.user.name}</strong> will become the primary Owner.
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMemberToTransfer(null)}
                disabled={isTransferringOwnership}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                data-testid="confirm-transfer-ownership-btn"
                onClick={handleTransferOwnership}
                disabled={isTransferringOwnership}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isTransferringOwnership ? "Transferring..." : "Yes, Transfer Ownership"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
