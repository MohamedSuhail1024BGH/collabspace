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

  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Activity trend</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {period === "week"
              ? "Completed task velocity (Last 7 days)"
              : period === "month"
              ? "Weekly task completion (Last 4 weeks)"
              : "Quarterly task throughput (Last 3 months)"}
          </p>
        </div>
      </div>

      <div className="flex items-end justify-between gap-2 overflow-x-auto pt-4 pb-2 px-2">
        {points.map((p) => {
          const heightPct = Math.round((p.value / max) * 100);
          return (
            <div key={p.label} className="flex flex-1 flex-col items-center group min-w-[2.5rem]">
              <span className="mb-1 text-[11px] font-semibold text-slate-400 transition group-hover:text-violet-300">
                {p.value}
              </span>
              <div className="h-32 w-8 sm:w-10 rounded-xl bg-slate-950/60 p-1 flex items-end">
                <div
                  className="w-full rounded-lg bg-gradient-to-t from-violet-600 to-indigo-400 transition-all duration-300 group-hover:brightness-125"
                  style={{ height: `${Math.max(heightPct, 6)}%` }}
                  title={`${p.label}: ${p.value} tasks`}
                />
              </div>
              <span className="mt-2 text-xs font-medium text-slate-300 group-hover:text-white">
                {p.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
