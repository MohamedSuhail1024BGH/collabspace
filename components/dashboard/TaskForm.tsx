"use client";

import { useEffect } from "react";
import type { TaskPriority } from "@/data/mock-data";

export type TaskDraft = {
  id?: string;
  title: string;
  description: string;
  assignee: string;
  priority: TaskPriority;
  status: string;
  due: string;
  project: string;
  projectId?: string;
};

type TaskFormProps = {
  mode: "create" | "edit";
  draft: TaskDraft;
  assigneeOptions: string[];
  statusOptions: string[];
  priorityOptions: TaskPriority[];
  projectOptions?: { id: string; name: string }[];
  isSaving?: boolean;
  onFieldChange: (field: keyof TaskDraft, value: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

export function TaskForm({
  mode,
  draft,
  assigneeOptions,
  statusOptions,
  priorityOptions,
  projectOptions = [],
  isSaving = false,
  onFieldChange,
  onCancel,
  onSave,
}: TaskFormProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl rounded-t-2xl sm:rounded-2xl bg-surface-container border border-outline-variant/30 p-4 sm:p-6 shadow-2xl max-h-[92dvh] flex flex-col">
        <div className="mb-4 sm:mb-5 flex items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-outline-variant/15 shrink-0">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
              {mode === "create" ? "New task" : "Edit task"}
            </p>
            <h3 className="text-base sm:text-lg font-bold text-on-surface font-headline-sm">
              {mode === "create" ? "Create a task" : "Update task details"}
            </h3>
          </div>
          <span className="rounded-md bg-surface-container-high px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-primary">
            Draft
          </span>
        </div>

        <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-mono text-on-surface-variant">Title</label>
            <input
              value={draft.title}
              onChange={(event) => onFieldChange("title", event.target.value)}
              placeholder="Task title"
              className="w-full rounded-lg bg-surface-lowest border border-outline-variant/25 px-3.5 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/50 focus:outline-none transition-all"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-mono text-on-surface-variant">Description</label>
            <textarea
              rows={3}
              value={draft.description}
              onChange={(event) => onFieldChange("description", event.target.value)}
              placeholder="Add context, blockers, or notes"
              className="w-full rounded-lg bg-surface-lowest border border-outline-variant/25 px-3.5 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/50 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-mono text-on-surface-variant">Assignee</label>
            <select
              value={draft.assignee}
              onChange={(event) => onFieldChange("assignee", event.target.value)}
              className="w-full rounded-lg bg-surface-lowest border border-outline-variant/25 px-3.5 py-2 text-xs text-on-surface focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/50 focus:outline-none transition-all"
            >
              {assigneeOptions.map((option) => (
                <option key={option} value={option} className="bg-surface-container-high text-on-surface">
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-mono text-on-surface-variant">Project</label>
            <select
              value={draft.projectId || draft.project}
              onChange={(event) => {
                const selectedVal = event.target.value;
                const matched = projectOptions.find((p) => p.id === selectedVal || p.name === selectedVal);
                if (matched) {
                  onFieldChange("project", matched.name);
                  onFieldChange("projectId", matched.id);
                } else {
                  onFieldChange("project", selectedVal);
                }
              }}
              className="w-full rounded-lg bg-surface-lowest border border-outline-variant/25 px-3.5 py-2 text-xs text-on-surface focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/50 focus:outline-none transition-all"
            >
              <option value="General" className="bg-surface-container-high text-on-surface">General</option>
              {projectOptions.map((option) => (
                <option key={option.id} value={option.id} className="bg-surface-container-high text-on-surface">
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-mono text-on-surface-variant">Priority</label>
            <select
              value={draft.priority}
              onChange={(event) => onFieldChange("priority", event.target.value)}
              className="w-full rounded-lg bg-surface-lowest border border-outline-variant/25 px-3.5 py-2 text-xs text-on-surface focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/50 focus:outline-none font-mono transition-all"
            >
              {priorityOptions.map((option) => (
                <option key={option} value={option} className="bg-surface-container-high text-on-surface">
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-mono text-on-surface-variant">Status</label>
            <select
              value={draft.status}
              onChange={(event) => onFieldChange("status", event.target.value)}
              className="w-full rounded-lg bg-surface-lowest border border-outline-variant/25 px-3.5 py-2 text-xs text-on-surface focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/50 focus:outline-none font-mono transition-all"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option} className="bg-surface-container-high text-on-surface">
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-mono text-on-surface-variant">Due date</label>
            <input
              type="date"
              value={draft.due}
              onChange={(event) => onFieldChange("due", event.target.value)}
              className="w-full rounded-lg bg-surface-lowest border border-outline-variant/25 px-3.5 py-2 text-xs text-on-surface focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/50 focus:outline-none font-mono transition-all"
            />
          </div>
        </div>
      </div>

      <div className="mt-3 sm:mt-6 flex justify-end gap-2.5 sm:gap-3 pt-3 sm:pt-4 border-t border-outline-variant/15 shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg bg-surface-high hover:bg-surface-highest px-4 py-2 text-xs font-medium text-on-surface transition-colors active:scale-95 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={onSave}
          className="rounded-lg bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-5 py-2 text-xs font-medium transition-all shadow-sm disabled:opacity-50 active:scale-95 cursor-pointer"
        >
          {isSaving ? "Saving..." : mode === "create" ? "Create task" : "Save changes"}
        </button>
      </div>
    </div>
  </div>
);
}
