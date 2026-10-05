import type { DashboardTask } from "@/data/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Edit3, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const priorityVariant =
    priority === "High" ? "destructive" : priority === "Medium" ? "warning" : "secondary";

  const statusVariant =
    status === "Completed"
      ? "success"
      : status === "In progress" || status === "Review"
      ? "default"
      : status === "Blocked"
      ? "destructive"
      : "secondary";

  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-card p-3.5 sm:p-4 hover:border-muted-foreground/30 transition-all duration-200 group w-full max-w-full",
        priority === "High" && "border-l-4 border-l-destructive"
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2.5">
            <span
              className={cn(
                "mt-1.5 size-2 shrink-0 rounded-full",
                priority === "High" ? "bg-destructive animate-pulse" : "bg-primary"
              )}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground transition-colors truncate">
                {title}
              </p>
              {description ? (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <Badge variant={priorityVariant} className="text-[10px] font-mono rounded-full">
              {priority === "High" ? "P0 • High" : priority}
            </Badge>
            <Badge variant={statusVariant} className="text-[10px] font-mono rounded-full">
              {status}
            </Badge>
            {project ? (
              <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground rounded-full border-border/80">
                {project}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5 shrink-0 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 rounded-full bg-secondary/80 border border-border/60 px-2.5 py-0.5">
            <User className="size-3 text-muted-foreground" />
            <span className="font-medium text-foreground">{assignee}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-secondary/80 border border-border/60 px-2.5 py-0.5">
            <Calendar className="size-3 text-muted-foreground" />
            <span className="font-mono text-foreground">{formatDate(dueValue)}</span>
          </div>
        </div>
      </div>

      {onEdit || onDelete || onStatusChange ? (
        <div className="mt-3 pt-2.5 border-t border-border flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">Status:</span>
            <select
              value={status}
              onChange={(event) => onStatusChange?.(taskId, event.target.value)}
              aria-label="Change task status"
              className="rounded-lg border border-input bg-card px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer font-mono"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit?.(task as DashboardTask)}
                className="h-7 px-2.5 text-xs gap-1"
              >
                <Edit3 className="size-3" />
                <span>Edit</span>
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete?.(taskId)}
                className="h-7 px-2.5 text-xs gap-1"
              >
                <Trash2 className="size-3" />
                <span>Delete</span>
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
