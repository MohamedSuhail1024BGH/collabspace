"use client";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, BarChart2 } from "lucide-react";
import type { StatusCount } from "@/data/mock-data";

export function TaskReport({ statusBreakdown, totalTasks = 1, visible = true }: { statusBreakdown: StatusCount[]; totalTasks?: number; visible?: boolean }) {
  if (!visible) return null;

  const total = totalTasks || 1;

  return (
    <Card className="p-4 sm:p-5 border-border/60 shadow-xs">
      <div className="mb-4 flex items-center justify-between pb-3 border-b border-border/60">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <BarChart2 className="size-4 text-primary" />
            <span>Task analytics</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Status breakdown and counts</p>
        </div>
      </div>

      {totalTasks > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-4 bg-muted/10 border-border/50">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
              Status breakdown
            </p>
            <div className="mt-3.5 space-y-3">
              {statusBreakdown.map((entry) => {
                const { status, count } = entry;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={status} className="flex items-center gap-2.5">
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${entry.color ?? "bg-primary"}`} />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-foreground font-medium">{status}</span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-4 bg-muted/10 border-border/50">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
              Quick totals
            </p>
            <div className="mt-3.5 divide-y divide-border/40 text-xs font-mono">
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Total tasks</span>
                <span className="font-semibold text-foreground">{totalTasks}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-semibold text-emerald-500">
                  {statusBreakdown.find((s) => s.status.toLowerCase() === "completed")?.count ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Blocked</span>
                <span className="font-semibold text-destructive">
                  {statusBreakdown.find((s) => s.status.toLowerCase() === "blocked")?.count ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Overdue</span>
                <span className="font-semibold text-amber-500">
                  {statusBreakdown.find((s) => s.status.toLowerCase() === "overdue")?.count ?? 0}
                </span>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div
          data-testid="no-task-reports"
          className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground font-mono"
        >
          No Task Analytics here
        </div>
      )}
    </Card>
  );
}
