import type { DashboardTask } from "@/data/mock-data";

const priorityStyles = {
  High: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  Medium: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  Low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
} as const;

const statusStyles: Record<string, string> = {
  "Not started": "border-slate-500/30 bg-slate-500/10 text-slate-200",
  "In progress": "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
  Pending: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  Review: "border-violet-500/30 bg-violet-500/10 text-violet-200",
  Blocked: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  Completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
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
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex-1">
          <div className="flex items-start gap-3">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-violet-400" aria-hidden="true" />
            <div>
              <p className="text-base font-medium text-white">{title}</p>
              {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${priorityStyles[priority] ?? "border-slate-500/30 bg-slate-500/10 text-slate-200"}`}>
              {priority}
            </span>
            <span className={`rounded-full border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${statusStyles[status] ?? "border-slate-500/30 bg-slate-500/10 text-slate-200"}`}>
              {status}
            </span>
            {project ? (
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-200">
                {project}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
          <div className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Assignee</p>
            <p className="mt-1 text-sm font-medium text-white">{assignee}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Due</p>
            <p className="mt-1 text-sm font-medium text-white">{formatDate(dueValue)}</p>
          </div>
        </div>
      </div>

      {onEdit || onDelete || onStatusChange ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => onStatusChange?.(taskId, event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-900/80 px-2.5 py-1.5 text-sm text-white focus:border-violet-400/50 focus:outline-none"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit?.(task as DashboardTask)}
              className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-1.5 text-sm text-slate-200 transition hover:border-violet-500/40 hover:text-white"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete?.(taskId)}
              className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-sm text-rose-200 transition hover:bg-rose-500/20"
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
