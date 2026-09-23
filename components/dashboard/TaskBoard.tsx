"use client";

import { useState } from "react";
import type { DashboardTask } from "@/data/mock-data";
import { EmptyState } from "@/components/ui/EmptyState";

const COLUMNS = [
  { id: "Not started", label: "Not started", dot: "bg-outline-variant" },
  { id: "In progress", label: "In progress", dot: "bg-primary animate-pulse" },
  { id: "Review", label: "Review", dot: "bg-tertiary" },
  { id: "Blocked", label: "Blocked", dot: "bg-error" },
  { id: "Completed", label: "Completed", dot: "bg-secondary" },
] as const;

const priorityStyles: Record<string, string> = {
  High: "border-error/30 bg-error-container/20 text-error",
  Medium: "border-tertiary/30 bg-tertiary-container/20 text-tertiary",
  Low: "border-secondary/30 bg-secondary-container/20 text-secondary",
};

const formatDate = (value: string) => {
  if (!value) return "No due date";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
};

type TaskBoardProps = {
  tasks: DashboardTask[];
  onEdit?: (task: DashboardTask) => void;
  onDelete?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: string) => void;
  onResetFilters: () => void;
};

export function TaskBoard({
  tasks,
  onEdit,
  onDelete,
  onStatusChange,
  onResetFilters,
}: TaskBoardProps) {
  const [activeMobileColumn, setActiveMobileColumn] = useState<string>("In progress");

  if (tasks.length === 0) {
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
    <div className="space-y-3">
      {/* Mobile Column Switcher Carousel (< md) */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {COLUMNS.map((column) => {
          const count = tasks.filter((t) => {
            if (column.id === "In progress") {
              return t.status === "In progress" || t.status === "Pending";
            }
            return t.status === column.id;
          }).length;
          const isActive = activeMobileColumn === column.id;
          return (
            <button
              key={column.id}
              type="button"
              onClick={() => setActiveMobileColumn(column.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-xs whitespace-nowrap active:scale-95 transition-all ${
                isActive
                  ? "bg-primary text-on-primary font-semibold shadow-xs"
                  : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${column.dot}`} />
              <span>{column.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive
                    ? "bg-on-primary/20 text-on-primary font-bold"
                    : "bg-surface-lowest text-on-surface-variant font-medium"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {COLUMNS.map((column) => {
          const isColumnVisibleOnMobile = activeMobileColumn === column.id;
          const columnTasks = tasks.filter((t) => {
            if (column.id === "In progress") {
              return t.status === "In progress" || t.status === "Pending";
            }
            return t.status === column.id;
          });

          return (
            <div
              key={column.id}
              className={`flex-col bg-surface-lowest/70 border border-outline-variant/15 rounded-xl p-3 min-h-[420px] ${
                isColumnVisibleOnMobile ? "flex" : "hidden md:flex"
              }`}
            >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-outline-variant/15">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${column.dot}`} aria-hidden="true" />
                <h2 className="font-headline-sm text-xs font-semibold text-on-surface uppercase tracking-wider">
                  {column.label}
                </h2>
              </div>
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-medium">
                {columnTasks.length}
              </span>
            </div>

            {/* Column Body / Cards */}
            <div className="flex-1 flex flex-col gap-2.5">
              {columnTasks.length === 0 ? (
                <div className="flex-1 flex items-center justify-center border border-dashed border-outline-variant/15 rounded-lg p-6 text-[11px] font-mono text-on-surface-variant/40">
                  No tasks
                </div>
              ) : (
                columnTasks.map((task) => {
                  const isHigh = task.priority === "High";
                  return (
                    <div
                      key={task.id}
                      className={`group rounded-xl bg-surface-container border p-3.5 hover:border-primary/40 hover:bg-surface-high transition-all shadow-xs ${
                        isHigh
                          ? "border-outline-variant/20 border-l-4 border-l-error"
                          : "border-outline-variant/20"
                      }`}
                    >
                      {/* Priority & Project row */}
                      <div className="flex items-center justify-between gap-1.5 mb-2">
                        <span
                          className={`rounded-md border px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider font-medium ${
                            priorityStyles[task.priority] ??
                            "border-outline/30 bg-surface-lowest text-on-surface-variant"
                          }`}
                        >
                          {isHigh ? "P0 • High" : task.priority}
                        </span>
                        {task.project ? (
                          <span className="truncate max-w-[120px] rounded-md border border-outline-variant/25 bg-surface-lowest px-1.5 py-0.5 text-[9px] font-mono text-on-surface-variant">
                            {task.project}
                          </span>
                        ) : null}
                      </div>

                      {/* Title & Description */}
                      <p
                        onClick={() => onEdit?.(task)}
                        className="text-xs font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-2 cursor-pointer font-headline-sm"
                      >
                        {task.title}
                      </p>
                      {task.description ? (
                        <p className="mt-1 text-[11px] text-on-surface-variant line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      ) : null}

                      {/* Assignee & Due */}
                      <div className="mt-3 pt-2.5 border-t border-outline-variant/15 flex items-center justify-between text-[11px]">
                        <span className="font-mono text-on-surface-variant truncate max-w-[90px]">
                          {task.assignee}
                        </span>
                        <span className="font-mono text-[10px] text-on-surface-variant/80">
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
                              className="rounded bg-surface-lowest border border-outline-variant/25 px-1.5 py-0.5 text-[10px] text-on-surface font-mono cursor-pointer focus-visible:ring-1 focus-visible:ring-primary/60 outline-none"
                            >
                              {COLUMNS.map((col) => (
                                <option
                                  key={col.id}
                                  value={col.id}
                                  className="bg-surface-container-high text-on-surface"
                                >
                                  {col.label}
                                </option>
                              ))}
                            </select>
                          ) : <div />}

                          <div className="flex items-center gap-1">
                            {onEdit ? (
                              <button
                                type="button"
                                onClick={() => onEdit(task)}
                                className="p-1 rounded hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition"
                                title="Edit task"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            ) : null}
                            {onDelete ? (
                              <button
                                type="button"
                                onClick={() => onDelete(task.id)}
                                className="p-1 rounded hover:bg-error-container/20 text-on-surface-variant hover:text-error transition"
                                title="Delete task"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
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
  </div>
);
}


