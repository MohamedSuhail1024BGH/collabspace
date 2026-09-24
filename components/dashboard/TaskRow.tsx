import type { DashboardTask } from "@/data/mock-data";

const priorityStyles = {
  High: "border-error/30 bg-error-container/20 text-error",
  Medium: "border-tertiary/30 bg-tertiary-container/20 text-tertiary",
  Low: "border-secondary/30 bg-secondary-container/20 text-secondary",
} as const;

const statusStyles: Record<string, string> = {
  "Not started": "border-outline/30 bg-surface-container text-on-surface-variant",
  "In progress": "border-primary/30 bg-primary/10 text-primary",
  Pending: "border-tertiary/30 bg-tertiary-container/20 text-tertiary",
  Review: "border-primary/30 bg-primary-container/20 text-on-surface",
  Blocked: "border-error/30 bg-error-container/20 text-error",
  Completed: "border-secondary/30 bg-secondary-container/20 text-secondary",
};

const statusOptions = ["Not started", "In progress", "Pending", "Review", "Blocked", "Completed"];

const formatDate = (value: string) => {
  if (!value) {
    return "No due date";
  }

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
};

type LegacyTask = {
  title: string;
  priority: "High" | "Medium" | "Low" | string;
  assignee: string;
  time: string;
};

type TaskRowProps = {
  task: DashboardTask | LegacyTask;
  onEdit?: (task: DashboardTask) => void;
  onDelete?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: string) => void;
};

export function TaskRow({ task, onEdit, onDelete, onStatusChange }: TaskRowProps) {
  const isTaskDetail = "id" in task;
  const title = task.title;
  const description = isTaskDetail ? task.description : undefined;
  const assignee = task.assignee;
  const priority = task.priority as "High" | "Medium" | "Low";
  const status = isTaskDetail ? task.status : "Not started";
  const dueValue = isTaskDetail ? task.due : task.time;
  const project = isTaskDetail ? task.project : undefined;
  const taskId = isTaskDetail ? task.id : `${title}-${assignee}`;

  return (
    <div
      className={`rounded-xl bg-surface-container border p-4 hover:border-primary/40 hover:bg-surface-high transition-all duration-150 group shadow-xs ${
        priority === "High"
          ? "border-outline-variant/20 border-l-4 border-l-error"
          : "border-outline-variant/20"
      }`}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2.5">
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                priority === "High" ? "bg-error animate-pulse" : "bg-primary"
              }`}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors truncate font-headline-sm">
                {title}
              </p>
              {description ? (
                <p className="mt-0.5 text-xs text-on-surface-variant line-clamp-2 leading-relaxed">{description}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-medium ${
                priorityStyles[priority] ?? "border-outline/30 bg-surface-container text-on-surface-variant"
              }`}
            >
              {priority === "High" ? "P0 • High" : priority}
            </span>
            <span
              className={`rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-medium ${
                statusStyles[status] ?? "border-outline/30 bg-surface-container text-on-surface-variant"
              }`}
            >
              {status}
            </span>
            {project ? (
              <span className="rounded-md border border-outline-variant/25 bg-surface-lowest px-2 py-0.5 text-[10px] font-mono text-on-surface-variant">
                {project}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0 text-xs">
          <div className="rounded-lg bg-surface-lowest border border-outline-variant/20 px-2.5 py-1">
            <p className="text-[10px] font-mono uppercase text-on-surface-variant/70">Assignee</p>
            <p className="font-medium text-on-surface">{assignee}</p>
          </div>
          <div className="rounded-lg bg-surface-lowest border border-outline-variant/20 px-2.5 py-1">
            <p className="text-[10px] font-mono uppercase text-on-surface-variant/70">Due</p>
            <p className="font-mono text-on-surface">{formatDate(dueValue)}</p>
          </div>
        </div>
      </div>

      {onEdit || onDelete || onStatusChange ? (
        <div className="mt-3 pt-2.5 border-t border-outline-variant/15 flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs text-on-surface-variant">
            <span className="font-mono text-[11px]">Status</span>
            <select
              value={status}
              onChange={(event) => onStatusChange?.(taskId, event.target.value)}
              className="rounded-lg bg-surface-lowest border border-outline-variant/25 px-2.5 py-1 text-xs text-on-surface focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none cursor-pointer transition-all"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option} className="bg-surface-container-high text-on-surface">
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit?.(task as DashboardTask)}
                className="rounded bg-surface-container-high hover:bg-surface-container-highest px-2.5 py-1 text-xs font-medium text-on-surface transition"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete?.(taskId)}
                className="rounded bg-error-container/20 hover:bg-error-container/30 px-2.5 py-1 text-xs font-medium text-error transition"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
