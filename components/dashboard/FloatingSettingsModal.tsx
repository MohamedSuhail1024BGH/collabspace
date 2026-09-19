"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { DbUser } from "@/lib/db/schema";
import {
  updateUserProfileAction,
  changePasswordAction,
  deleteAccountAction,
} from "@/app/actions";
import { UserAvatar } from "@/components/ui/UserAvatar";

type FloatingSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  user?: Omit<DbUser, "passwordHash"> | null;
};

const COLOR_THEMES = [
  { name: "Violet", class: "from-violet-500 to-indigo-600", border: "border-violet-500" },
  { name: "Cyan", class: "from-cyan-500 to-blue-600", border: "border-cyan-500" },
  { name: "Emerald", class: "from-emerald-500 to-teal-600", border: "border-emerald-500" },
  { name: "Amber", class: "from-amber-500 to-orange-600", border: "border-amber-500" },
  { name: "Rose", class: "from-rose-500 to-pink-600", border: "border-rose-500" },
];

export function FloatingSettingsModal({
  isOpen,
  onClose,
  user,
}: FloatingSettingsModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "ui" | "danger">("profile");

  // User Profile Form State
  const [userName, setUserName] = useState(user?.name ?? "");
  const [userUsername, setUserUsername] = useState(user?.username ?? "");
  const [userBio, setUserBio] = useState(user?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar ?? "");

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // UI Preferences State
  const [accentTheme, setAccentTheme] = useState("Violet");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [taskAlerts, setTaskAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  // Account Deletion State
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  // Status & Feedback Banner
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Ensure client-side portal mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync user state on props change
  useEffect(() => {
    if (user) {
      setUserName(user.name);
      setUserUsername(user.username ?? "");
      setUserBio(user.bio ?? "");
      setAvatarUrl(user.avatar ?? "");
    }
  }, [user]);

  // Load preferences from localStorage
  useEffect(() => {
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
      // Ignore in SSR
    }
  }, []);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
    setFeedback({ type: "success", message: `Layout density set to ${newDensity.charAt(0).toUpperCase() + newDensity.slice(1)}.` });
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

  // Image Upload Handler
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
        setAvatarUrl(reader.result);
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
        avatar: avatarUrl,
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

  // Delete Account Handler
  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setDeleteAccountError(null);
    const res = await deleteAccountAction();
    setIsDeletingAccount(false);

    if (res.success) {
      onClose();
      router.push("/login?deleted=true");
      router.refresh();
    } else {
      setDeleteAccountError(res.error || "Failed to delete account.");
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      data-testid="floating-settings-overlay"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        data-testid="floating-settings-modal"
        className="w-full max-w-2xl bg-surface-container-high border border-outline/20 rounded-xl shadow-2xl p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-outline/10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-on-surface font-headline-sm">
                Account Settings & System Preferences
              </h2>
              <span className="font-mono text-[9px] text-secondary bg-surface-container-lowest px-1.5 py-0.5 rounded border border-outline/10">
                GENERAL
              </span>
            </div>
            <p className="text-xs text-on-surface-variant font-body-sm mt-0.5">
              Personal credentials, custom profile photo, dynamic theme, and system alerts.
            </p>
          </div>
          <button
            type="button"
            data-testid="close-settings-modal-btn"
            onClick={onClose}
            className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded transition-colors"
            title="Close modal"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`p-3 rounded text-xs border flex items-center justify-between font-body-sm animate-in fade-in duration-150 ${
              feedback.type === "success"
                ? "bg-secondary/10 border-secondary/30 text-secondary"
                : "bg-error/10 border-error/30 text-error"
            }`}
          >
            <span>{feedback.message}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-on-surface-variant hover:text-on-surface ml-2"
            >
              &times;
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 border-b border-outline/10 pb-2 overflow-x-auto text-xs">
          <button
            type="button"
            data-testid="settings-profile-tab"
            onClick={() => {
              setActiveTab("profile");
              setFeedback(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition shrink-0 ${
              activeTab === "profile"
                ? "bg-surface-container-highest text-on-surface font-semibold shadow-xs border border-outline/20"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Profile</span>
          </button>

          <button
            type="button"
            data-testid="settings-security-tab"
            onClick={() => {
              setActiveTab("security");
              setFeedback(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition shrink-0 ${
              activeTab === "security"
                ? "bg-surface-container-highest text-on-surface font-semibold shadow-xs border border-outline/20"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Security</span>
          </button>

          <button
            type="button"
            data-testid="settings-ui-tab"
            onClick={() => {
              setActiveTab("ui");
              setFeedback(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition shrink-0 ${
              activeTab === "ui"
                ? "bg-surface-container-highest text-on-surface font-semibold shadow-xs border border-outline/20"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <span>Appearance & UI</span>
          </button>

          <button
            type="button"
            data-testid="settings-danger-tab"
            onClick={() => {
              setActiveTab("danger");
              setFeedback(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition shrink-0 ${
              activeTab === "danger"
                ? "bg-error/10 text-error font-semibold border border-error/30"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Account</span>
          </button>
        </div>

        {/* Tab 1: Profile */}
        {activeTab === "profile" && (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Custom Profile Picture Section */}
            <div>
              <label className="mb-2 block text-xs font-mono text-on-surface-variant uppercase">
                Profile Picture
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 rounded-lg bg-surface-container-lowest border border-outline/20">
                <div className="relative shrink-0">
                  <UserAvatar avatar={avatarUrl} name={userName} size="xl" />
                </div>

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

                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl("")}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-surface-container text-xs font-mono text-error hover:bg-error/10 border border-outline/20 transition-colors"
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
                      value={avatarUrl.startsWith("data:image/") ? "" : avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder={avatarUrl.startsWith("data:image/") ? "Custom uploaded image active" : "Or enter remote image URL (https://...)"}
                      className="w-full rounded border border-outline/20 bg-surface-container px-2.5 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none font-mono"
                    />
                  </div>

                  <p className="text-[10px] text-on-surface-variant font-mono">
                    JPEG, PNG, WebP or SVG under 2MB. If no image is provided, your initials or User icon will be shown as default.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-mono text-on-surface-variant uppercase">
                Display Name
              </label>
              <input
                type="text"
                data-testid="user-name-input"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full rounded border border-outline/20 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-mono text-on-surface-variant uppercase">
                Username Handle
              </label>
              <div className="flex items-center rounded border border-outline/20 bg-surface-container-lowest overflow-hidden">
                <span className="px-3 py-2 text-xs font-mono text-on-surface-variant bg-surface-container border-r border-outline/20">
                  @
                </span>
                <input
                  type="text"
                  data-testid="user-username-input"
                  value={userUsername}
                  onChange={(e) => setUserUsername(e.target.value)}
                  placeholder="username"
                  className="w-full px-3 py-2 text-xs text-on-surface bg-transparent focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-mono text-on-surface-variant uppercase">
                Bio / Status
              </label>
              <textarea
                rows={2}
                data-testid="user-bio-input"
                value={userBio}
                onChange={(e) => setUserBio(e.target.value)}
                placeholder="Share your expertise, role, or focus..."
                className="w-full rounded border border-outline/20 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none"
              />
            </div>

            <div className="pt-3 border-t border-outline/10 flex justify-end">
              <button
                type="submit"
                data-testid="save-profile-button"
                disabled={isPending}
                className="px-4 py-2 bg-primary text-on-primary font-medium text-xs rounded hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Security */}
        {activeTab === "security" && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordFeedback && (
              <div
                data-testid="password-feedback-banner"
                className={`p-2.5 rounded text-xs border ${
                  passwordFeedback.type === "success"
                    ? "bg-secondary/10 border-secondary/30 text-secondary"
                    : "bg-error/10 border-error/30 text-error"
                }`}
              >
                {passwordFeedback.message}
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-mono text-on-surface-variant uppercase">
                Current Password
              </label>
              <input
                type="password"
                data-testid="current-password-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded border border-outline/20 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none font-mono"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-mono text-on-surface-variant uppercase">
                New Password
              </label>
              <input
                type="password"
                data-testid="new-password-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded border border-outline/20 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none font-mono"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-mono text-on-surface-variant uppercase">
                Confirm New Password
              </label>
              <input
                type="password"
                data-testid="confirm-password-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full rounded border border-outline/20 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none font-mono"
                required
              />
            </div>

            <div className="pt-3 border-t border-outline/10 flex justify-end">
              <button
                type="submit"
                data-testid="change-password-button"
                disabled={isChangingPassword}
                className="px-4 py-2 bg-primary text-on-primary font-medium text-xs rounded hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isChangingPassword ? "Updating..." : "Change Password"}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Appearance & UI */}
        {activeTab === "ui" && (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-mono text-on-surface-variant uppercase">
                Accent Theme
              </label>
              <div className="grid grid-cols-5 gap-2">
                {COLOR_THEMES.map((th) => (
                  <button
                    key={th.name}
                    type="button"
                    onClick={() => handleAccentChange(th.name)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded border text-xs transition ${
                      accentTheme.toLowerCase() === th.name.toLowerCase()
                        ? "bg-surface-container border-primary shadow-xs"
                        : "bg-surface-container-lowest border-outline/20 hover:bg-surface-container"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-gradient-to-tr ${th.class}`} />
                    <span className="text-[11px] font-mono text-on-surface">{th.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-mono text-on-surface-variant uppercase">
                Layout Density
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDensityChange("comfortable")}
                  className={`p-2.5 rounded border text-left text-xs transition ${
                    density === "comfortable"
                      ? "bg-surface-container border-primary"
                      : "bg-surface-container-lowest border-outline/20 hover:bg-surface-container"
                  }`}
                >
                  <p className="font-medium text-on-surface">Comfortable</p>
                  <p className="text-[10px] text-on-surface-variant">Default spacing with generous breathing room.</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleDensityChange("compact")}
                  className={`p-2.5 rounded border text-left text-xs transition ${
                    density === "compact"
                      ? "bg-surface-container border-primary"
                      : "bg-surface-container-lowest border-outline/20 hover:bg-surface-container"
                  }`}
                >
                  <p className="font-medium text-on-surface">Compact</p>
                  <p className="text-[10px] text-on-surface-variant">High-density layout optimized for large monitors.</p>
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-outline/10 space-y-2.5">
              <label className="block text-xs font-mono text-on-surface-variant uppercase">
                Notification Preferences
              </label>
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface font-body-sm">Email alerts on critical activity</span>
                <input
                  type="checkbox"
                  data-testid="email-alerts-toggle"
                  checked={emailAlerts}
                  onChange={(e) => handleToggleNotification("email", e.target.checked)}
                  className="rounded border-outline/20 bg-surface-container-lowest text-primary focus:ring-0 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface font-body-sm">Task assignment notifications</span>
                <input
                  type="checkbox"
                  data-testid="task-alerts-toggle"
                  checked={taskAlerts}
                  onChange={(e) => handleToggleNotification("task", e.target.checked)}
                  className="rounded border-outline/20 bg-surface-container-lowest text-primary focus:ring-0 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface font-body-sm">Weekly team performance digest</span>
                <input
                  type="checkbox"
                  data-testid="digest-alerts-toggle"
                  checked={weeklyDigest}
                  onChange={(e) => handleToggleNotification("digest", e.target.checked)}
                  className="rounded border-outline/20 bg-surface-container-lowest text-primary focus:ring-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Account Danger Zone */}
        {activeTab === "danger" && (
          <div className="p-4 rounded-lg bg-error/5 border border-error/20 space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-error font-headline-sm">Delete User Account</h3>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Permanently deletes your personal user identity, logins, and session data.
              </p>
            </div>
            {deleteAccountError && (
              <p className="text-xs text-error font-mono">{deleteAccountError}</p>
            )}
            <button
              type="button"
              data-testid="settings-delete-account-button"
              onClick={() => setShowDeleteAccountModal(true)}
              className="px-3 py-1.5 bg-error/10 hover:bg-error/20 border border-error/30 text-error rounded text-xs font-medium transition"
            >
              Delete My Account
            </button>
          </div>
        )}

        {/* Delete Account Modal Confirmation */}
        {showDeleteAccountModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4">
            <div
              data-testid="delete-account-modal"
              className="w-full max-w-sm rounded-xl bg-surface-container-high border border-outline/20 p-5 shadow-2xl space-y-3"
            >
              <h4 className="text-sm font-bold text-error font-headline-sm">Are you absolutely sure?</h4>
              <p className="text-xs text-on-surface-variant">
                This will permanently delete your account. This action cannot be reversed.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteAccountModal(false)}
                  className="px-3 py-1.5 rounded border border-outline/20 bg-surface-container text-xs text-on-surface-variant hover:text-on-surface transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="confirm-delete-account-button"
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                  className="px-3 py-1.5 rounded bg-error text-on-error text-xs font-medium hover:bg-error/90 transition disabled:opacity-50"
                >
                  {isDeletingAccount ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
