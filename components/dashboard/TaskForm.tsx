"use client";

import { useEffect } from "react";
import type { TaskPriority } from "@/data/mock-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { CheckSquare } from "lucide-react";

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
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CheckSquare className="size-5 text-primary" />
              {mode === "create" ? "Create a New Task" : "Update Task Details"}
            </DialogTitle>
            <Badge variant="outline" className="text-[10px] font-mono">
              Draft
            </Badge>
          </div>
          <DialogDescription>
            {mode === "create"
              ? "Assign a task, set deadlines, and configure priority for team visibility."
              : "Modify task metadata, assignees, and progress status."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
          className="flex flex-col gap-4 py-2"
        >
          <Field>
            <FieldLabel htmlFor="task-title">Title</FieldLabel>
            <Input
              id="task-title"
              value={draft.title}
              onChange={(e) => onFieldChange("title", e.target.value)}
              placeholder="e.g. Redesign navigation bar"
              required
              autoFocus
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="task-description">Description</FieldLabel>
            <Textarea
              id="task-description"
              rows={3}
              value={draft.description}
              onChange={(e) => onFieldChange("description", e.target.value)}
              placeholder="Add context, blockers, or acceptance criteria..."
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="task-assignee">Assignee</FieldLabel>
              <select
                id="task-assignee"
                value={draft.assignee}
                onChange={(e) => onFieldChange("assignee", e.target.value)}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer h-9"
              >
                {assigneeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <Field>
              <FieldLabel htmlFor="task-project">Project</FieldLabel>
              <select
                id="task-project"
                value={draft.projectId || draft.project}
                onChange={(e) => {
                  const selectedVal = e.target.value;
                  const matched = projectOptions.find(
                    (p) => p.id === selectedVal || p.name === selectedVal
                  );
                  if (matched) {
                    onFieldChange("project", matched.name);
                    onFieldChange("projectId", matched.id);
                  } else {
                    onFieldChange("project", selectedVal);
                  }
                }}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer h-9"
              >
                <option value="General">General</option>
                {projectOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field>
              <FieldLabel htmlFor="task-priority">Priority</FieldLabel>
              <select
                id="task-priority"
                value={draft.priority}
                onChange={(e) => onFieldChange("priority", e.target.value as TaskPriority)}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer font-mono h-9"
              >
                {priorityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <Field>
              <FieldLabel htmlFor="task-status">Status</FieldLabel>
              <select
                id="task-status"
                value={draft.status}
                onChange={(e) => onFieldChange("status", e.target.value)}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer font-mono h-9"
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="task-due">Due Date</FieldLabel>
              <Input
                id="task-due"
                type="date"
                value={draft.due}
                onChange={(e) => onFieldChange("due", e.target.value)}
                className="font-mono h-9"
              />
            </Field>
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !draft.title.trim()}>
              {isSaving
                ? "Saving..."
                : mode === "create"
                ? "Create task"
                : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
