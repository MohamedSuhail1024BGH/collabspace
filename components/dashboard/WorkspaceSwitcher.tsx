"use client";

import { useState, useTransition, useRef, useEffect, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { switchWorkspaceAction, createWorkspaceAction } from "@/app/actions";
import type { DbWorkspace, DbUser } from "@/lib/db/schema";
import { FloatingSettingsModal } from "./FloatingSettingsModal";
import { UserAvatar } from "@/components/ui/UserAvatar";

type WorkspaceSwitcherProps = {
  activeWorkspace: DbWorkspace;
  workspaces: DbWorkspace[];
  user?: Omit<DbUser, "passwordHash"> | null;
  onLogout?: () => Promise<void>;
  onNavigate?: () => void;
};

function setActiveWorkspaceCookie(workspaceId: string) {
  if (typeof document !== "undefined") {
    document.cookie = `collabspace_active_workspace=${workspaceId}; path=/; max-age=31536000; SameSite=Lax`;
  }
}

export function WorkspaceSwitcher({
  activeWorkspace,
  workspaces,
  user,
  onLogout,
  onNavigate,
}: WorkspaceSwitcherProps) {
  const [currentWorkspace, setOptimisticWorkspace] = useOptimistic(
    activeWorkspace,
    (_state, newWs: DbWorkspace) => newWs
  );
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectWorkspace = (workspaceId: string) => {
    const next = workspaces.find((w) => w.id === workspaceId);
    if (!next || next.id === currentWorkspace.id) {
      setIsOpen(false);
      return;
    }

    setActiveWorkspaceCookie(workspaceId);

    startTransition(async () => {
      setOptimisticWorkspace(next);
      await switchWorkspaceAction(workspaceId);
      setIsOpen(false);
      router.refresh();
    });
  };

  const handleCreateWorkspace = () => {
    if (!newWorkspaceName.trim()) return;

    startTransition(async () => {
      const res = await createWorkspaceAction({
        name: newWorkspaceName.trim(),
        plan: "Pro",
      });
      if (res.id) {
        setActiveWorkspaceCookie(res.id);
      }
      setShowCreateModal(false);
      setNewWorkspaceName("");
      setIsOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="relative flex flex-col gap-1.5" ref={dropdownRef}>
      {/* Upward Expandable Options Menu */}
      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-50 rounded-lg bg-surface-container-high border border-outline/20 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150 select-none max-h-[60vh] overflow-y-auto">
          {/* Header */}
          <div className="px-2 py-1 text-[10px] font-mono font-medium uppercase tracking-wider text-on-surface-variant flex items-center justify-between">
            <span>Workspaces ({workspaces.length})</span>
            <span className="text-secondary">Active</span>
          </div>

          {/* Workspaces list */}
          <div className="mt-1 space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
            {workspaces.map((ws) => {
              const isActive = ws.id === currentWorkspace.id;
              return (
                <button
                  key={ws.id}
                  type="button"
                  data-testid={`workspace-option-${ws.slug}`}
                  onClick={() => handleSelectWorkspace(ws.id)}
                  className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors ${
                    isActive
                      ? "bg-surface-container-highest text-primary font-medium border border-primary/30"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden min-w-0">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-surface-container-lowest text-[10px] font-mono font-semibold text-on-surface">
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate min-w-0">
                      <p className="truncate text-xs font-medium text-on-surface">{ws.name}</p>
                      <p className="text-[9px] font-mono text-on-surface-variant">collabspace.app/{ws.slug}</p>
                    </div>
                  </div>

                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Additional bottom options shifted from top & settings */}
          <div className="mt-2 border-t border-outline/15 pt-1.5 space-y-0.5">
            <Link
              href="/start"
              onClick={() => {
                setIsOpen(false);
                onNavigate?.();
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors font-body-sm"
            >
              <svg className="h-3.5 w-3.5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span>Start Hub & Discovery</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setShowCreateModal(true);
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-secondary hover:bg-secondary/10 transition-colors font-body-sm"
            >
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create new workspace</span>
            </button>

            <button
              type="button"
              data-testid="sidebar-settings-button"
              onClick={() => {
                setIsOpen(false);
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

            {onLogout && (
              <button
                type="button"
                data-testid="logout-button"
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-error/90 hover:bg-error/10 hover:text-error transition-colors font-body-sm"
              >
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Log out</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Workspace Header Indicator */}
      <div className="px-1 flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
        <span className="truncate max-w-[150px] font-medium text-on-surface">
          {currentWorkspace.name}
        </span>
        <span className="text-[10px] text-secondary bg-surface-container-high px-1 py-0.2 rounded shrink-0">
          {currentWorkspace.plan || "Pro"}
        </span>
      </div>

      {/* Expandable Bottom Trigger Card */}
      <div className="p-1 rounded bg-surface-container-low hover:bg-surface-container border border-outline/10 transition-colors">
        <button
          type="button"
          data-testid="workspace-switcher-trigger"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isPending}
          className="flex w-full items-center justify-between gap-2.5 p-1.5 text-left overflow-hidden min-w-0 group focus:outline-none rounded hover:bg-surface-container-high/40 transition-colors"
        >
          <div className="flex items-center gap-2.5 overflow-hidden min-w-0 flex-1">
            {/* User Avatar */}
            <UserAvatar avatar={user?.avatar} name={user?.name} size="sm" showStatus />

            {/* User Profile Info Stack */}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-medium text-on-surface truncate group-hover:text-primary transition-colors block">
                {user?.name || "Member"}
              </span>
              <span className="text-[10px] font-mono text-on-surface-variant truncate block">
                {user?.email || "active"}
              </span>
            </div>
          </div>

          {/* Chevron / Unfold icon */}
          <svg
            className={`h-4 w-4 shrink-0 text-on-surface-variant group-hover:text-on-surface transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded bg-surface-container-high border border-outline/20 p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-on-surface font-headline-sm">Create New Workspace</h3>
            <p className="mt-1 text-xs text-on-surface-variant font-body-sm">
              Set up a collaborative workspace for your team or organization.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-mono text-on-surface-variant uppercase">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="e.g. Apex Innovations"
                  className="w-full rounded border border-outline/20 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none font-body-sm"
                  autoFocus
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded border border-outline/20 bg-surface-container px-3 py-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateWorkspace}
                disabled={!newWorkspaceName.trim() || isPending}
                className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors disabled:opacity-50"
              >
                {isPending ? "Creating..." : "Create Workspace"}
              </button>
            </div>
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
