import type { DashboardTask } from "@/data/mock-data";
import { TaskRow } from "@/components/dashboard/TaskRow";
import { EmptyState } from "@/components/ui/EmptyState";

type TaskListProps = {
  tasks: DashboardTask[];
  onEdit?: (task: DashboardTask) => void;
  onDelete?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: string) => void;
  onResetFilters: () => void;
  onCreateTask?: () => void;
  hasActiveFilters?: boolean;
};

export function TaskList({
  tasks,
  onEdit,
  onDelete,
  onStatusChange,
  onResetFilters,
  onCreateTask,
  hasActiveFilters,
}: TaskListProps) {
  if (tasks.length === 0) {
    if (hasActiveFilters) {
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
      <EmptyState
        title="No tasks in this workspace yet"
        description="Get started by creating work items, assigning team members, and setting target deadlines."
        actionLabel={onCreateTask ? "+ Create your first task" : undefined}
        onAction={onCreateTask}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
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
