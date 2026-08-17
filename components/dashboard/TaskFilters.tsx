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
    <div className="mb-5 grid gap-3 lg:grid-cols-[1.2fr_repeat(3,minmax(140px,1fr))_auto]">
      <input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        type="search"
        placeholder="Search tasks by title or assignee"
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:outline-none"
      />

      <select
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white focus:border-violet-400/50 focus:outline-none"
      >
        {statusOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <select
        value={priority}
        onChange={(event) => onPriorityChange(event.target.value)}
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white focus:border-violet-400/50 focus:outline-none"
      >
        {priorityOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <select
        value={assignee}
        onChange={(event) => onAssigneeChange(event.target.value)}
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white focus:border-violet-400/50 focus:outline-none"
      >
        {assigneeOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={onClear}
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-200 transition hover:border-violet-500/40 hover:text-white"
      >
        Clear
      </button>
    </div>
  );
}
