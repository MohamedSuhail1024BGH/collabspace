type StatCardProps = {
  label: string;
  value: string;
  change: string;
};

export function StatCard({ label, value, change }: StatCardProps) {
  const isPositive = change.startsWith("+");
  const isNeutral = !change.startsWith("+") && !change.startsWith("-");

  return (
    <div className="rounded-lg bg-surface-container-low border border-outline/20 p-2.5 sm:p-3.5 hover:border-primary/40 hover:bg-surface-container transition-all group shadow-xs min-w-0 overflow-hidden">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-on-surface-variant font-medium truncate">
          {label}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-1.5 mt-0.5">
        <span className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-on-surface truncate">
          {value}
        </span>
        <div
          className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono ${
            isPositive
              ? "bg-secondary/15 text-secondary border border-secondary/25"
              : isNeutral
              ? "bg-surface-container-high text-on-surface-variant border border-outline-variant/15"
              : "bg-surface-container-high text-tertiary border border-tertiary/25"
          }`}
        >
          <span className="truncate">{change}</span>
        </div>
      </div>
    </div>
  );
}
