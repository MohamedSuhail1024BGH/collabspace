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
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Shield,
  Palette,
  AlertTriangle,
  X,
  Upload,
  Trash2,
  Laptop,
  Moon,
  Sun,
} from "lucide-react";

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
  const [appTheme, setAppTheme] = useState<"system" | "dark" | "light">("system");
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
        // Fallback gracefully
      }
    });
  }, []);

  // Sync system theme changes dynamically
  useEffect(() => {
    if (appTheme !== "system") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const handleChange = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute("data-theme", e.matches ? "light" : "dark");
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [appTheme]);

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

  // Preferences Change Handlers
  const handleAppThemeChange = (mode: "system" | "dark" | "light") => {
    setAppTheme(mode);
    try {
      localStorage.setItem("collabspace_theme_mode", mode);
      let resolved = mode;
      if (mode === "system") {
        resolved = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      }
      document.documentElement.setAttribute("data-theme", resolved);
      window.dispatchEvent(new Event("collabspace_preferences_changed"));
      window.dispatchEvent(new Event("collabspace_theme_changed"));
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

  // Profile Picture Upload Handler
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

  // Profile Save Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const res = await updateUserProfileAction({
        name: userName,
        username: userUsername || undefined,
        bio: userBio || undefined,
        avatar: avatarUrl || undefined,
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <Card
        data-testid="floating-settings-modal"
        className="w-full max-w-2xl shadow-2xl p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto border-border/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                Account Settings & System Preferences
              </h2>
              <Badge variant="outline" className="text-[9px] font-mono bg-muted/30">
                GENERAL
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Personal credentials, custom profile photo, dynamic theme, and system alerts.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            data-testid="close-settings-modal-btn"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Close modal"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            data-testid="settings-feedback-banner"
            className={`p-3 rounded-lg text-xs border flex items-center justify-between ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}
          >
            <span>{feedback.message}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-muted-foreground hover:text-foreground ml-2 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 border-b border-border/60 pb-2 overflow-x-auto text-xs">
          <button
            type="button"
            data-testid="settings-profile-tab"
            onClick={() => {
              setActiveTab("profile");
              setFeedback(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition shrink-0 cursor-pointer ${
              activeTab === "profile"
                ? "bg-accent text-accent-foreground font-semibold shadow-xs border border-border"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            <User className="size-3.5" />
            <span>Profile</span>
          </button>

          <button
            type="button"
            data-testid="settings-security-tab"
            onClick={() => {
              setActiveTab("security");
              setFeedback(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition shrink-0 cursor-pointer ${
              activeTab === "security"
                ? "bg-accent text-accent-foreground font-semibold shadow-xs border border-border"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            <Shield className="size-3.5" />
            <span>Security</span>
          </button>

          <button
            type="button"
            data-testid="settings-ui-tab"
            onClick={() => {
              setActiveTab("ui");
              setFeedback(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition shrink-0 cursor-pointer ${
              activeTab === "ui"
                ? "bg-accent text-accent-foreground font-semibold shadow-xs border border-border"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            <Palette className="size-3.5" />
            <span>Appearance & UI</span>
          </button>

          <button
            type="button"
            data-testid="settings-danger-tab"
            onClick={() => {
              setActiveTab("danger");
              setFeedback(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition shrink-0 cursor-pointer ${
              activeTab === "danger"
                ? "bg-destructive/10 text-destructive font-semibold border border-destructive/30"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            <AlertTriangle className="size-3.5" />
            <span>Account</span>
          </button>
        </div>

        {/* Tab 1: Profile */}
        {activeTab === "profile" && (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Custom Profile Picture Section */}
            <div>
              <label className="mb-2 block text-xs font-mono text-muted-foreground uppercase">
                Profile Picture
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 rounded-lg bg-muted/20 border border-border/50">
                <div className="relative shrink-0">
                  <UserAvatar avatar={avatarUrl} name={userName} size="xl" />
                </div>

                <div className="flex-1 space-y-2 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card hover:bg-accent border border-border text-xs font-mono text-foreground transition-colors shadow-xs">
                      <Upload className="size-3.5 text-primary" />
                      <span>Upload Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    {avatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAvatarUrl("")}
                        className="h-7 px-2 text-xs font-mono text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="size-3 mr-1" />
                        <span>Remove Photo</span>
                      </Button>
                    )}
                  </div>

                  <div>
                    <Input
                      type="text"
                      value={avatarUrl.startsWith("data:image/") ? "" : avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder={avatarUrl.startsWith("data:image/") ? "Custom uploaded image active" : "Or enter remote image URL (https://...)"}
                      className="text-xs font-mono"
                    />
                  </div>

                  <p className="text-[10px] text-muted-foreground font-mono">
                    JPEG, PNG, WebP or SVG under 2MB. If no image is provided, your initials or User icon will be shown as default.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-mono text-muted-foreground uppercase">
                Display Name
              </label>
              <Input
                type="text"
                data-testid="user-name-input"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-mono text-muted-foreground uppercase">
                Username Handle
              </label>
              <div className="flex items-center rounded-md border border-input bg-background overflow-hidden">
                <span className="px-3 py-2 text-xs font-mono text-muted-foreground bg-muted border-r border-border">
                  @
                </span>
                <input
                  type="text"
                  data-testid="user-username-input"
                  value={userUsername}
                  onChange={(e) => setUserUsername(e.target.value)}
                  placeholder="username"
                  className="w-full px-3 py-2 text-xs text-foreground bg-transparent focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-mono text-muted-foreground uppercase">
                Bio / Status
              </label>
              <Textarea
                rows={2}
                data-testid="user-bio-input"
                value={userBio}
                onChange={(e) => setUserBio(e.target.value)}
                placeholder="Share your expertise, role, or focus..."
                className="text-xs resize-none"
              />
            </div>

            <div className="pt-3 border-t border-border/50 flex justify-end">
              <Button
                type="submit"
                data-testid="save-profile-button"
                disabled={isPending}
                size="sm"
                className="h-9 text-xs font-semibold cursor-pointer"
              >
                {isPending ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        )}

        {/* Tab 2: Security */}
        {activeTab === "security" && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordFeedback && (
              <div
                data-testid="password-feedback-banner"
                className={`p-2.5 rounded-lg text-xs border ${
                  passwordFeedback.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-destructive/10 border-destructive/30 text-destructive"
                }`}
              >
                {passwordFeedback.message}
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-mono text-muted-foreground uppercase">
                Current Password
              </label>
              <Input
                type="password"
                data-testid="current-password-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-mono text-muted-foreground uppercase">
                New Password
              </label>
              <Input
                type="password"
                data-testid="new-password-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-mono text-muted-foreground uppercase">
                Confirm New Password
              </label>
              <Input
                type="password"
                data-testid="confirm-password-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="text-xs font-mono"
                required
              />
            </div>

            <div className="pt-3 border-t border-border/50 flex justify-end">
              <Button
                type="submit"
                data-testid="change-password-button"
                disabled={isChangingPassword}
                size="sm"
                className="h-9 text-xs font-semibold cursor-pointer"
              >
                {isChangingPassword ? "Updating..." : "Change Password"}
              </Button>
            </div>
          </form>
        )}

        {/* Tab 3: Appearance & UI */}
        {activeTab === "ui" && (
          <div className="space-y-4">
            {/* Application Theme */}
            <div>
              <label className="mb-2 block text-xs font-mono text-muted-foreground uppercase">
                Application Theme
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  data-testid="app-theme-system-btn"
                  onClick={() => handleAppThemeChange("system")}
                  className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs transition cursor-pointer ${
                    appTheme === "system"
                      ? "bg-accent border-primary text-foreground font-semibold shadow-xs"
                      : "bg-background border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  <Laptop className="size-3.5 shrink-0" />
                  <span className="truncate font-mono text-[11px]">System</span>
                </button>

                <button
                  type="button"
                  data-testid="app-theme-dark-btn"
                  onClick={() => handleAppThemeChange("dark")}
                  className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs transition cursor-pointer ${
                    appTheme === "dark"
                      ? "bg-accent border-primary text-foreground font-semibold shadow-xs"
                      : "bg-background border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  <Moon className="size-3.5 shrink-0" />
                  <span className="truncate font-mono text-[11px]">Dark</span>
                </button>

                <button
                  type="button"
                  data-testid="app-theme-light-btn"
                  onClick={() => handleAppThemeChange("light")}
                  className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs transition cursor-pointer ${
                    appTheme === "light"
                      ? "bg-accent border-primary text-foreground font-semibold shadow-xs"
                      : "bg-background border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  <Sun className="size-3.5 shrink-0" />
                  <span className="truncate font-mono text-[11px]">Light</span>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-mono text-muted-foreground uppercase">
                Accent Theme
              </label>
              <div className="grid grid-cols-5 gap-2">
                {COLOR_THEMES.map((th) => (
                  <button
                    key={th.name}
                    type="button"
                    onClick={() => handleAccentChange(th.name)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border text-xs transition cursor-pointer ${
                      accentTheme.toLowerCase() === th.name.toLowerCase()
                        ? "bg-accent border-primary shadow-xs ring-1 ring-primary/40"
                        : "bg-background border-border hover:bg-accent/50"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-gradient-to-tr ${th.class}`} />
                    <span className="text-[11px] font-mono text-foreground">{th.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-mono text-muted-foreground uppercase">
                Layout Density
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDensityChange("comfortable")}
                  className={`p-2.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                    density === "comfortable"
                      ? "bg-accent border-primary ring-1 ring-primary/40"
                      : "bg-background border-border hover:bg-accent/50"
                  }`}
                >
                  <p className="font-semibold text-foreground">Comfortable</p>
                  <p className="text-[10px] text-muted-foreground">Default spacing with generous breathing room.</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleDensityChange("compact")}
                  className={`p-2.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                    density === "compact"
                      ? "bg-accent border-primary ring-1 ring-primary/40"
                      : "bg-background border-border hover:bg-accent/50"
                  }`}
                >
                  <p className="font-semibold text-foreground">Compact</p>
                  <p className="text-[10px] text-muted-foreground">High-density layout optimized for large monitors.</p>
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50 space-y-2.5">
              <label className="block text-xs font-mono text-muted-foreground uppercase">
                Notification Preferences
              </label>
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground">Email alerts on critical activity</span>
                <input
                  type="checkbox"
                  data-testid="email-alerts-toggle"
                  checked={emailAlerts}
                  onChange={(e) => handleToggleNotification("email", e.target.checked)}
                  className="rounded border-input text-primary focus:ring-0 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground">Task assignment notifications</span>
                <input
                  type="checkbox"
                  data-testid="task-alerts-toggle"
                  checked={taskAlerts}
                  onChange={(e) => handleToggleNotification("task", e.target.checked)}
                  className="rounded border-input text-primary focus:ring-0 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground">Weekly team performance digest</span>
                <input
                  type="checkbox"
                  data-testid="weekly-digest-toggle"
                  checked={weeklyDigest}
                  onChange={(e) => handleToggleNotification("digest", e.target.checked)}
                  className="rounded border-input text-primary focus:ring-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Account Danger Zone */}
        {activeTab === "danger" && (
          <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-destructive">Delete User Account</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Permanently deletes your personal user identity, logins, and session data.
              </p>
            </div>
            {deleteAccountError && (
              <p className="text-xs text-destructive font-mono">{deleteAccountError}</p>
            )}
            <Button
              variant="outline"
              size="sm"
              data-testid="settings-delete-account-button"
              onClick={() => setShowDeleteAccountModal(true)}
              className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer"
            >
              Delete My Account
            </Button>
          </div>
        )}

        {/* Delete Account Modal Confirmation */}
        {showDeleteAccountModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4">
            <Card
              data-testid="delete-account-modal"
              className="w-full max-w-sm p-5 shadow-2xl space-y-3 border-destructive/40"
            >
              <h4 className="text-sm font-bold text-destructive">Are you absolutely sure?</h4>
              <p className="text-xs text-muted-foreground">
                This will permanently delete your account. This action cannot be reversed.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteAccountModal(false)}
                  className="h-8 text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  data-testid="confirm-delete-account-button"
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                  className="h-8 text-xs font-semibold cursor-pointer"
                >
                  {isDeletingAccount ? "Deleting..." : "Confirm Delete"}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </Card>
    </div>,
    document.body
  );
}
