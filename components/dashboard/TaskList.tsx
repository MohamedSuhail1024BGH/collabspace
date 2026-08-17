import type { DashboardTask } from "@/data/mock-data";

import { TaskRow } from "@/components/dashboard/TaskRow";

type TaskListProps = {
  tasks: DashboardTask[];
  onEdit: (task: DashboardTask) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: string) => void;
  onResetFilters: () => void;
};

export function TaskList({ tasks, onEdit, onDelete, onStatusChange, onResetFilters }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-violet-500/30 bg-slate-950/40 p-8 text-center shadow-inner shadow-slate-950/20">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/10 text-2xl text-violet-200">
          ×
        </div>
        <h4 className="text-xl font-semibold text-white">No tasks match your filters</h4>
        <p className="mt-2 text-sm text-slate-400">
          Try another search or clear the filters to review the full task list.
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-5 rounded-2xl bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );
}
