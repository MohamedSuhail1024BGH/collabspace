"use client";

import type { StatusCount } from "@/data/mock-data";

export function TaskReport({ statusBreakdown, totalTasks = 1, visible = true }: { statusBreakdown: StatusCount[]; totalTasks?: number; visible?: boolean }) {
  if (!visible) return null;

  const total = totalTasks || 1;

  return (
    <section className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-4 sm:p-5 shadow-xs">
      <div className="mb-3.5 flex items-center justify-between pb-2.5 border-b border-outline-variant/15">
        <h3 className="text-base font-semibold text-on-surface font-headline-sm">Task analytics</h3>
        <p className="text-xs text-on-surface-variant font-body-sm">Status breakdown and counts</p>
      </div>

      {totalTasks > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-label-sm">
              Status breakdown
            </p>
            <div className="mt-3 space-y-2.5">
              {statusBreakdown.map((entry) => {
                const { status, count } = entry;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={status} className="flex items-center gap-2.5">
                    <div className={`h-2 w-2 rounded-full ${entry.color ?? "bg-primary"}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between font-label-sm">
                        <span className="text-xs text-on-surface">{status}</span>
                        <span className="text-[11px] text-on-surface-variant">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-surface-container-highest overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-label-sm">
              Quick totals
            </p>
            <div className="mt-3 grid gap-2 font-label-sm">
              <div className="flex items-center justify-between py-1 border-b border-outline-variant/15">
                <span className="text-xs text-on-surface-variant">Total tasks</span>
                <span className="text-xs font-semibold text-on-surface">{totalTasks}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-outline/10">
                <span className="text-xs text-on-surface-variant">Completed</span>
                <span className="text-xs font-semibold text-secondary">
                  {statusBreakdown.find((s) => s.status.toLowerCase() === "completed")?.count ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-outline/10">
                <span className="text-xs text-on-surface-variant">Blocked</span>
                <span className="text-xs font-semibold text-error">
                  {statusBreakdown.find((s) => s.status.toLowerCase() === "blocked")?.count ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-on-surface-variant">Overdue</span>
                <span className="text-xs font-semibold text-tertiary">
                  {statusBreakdown.find((s) => s.status.toLowerCase() === "overdue")?.count ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          data-testid="no-task-reports"
          className="rounded border border-dashed border-outline/20 bg-surface-container-lowest p-6 text-center text-xs text-on-surface-variant"
        >
          No Task Analytics here
        </div>
      )}
    </section>
  );
}
