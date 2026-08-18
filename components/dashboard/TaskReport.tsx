"use client";

import type { StatusCount } from "@/data/mock-data";

export function TaskReport({ statusBreakdown, totalTasks = 1, visible = true }: { statusBreakdown: StatusCount[]; totalTasks?: number; visible?: boolean }) {
  if (!visible) return null;

  const total = totalTasks || 1;

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Task analytics</h3>
        <p className="text-sm text-slate-300">Status breakdown and counts</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/6 bg-slate-950/50 p-4">
          <p className="text-sm font-medium text-white">Status breakdown</p>
          <div className="mt-3 space-y-2">
            {statusBreakdown.map((entry) => {
              const { status, count } = entry;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={status} className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${entry.color ?? "bg-slate-700"}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-200">{status}</span>
                      <span className="text-xs text-slate-400">{count} ({pct}%)</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-slate-800">
                      <div className="h-2 rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-white/6 bg-slate-950/50 p-4">
          <p className="text-sm font-medium text-white">Quick totals</p>
          <div className="mt-3 grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-200">Total tasks</span>
              <span className="text-sm font-medium text-white">{total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-200">Completed</span>
              <span className="text-sm font-medium text-white">{statusBreakdown.find((s) => s.status.toLowerCase() === "completed")?.count ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-200">Blocked</span>
              <span className="text-sm font-medium text-white">{statusBreakdown.find((s) => s.status.toLowerCase() === "blocked")?.count ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-200">Overdue</span>
              <span className="text-sm font-medium text-white">{statusBreakdown.find((s) => s.status.toLowerCase() === "overdue")?.count ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
