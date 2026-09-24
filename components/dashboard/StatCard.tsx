type StatCardProps = {
  label: string;
  value: string;
  change: string;
};

export function StatCard({ label, value, change }: StatCardProps) {
  const isPositive = change.startsWith("+");
  return (
    <div className="rounded-xl bg-surface-container border border-outline-variant/20 p-4 hover:border-primary/40 hover:bg-surface-high transition-all duration-150 group shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">{label}</span>
      </div>
      <div className="flex items-baseline justify-between mt-1">
        <span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">{value}</span>
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium ${
            isPositive
              ? "bg-secondary/15 text-secondary border border-secondary/30"
              : "bg-surface-lowest text-on-surface-variant border border-outline-variant/20"
          }`}
        >
          <span>{change}</span>
        </div>
      </div>
    </div>
  );
}
