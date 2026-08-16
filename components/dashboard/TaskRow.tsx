type TaskRowProps = {
  task: {
    title: string;
    priority: string;
    assignee: string;
    time: string;
  };
};

export function TaskRow({ task }: TaskRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/50 p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-3 w-3 rounded-full bg-cyan-400" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-white">{task.title}</p>
          <p className="text-xs text-slate-400">
            {task.assignee} · {task.time}
          </p>
        </div>
      </div>
      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-amber-200">
        {task.priority}
      </span>
    </div>
  );
}
