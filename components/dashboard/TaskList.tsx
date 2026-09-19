import type { DashboardTask } from "@/data/mock-data";
import { TaskRow } from "@/components/dashboard/TaskRow";
import { EmptyState } from "@/components/ui/EmptyState";

type TaskListProps = {
  tasks: DashboardTask[];
  onEdit?: (task: DashboardTask) => void;
  onDelete?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: string) => void;
  onResetFilters: () => void;
};

export function TaskList({ tasks, onEdit, onDelete, onStatusChange, onResetFilters }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No tasks match your filters"
        description="Try another search term or clear active filters to review the full queue."
        actionLabel="Clear filters"
        onAction={onResetFilters}
      />
    );
  }

  return (
    <div className="space-y-2.5">
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
