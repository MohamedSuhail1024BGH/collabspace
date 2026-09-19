"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DbWorkspace, DbUser } from "@/lib/db/schema";
import {
  updateWorkspaceAction,
  updateUserProfileAction,
  deleteAccountAction,
  deleteWorkspaceAction,
  leaveWorkspaceAction,
  transferWorkspaceOwnershipAction,
  changePasswordAction,
  addWorkspaceMemberAction,
  removeWorkspaceMemberAction,
  searchUsersAction,
} from "@/app/actions";
import { UserAvatar } from "@/components/ui/UserAvatar";

export type WorkspaceMemberItem = {
  membershipId: string;
  role: string;
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
    const results = await searchUsersAction(q);

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
        setFeedback({ type: "success", message: "Member successfully added to workspace." });
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
      });

      if (res.success) {
        setFeedback({ type: "success", message: "Workspace settings updated successfully." });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update workspace." });
      }
    });
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
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center border-b border-outline/20 pb-3 gap-2 overflow-x-auto">
        <button
          type="button"
          data-testid="settings-workspace-tab"
          onClick={() => {
            setActiveTab("workspace");
            setFeedback(null);
          }}
          className={`flex items-center gap-2 rounded px-3.5 py-1.5 text-xs font-medium transition shrink-0 ${
            activeTab === "workspace"
              ? "bg-surface-container-highest text-on-surface font-semibold shadow-sm"
              : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span>Workspace</span>
        </button>

        <button
          type="button"
          data-testid="settings-members-tab"
          onClick={() => {
            setActiveTab("members");
            setFeedback(null);
          }}
          className={`flex items-center gap-2 rounded px-3.5 py-1.5 text-xs font-medium transition shrink-0 ${
            activeTab === "members"
              ? "bg-surface-container-highest text-on-surface font-semibold shadow-sm"
              : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span>Members & Roles</span>
        </button>

        <button
          type="button"
          data-testid="settings-account-tab"
          onClick={() => {
            setActiveTab("account");
            setFeedback(null);
          }}
          className={`flex items-center gap-2 rounded px-3.5 py-1.5 text-xs font-medium transition shrink-0 ${
            activeTab === "account"
              ? "bg-surface-container-highest text-on-surface font-semibold shadow-sm"
              : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Account</span>
        </button>

        <button
          type="button"
          data-testid="settings-ui-tab"
          onClick={() => {
            setActiveTab("ui");
            setFeedback(null);
          }}
          className={`flex items-center gap-2 rounded px-3.5 py-1.5 text-xs font-medium transition shrink-0 ${
            activeTab === "ui"
              ? "bg-surface-container-highest text-on-surface font-semibold shadow-sm"
              : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          <span>UI & Preferences</span>
        </button>
      </div>

      {/* Global Status Feedback Banner */}
      {feedback && (
        <div
          data-testid="settings-feedback-banner"
          className={`flex items-center gap-2 rounded border p-3 text-xs font-body-sm ${
            feedback.type === "success"
              ? "border-secondary/30 bg-secondary/10 text-secondary"
              : "border-error/30 bg-error/10 text-error"
          }`}
        >
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. WORKSPACE SETTINGS TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "workspace" && (
        <div className="space-y-6">
          <section className="rounded border border-outline/20 bg-surface-container-low p-4 sm:p-5">
            <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-on-surface">Workspace Information</h3>
                <p className="text-xs text-on-surface-variant font-body-sm mt-0.5">
                  Manage your organization identity, description, and team URL identifiers.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-on-surface-variant font-label-sm">Your Role:</span>
                <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize font-label-sm ${
                  isOwner
                    ? "bg-tertiary/15 text-tertiary border border-tertiary/30"
                    : isAdmin
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-surface-container-high text-on-surface-variant border border-outline/20"
                }`}>
                  {currentUserRole}
                </span>
              </div>
            </div>

            {!isAdmin && (
              <div className="mb-4 rounded border border-tertiary/30 bg-tertiary/10 p-3 text-xs text-tertiary flex items-center gap-2 font-body-sm">
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>You have <strong>{currentUserRole}</strong> access. Only workspace owners and admins can update organization settings.</span>
              </div>
            )}

            <form onSubmit={handleSaveWorkspace} className="space-y-4 max-w-xl">
              <div>
                <label htmlFor="ws-name" className="block font-label-sm text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                  Workspace Name
                </label>
                <input
                  id="ws-name"
                  data-testid="workspace-name-input"
                  type="text"
                  disabled={!isAdmin || isPending}
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  className="w-full rounded border border-outline/20 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  required
                />
              </div>

              <div>
                <label htmlFor="ws-slug" className="block font-label-sm text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                  Workspace Identifier & URL
                </label>
                <div className="flex items-center rounded border border-outline/20 bg-surface-container-lowest px-3 py-1.5 text-xs text-on-surface-variant font-mono">
                  <span className="text-on-surface-variant/60 mr-1">collabspace.app/</span>
                  <span className="text-on-surface font-semibold">{workspace?.slug ?? "workspace"}</span>
                  <button
                    type="button"
                    data-testid="copy-workspace-slug-btn"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        const fullUrl = `${window.location.origin}/start?join=${workspace?.slug}`;
                        navigator.clipboard.writeText(fullUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }
                    }}
                    className="ml-auto inline-flex items-center gap-1.5 rounded border border-outline/20 bg-surface-container px-2.5 py-1 text-xs text-on-surface hover:bg-surface-container-high transition font-sans font-medium"
                  >
                    {copiedLink ? (
                      <>
                        <svg className="w-3.5 h-3.5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 text-on-surface-variant shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-on-surface-variant font-body-sm">
                  Share this identifier with prospective team members to let them request access.
                </p>
              </div>

              <div>
                <label htmlFor="ws-desc" className="block font-label-sm text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                  Workspace Description
                </label>
                <textarea
                  id="ws-desc"
                  data-testid="workspace-description-input"
                  rows={3}
                  disabled={!isAdmin || isPending}
                  value={workspaceDescription}
                  onChange={(e) => setWorkspaceDescription(e.target.value)}
                  placeholder="Describe your organization mission or team objective..."
                  className="w-full rounded border border-outline/20 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    data-testid="workspace-public-toggle"
                    disabled={!isAdmin || isPending}
                    checked={workspaceIsPublic}
                    onChange={(e) => setWorkspaceIsPublic(e.target.checked)}
                    className="h-4 w-4 rounded border-outline/30 bg-surface-container-lowest accent-primary disabled:opacity-60"
                  />
                  <div>
                    <span className="text-xs font-medium text-on-surface">Public & Discoverable</span>
                    <p className="text-[11px] text-on-surface-variant font-body-sm">Allow other CollabSpace members to discover and request access to this workspace.</p>
                  </div>
                </label>
              </div>

              {isAdmin && (
                <div className="pt-2">
                  <button
                    type="submit"
                    data-testid="save-workspace-button"
                    disabled={isPending}
                    className="rounded bg-primary px-4 py-1.5 text-xs font-semibold text-on-primary shadow-sm transition hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50"
                  >
                    {isPending ? "Saving..." : "Save Workspace"}
                  </button>
                </div>
              )}
            </form>
          </section>

          {/* Workspace Danger Zone */}
          <section className="rounded border border-error/30 bg-error/5 p-4 sm:p-5">
            <h4 className="text-sm font-semibold text-error">Workspace Management & Danger Zone</h4>
            <p className="mt-1 text-xs text-on-surface-variant font-body-sm">
              {isOwner
                ? "Permanently delete this workspace and all associated projects, tasks, events, and memberships. Or transfer ownership to another member in the Members tab."
                : "Leave this workspace. You will lose access to all internal projects and documents."}
            </p>

            <div className="mt-3.5 flex flex-wrap gap-2.5">
              {isOwner ? (
                <button
                  type="button"
                  data-testid="workspace-delete-button"
                  onClick={() => setShowDeleteWorkspaceModal(true)}
                  className="rounded border border-error/30 bg-error/15 px-3 py-1.5 text-xs font-medium text-error transition hover:bg-error/25"
                >
                  Delete Workspace
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="workspace-leave-button"
                  onClick={() => setShowLeaveWorkspaceModal(true)}
                  className="rounded border border-tertiary/30 bg-tertiary/15 px-3 py-1.5 text-xs font-medium text-tertiary transition hover:bg-tertiary/25"
                >
                  Leave Workspace
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. WORKSPACE MEMBERS & ROLES TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "members" && (
        <div className="space-y-6">
          {/* Add Members Section (Only for Owners & Admins) */}
          {isAdmin ? (
            <section className="rounded border border-outline/20 bg-surface-container-low p-4 sm:p-5">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-on-surface">Invite & Add Members</h3>
                <p className="text-xs text-on-surface-variant font-body-sm mt-0.5">
                  Search registered users by @username or full name to add them to this workspace.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-on-surface-variant">@</span>
                  <input
                    type="text"
                    data-testid="invite-user-search-input"
                    value={memberSearchQuery}
                    onChange={(e) => handleSearchUsersForInvite(e.target.value)}
                    placeholder="Search by username (e.g. useradm1, usermem1) or name..."
                    className="w-full rounded border border-outline/20 bg-surface-container-lowest pl-7 pr-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
                  />
                </div>

                <select
                  data-testid="invite-role-select"
                  value={selectedRoleForNewMember}
                  onChange={(e) => setSelectedRoleForNewMember(e.target.value as "admin" | "member" | "viewer")}
                  className="rounded border border-outline/20 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none"
                >
                  <option value="member">Member (Standard)</option>
                  {isOwner && <option value="admin">Admin (Management)</option>}
                  <option value="viewer">Viewer (Read-only)</option>
                </select>
              </div>

              {/* Search Results for Member Invitation */}
              {memberSearchResults.length > 0 && (
                <div className="mt-3.5 space-y-2 rounded border border-outline/20 bg-surface-container-lowest p-3">
                  <p className="font-label-sm text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Available Users</p>
                  {memberSearchResults.map((u) => (
                    <div
                      key={u.id}
                      data-testid={`invite-user-row-${u.username || u.id}`}
                      className="flex items-center justify-between gap-3 rounded border border-outline/10 bg-surface-container-low p-2.5"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded bg-gradient-to-br ${u.avatar || "from-violet-500 to-cyan-400"} text-xs font-bold text-white`}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <span className="text-xs font-semibold text-on-surface">{u.name}</span>
                          <span className="ml-2 font-label-sm text-[11px] text-primary">@{u.username || "user"}</span>
                          <span className="ml-2 text-[10px] text-on-surface-variant hidden sm:inline">({u.email})</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        data-testid={`add-member-btn-${u.username || u.id}`}
                        disabled={isPending}
                        onClick={() => handleAddMember(u.id)}
                        className="shrink-0 rounded bg-primary px-3 py-1 text-xs font-semibold text-on-primary transition hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50 shadow-sm"
                      >
                        Add as {selectedRoleForNewMember}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {memberSearchQuery.trim() !== "" && !isSearchingMembers && memberSearchResults.length === 0 && (
                <div className="mt-3 rounded border border-outline/10 bg-surface-container-lowest p-3 text-center text-xs text-on-surface-variant">
                  No matching users found for &quot;{memberSearchQuery}&quot;.
                </div>
              )}
            </section>
          ) : (
            <div className="rounded border border-outline/20 bg-surface-container-low p-3.5 text-xs text-on-surface-variant">
              Only workspace owners and admins can invite new members or change team privileges.
            </div>
          )}

          {/* Current Workspace Members Listing */}
          <section className="rounded border border-outline/20 bg-surface-container-low p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-on-surface">Workspace Members ({members.length})</h3>
                <p className="text-xs text-on-surface-variant font-body-sm mt-0.5">Manage member privileges under organization guidelines.</p>
              </div>
            </div>

            <div className="divide-y divide-outline/10">
              {members.map((m) => {
                const isTargetOwner = m.role === "owner";
                const isTargetAdmin = m.role === "admin";
                const isSelf = m.user.id === user.id;

                // Authorization:
                // - Can only edit if caller is owner OR (caller is admin and target is neither owner nor admin)
                const canModifyRole = !isSelf && !isTargetOwner && (isOwner || (isAdmin && !isTargetAdmin));
                const canRemove = !isSelf && !isTargetOwner && (isOwner || (isAdmin && !isTargetAdmin));
                const canTransferOwnership = isOwner && !isTargetOwner && !isSelf;

                return (
                  <div
                    key={m.membershipId}
                    data-testid={`workspace-member-${m.user.username || m.user.id}`}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gradient-to-br ${m.user.avatar || "from-violet-500 to-cyan-400"} font-bold text-white text-xs`}>
                        {m.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-on-surface truncate">{m.user.name}</p>
                          {isSelf && (
                            <span className="rounded bg-primary/15 text-primary border border-primary/30 px-1.5 py-0.2 font-label-sm text-[10px] font-semibold">
                              You
                            </span>
                          )}
                          <span className="font-label-sm text-[11px] text-primary">@{m.user.username || "user"}</span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant truncate font-body-sm">{m.user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
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
                          className="rounded border border-outline/20 bg-surface-container-lowest px-2 py-1 text-xs font-medium text-on-surface focus:border-primary focus:outline-none"
                        >
                          {isOwner && <option value="admin">Admin</option>}
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize font-label-sm ${
                          isTargetOwner
                            ? "bg-tertiary/15 text-tertiary border border-tertiary/30"
                            : isTargetAdmin
                            ? "bg-primary/15 text-primary border border-primary/30"
                            : "bg-surface-container-high text-on-surface-variant border border-outline/20"
                        }`}>
                          {m.role}
                        </span>
                      )}

                      {canTransferOwnership && (
                        <button
                          type="button"
                          data-testid={`transfer-ownership-${m.user.username || m.user.id}`}
                          disabled={isPending}
                          onClick={() => setMemberToTransfer(m)}
                          title="Transfer workspace ownership"
                          className="rounded p-1 text-tertiary hover:bg-tertiary/10 transition"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </button>
                      )}

                      {canRemove && (
                        <button
                          type="button"
                          data-testid={`remove-member-${m.user.username || m.user.id}`}
                          disabled={isPending}
                          onClick={() => setMemberToRemove(m)}
                          title="Remove from workspace"
                          className="rounded p-1 text-on-surface-variant hover:bg-error/10 hover:text-error transition"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. ACCOUNT SETTINGS TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "account" && (
        <div className="space-y-6">
          <section className="rounded border border-outline/20 bg-surface-container-low p-4 sm:p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-on-surface">Personal Profile</h3>
              <p className="text-xs text-on-surface-variant font-body-sm mt-0.5">
                Update your account identity, handle, and avatar style across CollabSpace.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3.5 rounded-lg bg-surface-container border border-outline/20">
                <UserAvatar avatar={avatarColor} name={userName} size="xl" />

                <div className="flex-1 space-y-2 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-high hover:bg-surface-container-highest border border-outline/20 text-xs font-mono text-on-surface transition-colors shadow-xs">
                      <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span>Upload Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    {avatarColor && (
                      <button
                        type="button"
                        onClick={() => setAvatarColor("")}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-surface-container-high text-xs font-mono text-error hover:bg-error/10 border border-outline/20 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Remove Photo</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      value={avatarColor.startsWith("data:image/") ? "" : avatarColor}
                      onChange={(e) => setAvatarColor(e.target.value)}
                      placeholder={avatarColor.startsWith("data:image/") ? "Custom uploaded image active" : "Or enter remote image URL (https://...)"}
                      className="w-full rounded border border-outline/20 bg-surface-container-lowest px-2.5 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none font-mono"
                    />
                  </div>

                  <p className="text-[10px] text-on-surface-variant font-mono">
                    JPEG, PNG, WebP or SVG under 2MB. If no image is provided, your monogram initials or User icon will be shown as default.
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="user-name" className="block font-label-sm text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                  Full Display Name
                </label>
                <input
                  id="user-name"
                  data-testid="user-name-input"
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full rounded border border-outline/20 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="user-username" className="block font-label-sm text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                  Username Handle
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-on-surface-variant">@</span>
                  <input
                    id="user-username"
                    data-testid="user-username-input"
                    type="text"
                    value={userUsername}
                    onChange={(e) => setUserUsername(e.target.value)}
                    placeholder="username"
                    className="w-full rounded border border-outline/20 bg-surface-container-lowest pl-7 pr-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none font-label-sm"
                  />
                </div>
                <p className="mt-1 text-[11px] text-on-surface-variant font-body-sm">Used for mentions and team directory lookups.</p>
              </div>

              <div>
                <label htmlFor="user-bio" className="block font-label-sm text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                  Bio / Role Title
                </label>
                <textarea
                  id="user-bio"
                  data-testid="user-bio-input"
                  rows={2}
                  value={userBio}
                  onChange={(e) => setUserBio(e.target.value)}
                  placeholder="e.g. Senior Frontend Architect & Design Systems Lead"
                  className="w-full rounded border border-outline/20 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="user-email" className="block font-label-sm text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                  Email Address
                </label>
                <input
                  id="user-email"
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full rounded border border-outline/10 bg-surface-container-lowest/60 px-3 py-2 text-xs text-on-surface-variant cursor-not-allowed"
                />
                <p className="mt-1 text-[11px] text-on-surface-variant font-body-sm">Email address cannot be changed directly.</p>
              </div>

              <div>
                <button
                  type="submit"
                  data-testid="save-profile-button"
                  disabled={isPending}
                  className="rounded bg-primary px-4 py-1.5 text-xs font-semibold text-on-primary shadow-sm transition hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          </section>

          {/* Security & Password Change */}
          <section className="rounded border border-outline/20 bg-surface-container-low p-4 sm:p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-on-surface">Security & Password</h3>
              <p className="text-xs text-on-surface-variant font-body-sm mt-0.5">
                Update your account password to maintain security across devices.
              </p>
            </div>

            {passwordFeedback && (
              <div
                data-testid="password-feedback-banner"
                className={`mb-4 flex items-center gap-2 rounded border p-3 text-xs font-body-sm ${
                  passwordFeedback.type === "success"
                    ? "border-secondary/30 bg-secondary/10 text-secondary"
                    : "border-error/30 bg-error/10 text-error"
                }`}
              >
                <span>{passwordFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5 max-w-xl">
              <div>
                <label htmlFor="curr-password" className="block font-label-sm text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                  Current Password
                </label>
                <input
                  id="curr-password"
                  data-testid="current-password-input"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded border border-outline/20 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-password" className="block font-label-sm text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    New Password
                  </label>
                  <input
                    id="new-password"
                    data-testid="new-password-input"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full rounded border border-outline/20 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block font-label-sm text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Confirm Password
                  </label>
                  <input
                    id="confirm-password"
                    data-testid="confirm-password-input"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full rounded border border-outline/20 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  data-testid="change-password-button"
                  disabled={isChangingPassword}
                  className="rounded bg-primary px-4 py-1.5 text-xs font-semibold text-on-primary shadow-sm transition hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50"
                >
                  {isChangingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </section>

          {/* Account Danger Zone */}
          <section className="rounded border border-error/30 bg-error/5 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-error">Account Danger Zone</h3>
            <p className="mt-1 text-xs text-on-surface-variant font-body-sm">
              Permanently remove your personal account and all associated memberships. This action cannot be undone.
            </p>
            <div className="mt-3.5">
              <button
                type="button"
                data-testid="settings-delete-account-button"
                onClick={() => {
                  setDeleteAccountError(null);
                  setShowDeleteAccountModal(true);
                }}
                className="rounded border border-error/30 bg-error/15 px-3 py-1.5 text-xs font-medium text-error transition hover:bg-error/25"
              >
                Delete Account
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. UI & PREFERENCES TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "ui" && (
        <div className="space-y-6">
          <section className="rounded border border-outline/20 bg-surface-container-low p-4 sm:p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-on-surface">Appearance & Theme</h3>
              <p className="text-xs text-on-surface-variant font-body-sm mt-0.5">
                Personalize visual accents and interface density for your account.
              </p>
            </div>

            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block font-label-sm text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                  Theme Accent Color
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {COLOR_THEMES.map((theme) => {
                    const isSelected = accentTheme.toLowerCase() === theme.name.toLowerCase();
                    return (
                      <button
                        key={theme.name}
                        type="button"
                        onClick={() => handleAccentChange(theme.name)}
                        className={`flex items-center gap-2 rounded border p-2.5 text-left transition ${
                          isSelected
                            ? "border-primary bg-primary/10 text-on-surface font-semibold"
                            : "border-outline/20 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                        }`}
                      >
                        <div className={`h-3.5 w-3.5 rounded-full bg-gradient-to-br ${theme.class}`} />
                        <span className="text-xs">{theme.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-label-sm text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                  Interface Layout Density
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleDensityChange("comfortable")}
                    className={`rounded border p-3 text-left transition ${
                      density === "comfortable"
                        ? "border-primary bg-primary/10 text-on-surface font-semibold"
                        : "border-outline/20 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                    }`}
                  >
                    <p className="text-xs font-semibold text-on-surface">Comfortable</p>
                    <p className="mt-0.5 text-[11px] text-on-surface-variant font-body-sm">Generous padding and card spacing</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDensityChange("compact")}
                    className={`rounded border p-3 text-left transition ${
                      density === "compact"
                        ? "border-primary bg-primary/10 text-on-surface font-semibold"
                        : "border-outline/20 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                    }`}
                  >
                    <p className="text-xs font-semibold text-on-surface">Compact</p>
                    <p className="mt-0.5 text-[11px] text-on-surface-variant font-body-sm">High information density for larger screens</p>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded border border-outline/20 bg-surface-container-low p-4 sm:p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-on-surface">Notification Preferences</h3>
              <p className="text-xs text-on-surface-variant font-body-sm mt-0.5">
                Choose how and when you receive workspace updates (saved to local preferences).
              </p>
            </div>

            <div className="space-y-3 max-w-xl">
              <label className="flex items-center justify-between p-3 rounded border border-outline/10 bg-surface-container-lowest cursor-pointer">
                <div>
                  <p className="text-xs font-medium text-on-surface">Email Notifications</p>
                  <p className="text-[11px] text-on-surface-variant font-body-sm">Receive email alerts for important workspace events</p>
                </div>
                <input
                  type="checkbox"
                  data-testid="email-alerts-toggle"
                  checked={emailAlerts}
                  onChange={(e) => handleToggleNotification("email", e.target.checked)}
                  className="h-4 w-4 rounded border-outline/30 bg-surface-container accent-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded border border-outline/10 bg-surface-container-lowest cursor-pointer">
                <div>
                  <p className="text-xs font-medium text-on-surface">Task Assignment Alerts</p>
                  <p className="text-[11px] text-on-surface-variant font-body-sm">Notify when someone assigns or mentions you in a task</p>
                </div>
                <input
                  type="checkbox"
                  data-testid="task-alerts-toggle"
                  checked={taskAlerts}
                  onChange={(e) => handleToggleNotification("task", e.target.checked)}
                  className="h-4 w-4 rounded border-outline/30 bg-surface-container accent-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded border border-outline/10 bg-surface-container-lowest cursor-pointer">
                <div>
                  <p className="text-xs font-medium text-on-surface">Weekly Performance Digest</p>
                  <p className="text-[11px] text-on-surface-variant font-body-sm">Summary of project completion rates sent every Monday</p>
                </div>
                <input
                  type="checkbox"
                  data-testid="weekly-digest-toggle"
                  checked={weeklyDigest}
                  onChange={(e) => handleToggleNotification("digest", e.target.checked)}
                  className="h-4 w-4 rounded border-outline/30 bg-surface-container accent-primary"
                />
              </label>
            </div>
          </section>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODALS */}
      {/* ------------------------------------------------------------- */}

      {/* 1. Account Deletion Modal */}
      {showDeleteAccountModal && (
        <div
          data-testid="settings-delete-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded border border-error/30 bg-surface-container-low p-5 shadow-2xl">
            <div className="flex items-center gap-2.5 text-error">
              <div className="flex h-9 w-9 items-center justify-center rounded bg-error/15">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-on-surface">Delete Account</h3>
            </div>
            <p className="mt-3 text-xs text-on-surface-variant font-body-sm leading-relaxed">
              Are you sure you want to delete your account? All your workspace memberships and data will be permanently removed.
            </p>

            {deleteAccountError && (
              <div className="mt-3 rounded border border-error/30 bg-error/10 p-2.5 text-xs text-error font-body-sm">
                {deleteAccountError}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(false)}
                disabled={isDeletingAccount}
                className="rounded px-3 py-1.5 text-xs font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-delete-account-button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="rounded bg-error px-3.5 py-1.5 text-xs font-semibold text-on-error shadow transition hover:bg-error/90 disabled:opacity-50"
              >
                {isDeletingAccount ? "Deleting..." : "Yes, Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Workspace Deletion Modal */}
      {showDeleteWorkspaceModal && (
        <div
          data-testid="delete-workspace-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded border border-error/30 bg-surface-container-low p-5 shadow-2xl">
            <div className="flex items-center gap-2.5 text-error">
              <div className="flex h-9 w-9 items-center justify-center rounded bg-error/15">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-on-surface">Delete Workspace</h3>
            </div>
            <p className="mt-3 text-xs text-on-surface-variant font-body-sm leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-on-surface">{workspace?.name}</strong>? All projects, tasks, and member access will be permanently destroyed.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteWorkspaceModal(false)}
                disabled={isDeletingWorkspace}
                className="rounded px-3 py-1.5 text-xs font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-delete-workspace-button"
                onClick={handleDeleteWorkspace}
                disabled={isDeletingWorkspace}
                className="rounded bg-error px-3.5 py-1.5 text-xs font-semibold text-on-error shadow transition hover:bg-error/90 disabled:opacity-50"
              >
                {isDeletingWorkspace ? "Deleting..." : "Yes, Delete Workspace"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Leave Workspace Modal */}
      {showLeaveWorkspaceModal && (
        <div
          data-testid="leave-workspace-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded border border-tertiary/30 bg-surface-container-low p-5 shadow-2xl">
            <div className="flex items-center gap-2.5 text-tertiary">
              <div className="flex h-9 w-9 items-center justify-center rounded bg-tertiary/15">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-on-surface">Leave Workspace</h3>
            </div>
            <p className="mt-3 text-xs text-on-surface-variant font-body-sm leading-relaxed">
              Are you sure you want to leave <strong className="text-on-surface">{workspace?.name}</strong>? You will need an invitation to regain access.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowLeaveWorkspaceModal(false)}
                disabled={isLeavingWorkspace}
                className="rounded px-3 py-1.5 text-xs font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-leave-workspace-button"
                onClick={handleLeaveWorkspace}
                disabled={isLeavingWorkspace}
                className="rounded bg-tertiary px-3.5 py-1.5 text-xs font-semibold text-on-tertiary shadow transition hover:bg-tertiary/90 disabled:opacity-50"
              >
                {isLeavingWorkspace ? "Leaving..." : "Leave Workspace"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Remove Member Confirmation Modal */}
      {memberToRemove && (
        <div
          data-testid="confirm-remove-member-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded border border-error/30 bg-surface-container-low p-5 shadow-2xl">
            <div className="flex items-center gap-2.5 text-error">
              <div className="flex h-9 w-9 items-center justify-center rounded bg-error/15">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-on-surface">Remove Member</h3>
            </div>
            <p className="mt-3 text-xs text-on-surface-variant font-body-sm leading-relaxed">
              Are you sure you want to remove <strong className="text-on-surface">{memberToRemove.user.name}</strong> from this workspace?
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                disabled={isPending}
                className="rounded px-3 py-1.5 text-xs font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-remove-member-btn"
                onClick={handleRemoveMember}
                disabled={isPending}
                className="rounded bg-error px-3.5 py-1.5 text-xs font-semibold text-on-error shadow transition hover:bg-error/90 disabled:opacity-50"
              >
                {isPending ? "Removing..." : "Remove Member"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Transfer Workspace Ownership Modal */}
      {memberToTransfer && (
        <div
          data-testid="transfer-ownership-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded border border-tertiary/30 bg-surface-container-low p-5 shadow-2xl">
            <div className="flex items-center gap-2.5 text-tertiary">
              <div className="flex h-9 w-9 items-center justify-center rounded bg-tertiary/15">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-on-surface">Transfer Ownership</h3>
            </div>
            <p className="mt-3 text-xs text-on-surface-variant font-body-sm leading-relaxed">
              Are you sure you want to transfer ownership of <strong className="text-on-surface">{workspace?.name}</strong> to <strong className="text-on-surface">{memberToTransfer.user.name}</strong>?
            </p>
            <p className="mt-1.5 text-[11px] text-tertiary font-body-sm">
              You will remain an Admin of the workspace, but <strong className="text-on-surface">{memberToTransfer.user.name}</strong> will become the primary Owner.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMemberToTransfer(null)}
                disabled={isTransferringOwnership}
                className="rounded px-3 py-1.5 text-xs font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-transfer-ownership-btn"
                onClick={handleTransferOwnership}
                disabled={isTransferringOwnership}
                className="rounded bg-tertiary px-3.5 py-1.5 text-xs font-semibold text-on-tertiary shadow transition hover:bg-tertiary/90 disabled:opacity-50"
              >
                {isTransferringOwnership ? "Transferring..." : "Yes, Transfer Ownership"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
