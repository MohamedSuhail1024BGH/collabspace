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
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          type="search"
          placeholder="Search tasks by title or assignee..."
          className="w-full rounded-lg bg-surface-container-lowest border border-outline/20 px-3 py-2 sm:py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none"
        />
      </div>

      {/* Filter Selects & Actions Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[repeat(3,minmax(130px,1fr))_auto] gap-2 items-center">
        <select
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          aria-label="Filter by status"
          className="w-full rounded-lg bg-surface-container-lowest border border-outline/20 px-2.5 py-2 sm:py-1.5 text-xs text-on-surface focus:border-primary focus:outline-none font-mono"
        >
          {statusOptions.map((option) => (
            <option key={option} value={option} className="bg-surface-container text-on-surface">
              {option === "All" ? "Status: All" : option}
            </option>
          ))}
        </select>

        <select
          value={priority}
          onChange={(event) => onPriorityChange(event.target.value)}
          aria-label="Filter by priority"
          className="w-full rounded-lg bg-surface-container-lowest border border-outline/20 px-2.5 py-2 sm:py-1.5 text-xs text-on-surface focus:border-primary focus:outline-none font-mono"
        >
          {priorityOptions.map((option) => (
            <option key={option} value={option} className="bg-surface-container text-on-surface">
              {option === "All" ? "Priority: All" : option}
            </option>
          ))}
        </select>

        <select
          value={assignee}
          onChange={(event) => onAssigneeChange(event.target.value)}
          aria-label="Filter by assignee"
          className="w-full rounded-lg bg-surface-container-lowest border border-outline/20 px-2.5 py-2 sm:py-1.5 text-xs text-on-surface focus:border-primary focus:outline-none font-mono col-span-1"
        >
          {assigneeOptions.map((option) => (
            <option key={option} value={option} className="bg-surface-container text-on-surface">
              {option === "All" ? "Assignee: All" : option}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onClear}
          className="w-full sm:w-auto rounded-lg bg-surface-container hover:bg-surface-container-highest border border-outline/20 px-3 py-2 sm:py-1.5 text-xs font-mono text-on-surface transition active:scale-95 text-center cursor-pointer"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
