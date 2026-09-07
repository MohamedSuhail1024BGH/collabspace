"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DbWorkspace, DbUser } from "@/lib/db/schema";
import {
  updateWorkspaceAction,
  updateUserProfileAction,
  deleteAccountAction,
} from "@/app/actions";

type SettingsClientProps = {
  user: Omit<DbUser, "passwordHash">;
  workspace: DbWorkspace | null;
};

const COLOR_THEMES = [
  { name: "Violet", class: "from-violet-500 to-indigo-600", border: "border-violet-500" },
  { name: "Cyan", class: "from-cyan-500 to-blue-600", border: "border-cyan-500" },
  { name: "Emerald", class: "from-emerald-500 to-teal-600", border: "border-emerald-500" },
  { name: "Amber", class: "from-amber-500 to-orange-600", border: "border-amber-500" },
  { name: "Rose", class: "from-rose-500 to-pink-600", border: "border-rose-500" },
];

export function SettingsClient({ user, workspace }: SettingsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"workspace" | "account" | "ui">("workspace");

  // Workspace Form State
  const [workspaceName, setWorkspaceName] = useState(workspace?.name ?? "");
  const [plan, setPlan] = useState(workspace?.plan ?? "Pro");

  // User Profile Form State
  const [userName, setUserName] = useState(user.name);
  const [avatarColor, setAvatarColor] = useState(user.avatar ?? "from-violet-500 to-cyan-400");

  // UI Preferences State
  const [accentTheme, setAccentTheme] = useState("Violet");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [taskAlerts, setTaskAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  // Status & Feedback
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Danger Zone Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSaveWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const res = await updateWorkspaceAction({
        name: workspaceName,
        plan,
      });

      if (res.success) {
        setFeedback({ type: "success", message: "Workspace settings updated successfully." });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update workspace." });
      }
    });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const res = await updateUserProfileAction({
        name: userName,
        avatar: avatarColor,
      });

      if (res.success) {
        setFeedback({ type: "success", message: "Account profile updated successfully." });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update profile." });
      }
    });
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    const res = await deleteAccountAction();
    if (res.success) {
      router.push("/login?deleted=true");
      router.refresh();
    } else {
      alert(res.error || "Failed to delete account");
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-white/10 pb-4 gap-2">
        <button
          type="button"
          data-testid="settings-workspace-tab"
          onClick={() => {
            setActiveTab("workspace");
            setFeedback(null);
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeTab === "workspace"
              ? "bg-violet-600 text-white shadow-lg shadow-violet-600/25"
              : "text-slate-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Workspace
        </button>

        <button
          type="button"
          data-testid="settings-account-tab"
          onClick={() => {
            setActiveTab("account");
            setFeedback(null);
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeTab === "account"
              ? "bg-violet-600 text-white shadow-lg shadow-violet-600/25"
              : "text-slate-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Account
        </button>

        <button
          type="button"
          data-testid="settings-ui-tab"
          onClick={() => {
            setActiveTab("ui");
            setFeedback(null);
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeTab === "ui"
              ? "bg-violet-600 text-white shadow-lg shadow-violet-600/25"
              : "text-slate-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          UI & Preferences
        </button>
      </div>

      {/* Global Status Banner */}
      {feedback && (
        <div
          data-testid="settings-feedback-banner"
          className={`flex items-center gap-2 rounded-2xl border p-4 text-sm ${
            feedback.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/20 bg-rose-500/10 text-rose-300"
          }`}
        >
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Workspace Settings */}
      {activeTab === "workspace" && (
        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/20">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white">Workspace Information</h3>
              <p className="text-sm text-slate-400">
                Manage your organization identity, plan tier, and team URL identifiers.
              </p>
            </div>

            <form onSubmit={handleSaveWorkspace} className="space-y-5 max-w-xl">
              <div>
                <label htmlFor="ws-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Workspace Name
                </label>
                <input
                  id="ws-name"
                  data-testid="workspace-name-input"
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="ws-slug" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Workspace Slug / Identifier
                </label>
                <div className="flex rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-400">
                  <span className="text-slate-500 mr-1">collabspace.app/</span>
                  <span className="font-mono text-white">{workspace?.slug ?? "workspace"}</span>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  Slugs are unique URLs reserved for your workspace.
                </p>
              </div>

              <div>
                <label htmlFor="ws-plan" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Subscription Plan
                </label>
                <select
                  id="ws-plan"
                  data-testid="workspace-plan-select"
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value="Free">Free Plan (Up to 5 members)</option>
                  <option value="Pro">Pro Plan (Unlimited members, advanced analytics)</option>
                  <option value="Enterprise">Enterprise (Dedicated support & custom SSO)</option>
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  data-testid="save-workspace-button"
                  disabled={isPending}
                  className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500 disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save Workspace"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/20">
            <h4 className="text-sm font-semibold text-white mb-2">Workspace Identifier</h4>
            <p className="text-xs text-slate-400 mb-3">
              Use this unique ID when integrating via API or sharing with developers.
            </p>
            <div className="inline-block rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 font-mono text-xs text-violet-300">
              {workspace?.id ?? "ws-default"}
            </div>
          </section>
        </div>
      )}

      {/* Account Settings */}
      {activeTab === "account" && (
        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/20">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white">Personal Profile</h3>
              <p className="text-sm text-slate-400">
                Update your account details and profile identity across CollabSpace.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5 max-w-xl">
              <div className="flex items-center gap-4">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarColor} text-lg font-bold text-white shadow-lg`}>
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{userName || "Your Name"}</p>
                  <p className="text-xs text-slate-400">{user.email}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Avatar Accent Style
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {COLOR_THEMES.map((theme) => (
                    <button
                      key={theme.name}
                      type="button"
                      onClick={() => setAvatarColor(theme.class)}
                      className={`h-8 w-8 rounded-xl bg-gradient-to-br ${theme.class} transition hover:scale-105 ${
                        avatarColor === theme.class ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900" : "opacity-80"
                      }`}
                      title={theme.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="user-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Full Display Name
                </label>
                <input
                  id="user-name"
                  data-testid="user-name-input"
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="user-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Email Address
                </label>
                <input
                  id="user-email"
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full rounded-xl border border-white/5 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed"
                />
                <p className="mt-1.5 text-xs text-slate-500">Email address cannot be changed directly.</p>
              </div>

              <div>
                <button
                  type="submit"
                  data-testid="save-profile-button"
                  disabled={isPending}
                  className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500 disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          </section>

          {/* Danger Zone */}
          <section className="rounded-3xl border border-rose-500/20 bg-rose-950/10 p-6 shadow-xl shadow-slate-950/20">
            <h3 className="text-lg font-semibold text-rose-400">Danger Zone</h3>
            <p className="mt-1 text-sm text-slate-400">
              Permanently remove your account and all associated workspace memberships. This action cannot be undone.
            </p>
            <div className="mt-4">
              <button
                type="button"
                data-testid="settings-delete-account-button"
                onClick={() => setShowDeleteModal(true)}
                className="rounded-xl border border-rose-500/30 bg-rose-500/20 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/30 hover:text-white"
              >
                Delete Account
              </button>
            </div>
          </section>
        </div>
      )}

      {/* UI & Preferences */}
      {activeTab === "ui" && (
        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/20">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white">Appearance & Theme</h3>
              <p className="text-sm text-slate-400">
                Personalize the visual accents and layout density of your CollabSpace workspace.
              </p>
            </div>

            <div className="space-y-6 max-w-xl">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Theme Accent Color
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {COLOR_THEMES.map((theme) => (
                    <button
                      key={theme.name}
                      type="button"
                      onClick={() => {
                        setAccentTheme(theme.name);
                        setFeedback({ type: "success", message: `Accent theme switched to ${theme.name}.` });
                      }}
                      className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition ${
                        accentTheme === theme.name
                          ? "border-violet-500 bg-violet-500/10 text-white"
                          : "border-white/10 bg-slate-950/50 text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      <div className={`h-4 w-4 rounded-full bg-gradient-to-br ${theme.class}`} />
                      <span className="text-sm font-medium">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Interface Layout Density
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDensity("comfortable");
                      setFeedback({ type: "success", message: "Layout density set to Comfortable." });
                    }}
                    className={`rounded-xl border p-3.5 text-left transition ${
                      density === "comfortable"
                        ? "border-violet-500 bg-violet-500/10 text-white"
                        : "border-white/10 bg-slate-950/50 text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <p className="text-sm font-semibold">Comfortable</p>
                    <p className="mt-1 text-xs text-slate-400">Generous padding and card spacing</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDensity("compact");
                      setFeedback({ type: "success", message: "Layout density set to Compact." });
                    }}
                    className={`rounded-xl border p-3.5 text-left transition ${
                      density === "compact"
                        ? "border-violet-500 bg-violet-500/10 text-white"
                        : "border-white/10 bg-slate-950/50 text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <p className="text-sm font-semibold">Compact</p>
                    <p className="mt-1 text-xs text-slate-400">High information density for larger screens</p>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/20">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white">Notification Preferences</h3>
              <p className="text-sm text-slate-400">
                Choose how and when you receive workspace updates.
              </p>
            </div>

            <div className="space-y-4 max-w-xl">
              <label className="flex items-center justify-between p-3 rounded-2xl border border-white/6 bg-slate-950/50 cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-white">Email Notifications</p>
                  <p className="text-xs text-slate-400">Receive email alerts for important workspace events</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-violet-600 focus:ring-violet-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl border border-white/6 bg-slate-950/50 cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-white">Task Assignment Alerts</p>
                  <p className="text-xs text-slate-400">Notify when someone assigns or mentions you in a task</p>
                </div>
                <input
                  type="checkbox"
                  checked={taskAlerts}
                  onChange={(e) => setTaskAlerts(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-violet-600 focus:ring-violet-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl border border-white/6 bg-slate-950/50 cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-white">Weekly Performance Digest</p>
                  <p className="text-xs text-slate-400">Summary of project completion rates sent every Monday</p>
                </div>
                <input
                  type="checkbox"
                  checked={weeklyDigest}
                  onChange={(e) => setWeeklyDigest(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-violet-600 focus:ring-violet-500"
                />
              </label>
            </div>
          </section>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          data-testid="settings-delete-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-3xl border border-rose-500/30 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Delete Account</h3>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              Are you sure you want to delete your account? All your workspace memberships and data will be permanently removed.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-delete-account-button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-600/30 transition hover:bg-rose-500 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

