"use client";

export function ActivityChart({ points, period = "week", visible = true }: { points: { label: string; value: number }[]; period?: string; visible?: boolean }) {
  if (!visible) return null;

  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Activity trend</h3>
        <p className="text-sm text-slate-300">{period === "week" ? "Last 7 days" : period === "month" ? "Last 4 weeks" : "Last 3 months"}</p>
      </div>

      <div className="flex items-end gap-2 overflow-x-auto">
        {points.map((p) => (
          <div key={p.label} className="flex-0 w-10 text-center">
            <div className="mx-auto mb-2 h-28 w-6 rounded-t-md bg-slate-800">
              <div className="mx-auto h-full w-full rounded-t-md bg-violet-500" style={{ height: `${(p.value / max) * 100}%` }} />
            </div>
            <div className="text-xs text-slate-300">{p.label.split(" ")[1]}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
