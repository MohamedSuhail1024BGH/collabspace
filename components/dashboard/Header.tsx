"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DbUser } from "@/lib/db/schema";
import { logoutAction, deleteAccountAction } from "@/app/actions";

type HeaderProps = {
  title: string;
  user?: Omit<DbUser, "passwordHash"> | null;
};

export function Header({ title, user }: HeaderProps) {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleLogout = async () => {
    await logoutAction();
    router.push("/login");
    router.refresh();
  };

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    setIsDeleting(true);
    const res = await deleteAccountAction();
    if (res.success) {
      router.push("/login?deleted=true");
      router.refresh();
    } else {
      setDeleteError(res.error || "Failed to delete account");
      setIsDeleting(false);
    }
  };

  return (
    <>
      <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/20 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-400">Good morning</p>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {user && (
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/60 py-1.5 pl-2.5 pr-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br ${user.avatar || "from-violet-500 to-cyan-400"} text-xs font-bold text-white shadow`}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden text-left sm:block">
                <p className="max-w-[130px] truncate text-xs font-medium text-white">{user.name}</p>
                <p className="max-w-[130px] truncate text-[10px] text-slate-400">{user.email}</p>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                data-testid="header-logout-button"
                onClick={handleLogout}
                title="Log out"
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20 hover:text-rose-200"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Log out</span>
              </button>

              {/* Delete Account Button */}
              <button
                type="button"
                data-testid="header-delete-account-button"
                onClick={() => setShowDeleteModal(true)}
                title="Delete account"
                className="flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-950/40 p-1.5 text-xs text-rose-400 transition hover:bg-rose-900/60 hover:text-rose-200"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div
            data-testid="delete-account-modal"
            className="w-full max-w-md rounded-3xl border border-rose-500/30 bg-slate-900 p-6 shadow-2xl shadow-rose-950/50"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Delete Account</h3>
            <p className="mt-2 text-sm text-slate-300">
              Are you sure you want to permanently delete your account (
              <span className="font-semibold text-white">{user?.email}</span>)?
            </p>
            <p className="mt-1 text-xs text-rose-300">
              This action is irreversible. All your personal sessions, memberships, and sole workspace data will be permanently deleted.
            </p>

            {deleteError && (
              <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-delete-account-button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-rose-900/40 transition hover:bg-rose-500 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
