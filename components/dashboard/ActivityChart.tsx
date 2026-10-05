"use client";

import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

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
    <Card className="p-4 sm:p-5 border-border/60 shadow-xs">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            <span>Activity trend</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono text-[11px]">
            {period === "week"
              ? "Completed task velocity (Last 7 days)"
              : period === "month"
              ? "Weekly task completion (Last 4 weeks)"
              : "Quarterly task throughput (Last 3 months)"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span>Peak: {actualPeak} tasks</span>
        </div>
      </div>

      <div className="relative flex items-end justify-between gap-2 overflow-x-auto pt-6 pb-2 px-3 bg-muted/20 rounded-xl border border-border/40">
        {points.map((p) => {
          const heightPct = Math.round((p.value / scaleMax) * 100);
          return (
            <div key={p.label} className="relative flex flex-1 flex-col items-center group min-w-[2.5rem]">
              <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-7 z-20 rounded-md bg-foreground text-[11px] font-mono px-2 py-0.5 text-background shadow-lg transition-all whitespace-nowrap">
                {p.label}: <span className="font-bold">{p.value}</span> tasks
              </div>

              <span className="mb-1 text-[11px] font-mono text-muted-foreground transition group-hover:text-primary">
                {p.value}
              </span>
              <div className="h-28 w-7 sm:w-9 rounded-lg bg-card p-0.5 flex items-end border border-border/40 shadow-xs">
                <div
                  className="w-full rounded-md bg-primary transition-all duration-300 group-hover:bg-primary/80"
                  style={{ height: p.value > 0 ? `${Math.max(heightPct, 6)}%` : "0%" }}
                  title={`${p.label}: ${p.value} tasks`}
                />
              </div>
              <span className="mt-2 text-xs font-mono text-[11px] text-muted-foreground group-hover:text-foreground">
                {p.label}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
