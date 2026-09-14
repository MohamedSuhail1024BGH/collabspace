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
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl shadow-slate-950/40">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-violet-200">
              {mode === "create" ? "New task" : "Edit task"}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {mode === "create" ? "Create a task" : "Update task details"}
            </h3>
          </div>
          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-violet-200">
            Draft
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-slate-300">Title</label>
            <input
              value={draft.title}
              onChange={(event) => onFieldChange("title", event.target.value)}
              placeholder="Task title"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-slate-300">Description</label>
            <textarea
              value={draft.description}
              onChange={(event) => onFieldChange("description", event.target.value)}
              rows={3}
              placeholder="Add context, blockers, or notes"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Assignee</label>
            <select
              value={draft.assignee}
              onChange={(event) => onFieldChange("assignee", event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white focus:border-violet-400/50 focus:outline-none"
            >
              {assigneeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Project</label>
            {projectOptions && projectOptions.length > 0 ? (
              <select
                value={draft.projectId || ""}
                onChange={(event) => {
                  const val = event.target.value;
                  const match = projectOptions.find((p) => p.id === val);
                  if (match) {
                    onFieldChange("project", match.name);
                    onFieldChange("projectId", match.id);
                  } else {
                    onFieldChange("project", "General");
                    onFieldChange("projectId", "");
                  }
                }}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white focus:border-violet-400/50 focus:outline-none"
              >
                <option value="">General (No project)</option>
                {projectOptions.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={draft.project}
                onChange={(event) => onFieldChange("project", event.target.value)}
                placeholder="Project"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:outline-none"
              />
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Priority</label>
            <select
              value={draft.priority}
              onChange={(event) => onFieldChange("priority", event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white focus:border-violet-400/50 focus:outline-none"
            >
              {priorityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Status</label>
            <select
              value={draft.status}
              onChange={(event) => onFieldChange("status", event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white focus:border-violet-400/50 focus:outline-none"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-slate-300">Due date</label>
            <input
              type="date"
              value={draft.due}
              onChange={(event) => onFieldChange("due", event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white focus:border-violet-400/50 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-200 transition hover:border-violet-500/40 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={onSave}
            className="rounded-2xl bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : mode === "create" ? "Create task" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
