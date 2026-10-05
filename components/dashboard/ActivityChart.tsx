"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ArrowRight } from "lucide-react";

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
    <Card className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between gap-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground tracking-tight">
            Contribution History
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {period === "week"
              ? "Completed velocity across current sprint"
              : period === "month"
              ? "Weekly task completion (Last 4 weeks)"
              : "Quarterly task throughput and deliveries"}
          </p>
        </div>
        <Badge variant="outline" className="text-[11px] font-mono px-2.5 py-0.5 rounded-full shrink-0">
          <TrendingUp className="size-3 text-emerald-400 mr-1" />
          <span>Peak {actualPeak}</span>
        </Badge>
      </div>

      {/* Bar Chart Visualization (inspired by ShadCN Contribution History) */}
      <div className="flex items-end justify-between gap-2.5 sm:gap-4 pt-4 pb-2 px-1">
        {points.map((p) => {
          const heightPct = Math.round((p.value / scaleMax) * 100);
          const isPeak = p.value === actualPeak && actualPeak > 0;

          return (
            <div key={p.label} className="relative flex flex-1 flex-col items-center group min-w-[2rem]">
              <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-8 z-20 rounded-md bg-foreground text-[10px] font-mono px-2 py-0.5 text-background shadow-lg transition-all whitespace-nowrap">
                {p.label}: <span className="font-bold">{p.value}</span>
              </div>

              <div className="h-32 sm:h-36 w-full max-w-[42px] rounded-xl bg-secondary/60 p-1 flex items-end border border-border/60 transition-colors group-hover:border-border">
                <div
                  className={`w-full rounded-lg transition-all duration-300 ${
                    isPeak
                      ? "bg-foreground shadow-sm"
                      : "bg-muted-foreground/30 group-hover:bg-muted-foreground/50"
                  }`}
                  style={{ height: p.value > 0 ? `${Math.max(heightPct, 12)}%` : "8%" }}
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

      {/* Metric Capsules (Inspired by ShadCN Overview Card) */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 sm:p-3.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-0.5">
            UPCOMING SPRINT
          </span>
          <p className="text-sm font-semibold text-foreground">Next Cycle</p>
          <span className="text-[11px] text-muted-foreground font-medium">Scheduled</span>
        </div>

        <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 sm:p-3.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-0.5">
            THROUGHPUT PLAN
          </span>
          <p className="text-sm font-semibold text-foreground">Accelerated</p>
          <span className="text-[11px] text-emerald-400 font-medium">Active Pace</span>
        </div>
      </div>

      {/* Action CTA (Full-width high-contrast pill button) */}
      <Button asChild variant="default" className="w-full rounded-full h-10 font-semibold cursor-pointer shadow-xs">
        <Link href="/reports" className="flex items-center justify-center gap-2">
          <span>View Full Report</span>
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </Card>
  );
}
