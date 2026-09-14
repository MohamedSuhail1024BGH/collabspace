"use client";

import { useState, useTransition, useRef, useEffect, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { switchWorkspaceAction, createWorkspaceAction } from "@/app/actions";
import type { DbWorkspace } from "@/lib/db/schema";

type WorkspaceSwitcherProps = {
  activeWorkspace: DbWorkspace;
  workspaces: DbWorkspace[];
};

function setActiveWorkspaceCookie(workspaceId: string) {
  if (typeof document !== "undefined") {
    document.cookie = `collabspace_active_workspace=${workspaceId}; path=/; max-age=31536000; SameSite=Lax`;
  }
}

export function WorkspaceSwitcher({ activeWorkspace, workspaces }: WorkspaceSwitcherProps) {
  const [currentWorkspace, setOptimisticWorkspace] = useOptimistic(
    activeWorkspace,
    (_state, newWs: DbWorkspace) => newWs
  );
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
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
    <div className="relative mb-6" ref={dropdownRef}>
      <button
        type="button"
        data-testid="workspace-switcher-trigger"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-2.5 text-left transition hover:border-violet-400/40 hover:bg-slate-950/80 focus:outline-none"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-base font-bold text-white shadow-lg shadow-violet-950/30">
            {currentWorkspace.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-white">
                {currentWorkspace.name}
              </span>
            </div>
            <p className="truncate text-xs text-slate-400">collabspace.app/{currentWorkspace.slug}</p>
          </div>
        </div>

        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl border border-white/15 bg-slate-900/95 p-2 shadow-2xl shadow-slate-950/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Workspaces ({workspaces.length})
          </div>

          <div className="mt-1 space-y-1">
            {workspaces.map((ws) => {
              const isActive = ws.id === currentWorkspace.id;
              return (
                <button
                  key={ws.id}
                  type="button"
                  data-testid={`workspace-option-${ws.slug}`}
                  onClick={() => handleSelectWorkspace(ws.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-sm transition ${
                    isActive
                      ? "bg-violet-500/20 text-violet-100 ring-1 ring-inset ring-violet-400/40"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-semibold text-slate-200">
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <p className="truncate text-sm font-medium">{ws.name}</p>
                      <p className="text-[10px] text-slate-400">collabspace.app/{ws.slug}</p>
                    </div>
                  </div>

                  {isActive && (
                    <svg className="h-4 w-4 shrink-0 text-violet-400" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-2 border-t border-white/10 pt-2 space-y-1">
            <Link
              href="/start"
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white"
            >
              <svg className="h-4 w-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-violet-300 hover:bg-violet-500/10 hover:text-violet-200"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create new workspace</span>
            </button>
          </div>
        </div>
      )}

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-white">Create New Workspace</h3>
            <p className="mt-1 text-sm text-slate-400">
              Set up a collaborative workspace for your team or client.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Workspace Name</label>
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="e.g. Apex Innovations"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateWorkspace}
                disabled={!newWorkspaceName.trim() || isPending}
                className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400 disabled:opacity-50"
              >
                {isPending ? "Creating..." : "Create Workspace"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

