"use client";

export function ActivityChart({
  points,
  period = "week",
  visible = true,
}: {
  points: { label: string; value: number }[];
  period?: string;
  visible?: boolean;
}) {
  if (!visible) return null;

  const actualPeak = Math.max(...points.map((p) => p.value), 0);
  const scaleMax = Math.max(actualPeak, 1);

  return (
    <section className="rounded-xl border border-outline-variant/20 bg-surface-container p-4 sm:p-5 shadow-xs">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-on-surface font-headline-sm">Activity trend</h3>
          <p className="text-xs text-on-surface-variant mt-0.5 font-mono text-[11px]">
            {period === "week"
              ? "Completed task velocity (Last 7 days)"
              : period === "month"
              ? "Weekly task completion (Last 4 weeks)"
              : "Quarterly task throughput (Last 3 months)"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-secondary bg-surface-lowest px-2 py-0.5 rounded-md border border-outline-variant/20">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
          <span>Peak: {actualPeak} tasks</span>
        </div>
      </div>

      <div className="relative flex items-end justify-between gap-2 overflow-x-auto pt-6 pb-2 px-3 bg-surface-lowest rounded-xl border border-outline-variant/20">
        {points.map((p) => {
          const heightPct = Math.round((p.value / scaleMax) * 100);
          return (
            <div key={p.label} className="relative flex flex-1 flex-col items-center group min-w-[2.5rem]">
              {/* Stitch Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-7 z-20 rounded-md bg-surface-highest text-[11px] font-mono border border-outline/30 px-2 py-0.5 text-on-surface shadow-2xl transition-all whitespace-nowrap">
                {p.label}: <span className="text-secondary font-bold">{p.value}</span> tasks
              </div>

              <span className="mb-1 text-[11px] font-mono text-on-surface-variant transition group-hover:text-primary">
                {p.value}
              </span>
              <div className="h-28 w-7 sm:w-9 rounded-lg bg-surface-container p-0.5 flex items-end">
                <div
                  className="w-full rounded-xs bg-primary transition-all duration-300 group-hover:bg-primary-container"
                  style={{ height: p.value > 0 ? `${Math.max(heightPct, 6)}%` : "0%" }}
                  title={`${p.label}: ${p.value} tasks`}
                />
              </div>
              <span className="mt-2 text-xs font-mono text-[11px] text-on-surface-variant group-hover:text-on-surface">
                {p.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
