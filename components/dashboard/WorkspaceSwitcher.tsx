"use client";

import { useState, useTransition, useRef, useEffect, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { switchWorkspaceAction, createWorkspaceAction } from "@/app/actions";
import type { DbWorkspace, DbUser } from "@/lib/db/schema";
import { FloatingSettingsModal } from "./FloatingSettingsModal";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Check,
  ChevronsUpDown,
  Plus,
  Compass,
  Settings,
  LogOut,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
      {/* Upward Options Menu */}
      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-50 rounded-xl bg-card border border-border p-2 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150 select-none max-h-[70vh] overflow-y-auto">
          {/* Header */}
          <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Workspaces ({workspaces.length})</span>
            <span className="text-primary text-[10px] font-mono">Active</span>
          </div>

          {/* Workspaces list */}
          <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
            {workspaces.map((ws) => {
              const isActive = ws.id === currentWorkspace.id;
              return (
                <button
                  key={ws.id}
                  type="button"
                  data-testid={`workspace-option-${ws.slug}`}
                  onClick={() => handleSelectWorkspace(ws.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-bold text-foreground">
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">{ws.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        collabspace.app/{ws.slug}
                      </p>
                    </div>
                  </div>

                  {isActive && <Check className="size-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Additional Actions */}
          <div className="mt-2 border-t border-border pt-1.5 flex flex-col gap-0.5">
            <Link
              href="/start"
              onClick={() => {
                setIsOpen(false);
                onNavigate?.();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <Compass className="size-4 text-primary shrink-0" />
              <span>Start Hub & Discovery</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setShowCreateModal(true);
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs text-primary hover:bg-primary/10 transition-colors font-medium"
            >
              <Plus className="size-4 shrink-0" />
              <span>Create new workspace</span>
            </button>

            <button
              type="button"
              data-testid="sidebar-settings-button"
              onClick={() => {
                setIsOpen(false);
                setShowSettingsModal(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <Settings className="size-4 shrink-0 text-muted-foreground" />
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
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="size-4 shrink-0" />
                <span>Log out</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Workspace Header Indicator */}
      <div className="px-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="truncate max-w-[150px] font-medium text-foreground">
          {currentWorkspace.name}
        </span>
      </div>

      {/* Trigger Card */}
      <div className="rounded-lg bg-secondary/50 hover:bg-secondary border border-border transition-colors">
        <button
          type="button"
          data-testid="workspace-switcher-trigger"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isPending}
          className="flex w-full items-center justify-between gap-2.5 p-2 text-left overflow-hidden min-w-0 group focus:outline-none rounded-lg"
        >
          <div className="flex items-center gap-2.5 overflow-hidden min-w-0 flex-1">
            <UserAvatar avatar={user?.avatar} name={user?.name} size="sm" showStatus />

            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors block">
                {user?.name || "Member"}
              </span>
              <span className="text-[10px] text-muted-foreground truncate block">
                {user?.email || "active"}
              </span>
            </div>
          </div>

          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-transform duration-200" />
        </button>
      </div>

      {/* Create Workspace Modal with shadcn Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              Create New Workspace
            </DialogTitle>
            <DialogDescription>
              Workspaces are shared environments where teams organize projects, tasks, and discussions.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateWorkspace();
            }}
            className="flex flex-col gap-4 py-2"
          >
            <Field>
              <FieldLabel htmlFor="new-workspace-name">Workspace Name</FieldLabel>
              <Input
                id="new-workspace-name"
                type="text"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="e.g. Design Team, Acme Marketing"
                autoFocus
              />
            </Field>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !newWorkspaceName.trim()}
              >
                {isPending ? "Creating..." : "Create Workspace"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Floating Settings Modal */}
      <FloatingSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
}
