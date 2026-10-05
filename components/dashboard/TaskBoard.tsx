"use client";

import type { DashboardTask } from "@/data/mock-data";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit3, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const COLUMNS = [
  { id: "Not started", label: "Not started", dot: "bg-muted-foreground" },
  { id: "In progress", label: "In progress", dot: "bg-primary animate-pulse" },
  { id: "Review", label: "Review", dot: "bg-sky-500" },
  { id: "Blocked", label: "Blocked", dot: "bg-destructive" },
  { id: "Completed", label: "Completed", dot: "bg-emerald-500" },
] as const;

const formatDate = (value: string) => {
  if (!value) return "No due date";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
};

type TaskBoardProps = {
  tasks: DashboardTask[];
  onEdit?: (task: DashboardTask) => void;
  onDelete?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: string) => void;
  onResetFilters: () => void;
  onCreateTask?: () => void;
  hasActiveFilters?: boolean;
};

export function TaskBoard({
  tasks,
  onEdit,
  onDelete,
  onStatusChange,
  onResetFilters,
  onCreateTask,
  hasActiveFilters,
}: TaskBoardProps) {
  if (tasks.length === 0) {
    if (hasActiveFilters) {
      return (
        <EmptyState
          title="No tasks match your filters"
          description="Try another search term or clear active filters to view all board columns."
          actionLabel="Clear filters"
          onAction={onResetFilters}
        />
      );
    }
    return (
      <EmptyState
        title="No tasks in this workspace yet"
        description="Get started by creating work items, assigning team members, and setting target deadlines."
        actionLabel={onCreateTask ? "+ Create your first task" : undefined}
        onAction={onCreateTask}
      />
    );
  }

  return (
    <div className="flex 2xl:grid 2xl:grid-cols-5 gap-3 sm:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory 2xl:snap-none custom-scrollbar">
      {COLUMNS.map((column) => {
        const columnTasks = tasks.filter((t) => {
          if (column.id === "In progress") {
            return t.status === "In progress" || t.status === "Pending";
          }
          return t.status === column.id;
        });

        return (
          <div
            key={column.id}
            className="flex flex-col bg-secondary/20 border border-border/80 rounded-2xl p-3 sm:p-3.5 min-h-[320px] sm:min-h-[420px] w-[280px] sm:w-[300px] 2xl:w-auto shrink-0 2xl:shrink snap-center 2xl:snap-none"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/80">
              <div className="flex items-center gap-2">
                <span className={cn("size-2 rounded-full", column.dot)} aria-hidden="true" />
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  {column.label}
                </h3>
              </div>
              <Badge variant="secondary" className="text-xs font-mono px-2 py-0.5 rounded-full">
                {columnTasks.length}
              </Badge>
            </div>

            {/* Column Body / Cards */}
            <div className="flex-1 flex flex-col gap-2.5">
              {columnTasks.length === 0 ? (
                <div className="flex-1 flex items-center justify-center border border-dashed border-border/80 rounded-xl p-6 text-xs text-muted-foreground">
                  No tasks
                </div>
              ) : (
                columnTasks.map((task) => {
                  const isHigh = task.priority === "High";
                  const priorityVariant =
                    isHigh ? "destructive" : task.priority === "Medium" ? "warning" : "secondary";

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "group rounded-xl bg-card border border-border/80 p-3.5 hover:border-muted-foreground/30 transition-all duration-200 shadow-xs",
                        isHigh && "border-l-4 border-l-destructive"
                      )}
                    >
                      {/* Priority & Project row */}
                      <div className="flex items-center justify-between gap-1.5 mb-2">
                        <Badge variant={priorityVariant} className="text-[10px] font-mono rounded-full">
                          {isHigh ? "P0 • High" : task.priority}
                        </Badge>
                        {task.project ? (
                          <span className="truncate max-w-[120px] text-[10px] font-mono text-muted-foreground bg-secondary/60 rounded px-1.5 py-0.5 border border-border/50">
                            {task.project}
                          </span>
                        ) : null}
                      </div>

                      {/* Title & Description */}
                      <p
                        onClick={() => onEdit?.(task)}
                        className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 cursor-pointer"
                      >
                        {task.title}
                      </p>
                      {task.description ? (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      ) : null}

                      {/* Assignee & Due */}
                      <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-medium text-foreground truncate max-w-[90px]">
                          {task.assignee}
                        </span>
                        <span className="font-mono text-[11px]">
                          {formatDate(task.due)}
                        </span>
                      </div>

                      {/* Quick Actions & Status Change */}
                      {onStatusChange || onEdit || onDelete ? (
                        <div className="mt-2.5 flex items-center justify-between gap-1">
                          {onStatusChange ? (
                            <select
                              value={task.status}
                              onChange={(e) => onStatusChange(task.id, e.target.value)}
                              className="rounded border border-input bg-card px-1.5 py-0.5 text-[10px] text-foreground font-mono cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                              {COLUMNS.map((col) => (
                                <option key={col.id} value={col.id}>
                                  {col.label}
                                </option>
                              ))}
                            </select>
                          ) : <div />}

                          <div className="flex items-center gap-1">
                            {onEdit ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEdit(task)}
                                className="size-6 text-muted-foreground hover:text-foreground"
                                title="Edit task"
                              >
                                <Edit3 className="size-3.5" />
                              </Button>
                            ) : null}
                            {onDelete ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDelete(task.id)}
                                className="size-6 text-muted-foreground hover:text-destructive"
                                title="Delete task"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
