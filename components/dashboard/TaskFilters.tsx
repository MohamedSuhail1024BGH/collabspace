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
    <div className="mb-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,minmax(120px,1fr))_auto]">
      <input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        type="search"
        placeholder="Search tasks by title or assignee"
        className="rounded bg-surface-container-lowest border border-outline/20 px-3 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none"
      />

      <select
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
        className="rounded bg-surface-container-lowest border border-outline/20 px-2.5 py-1.5 text-xs text-on-surface focus:border-primary focus:outline-none font-mono"
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
        className="rounded bg-surface-container-lowest border border-outline/20 px-2.5 py-1.5 text-xs text-on-surface focus:border-primary focus:outline-none font-mono"
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
        className="rounded bg-surface-container-lowest border border-outline/20 px-2.5 py-1.5 text-xs text-on-surface focus:border-primary focus:outline-none font-mono"
      >
        {assigneeOptions.map((option) => (
          <option key={option} value={option}>
            {option === "All" ? "Assignee: All" : option}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={onClear}
        className="rounded bg-surface-container hover:bg-surface-container-highest border border-outline/20 px-3 py-1.5 text-xs font-mono text-on-surface transition"
      >
        Clear
      </button>
    </div>
  );
}
