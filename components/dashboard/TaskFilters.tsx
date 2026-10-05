import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RotateCcw } from "lucide-react";

type TaskFiltersProps = {
  search: string;
  status: string;
  priority: string;
  assignee: string;
  statusOptions: string[];
  priorityOptions: string[];
  assigneeOptions: string[];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onAssigneeChange: (value: string) => void;
  onClear: () => void;
};

export function TaskFilters({
  search,
  status,
  priority,
  assignee,
  statusOptions,
  priorityOptions,
  assigneeOptions,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onClear,
}: TaskFiltersProps) {
  return (
    <div className="mb-4 flex flex-col gap-2.5">
      {/* Search Input */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          type="search"
          placeholder="Search tasks by title or assignee..."
          className="pl-9 h-9"
        />
      </div>

      {/* Filter Selects & Actions Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[repeat(3,minmax(140px,1fr))_auto] gap-2 items-center">
        <select
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          aria-label="Filter by status"
          className="w-full rounded-lg border border-input bg-card px-3 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono h-9 cursor-pointer"
        >
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option === "All" ? "Status: All" : option}
            </option>
          ))}
        </select>

        <select
          value={priority}
          onChange={(event) => onPriorityChange(event.target.value)}
          aria-label="Filter by priority"
          className="w-full rounded-lg border border-input bg-card px-3 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono h-9 cursor-pointer"
        >
          {priorityOptions.map((option) => (
            <option key={option} value={option}>
              {option === "All" ? "Priority: All" : option}
            </option>
          ))}
        </select>

        <select
          value={assignee}
          onChange={(event) => onAssigneeChange(event.target.value)}
          aria-label="Filter by assignee"
          className="w-full rounded-lg border border-input bg-card px-3 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono h-9 cursor-pointer col-span-2 sm:col-span-1"
        >
          {assigneeOptions.map((option) => (
            <option key={option} value={option}>
              {option === "All" ? "Assignee: All" : option}
            </option>
          ))}
        </select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClear}
          className="w-full sm:w-auto h-9 gap-1.5 text-xs font-mono col-span-2 lg:col-span-1"
        >
          <RotateCcw className="size-3.5" />
          <span>Clear</span>
        </Button>
      </div>
    </div>
  );
}
