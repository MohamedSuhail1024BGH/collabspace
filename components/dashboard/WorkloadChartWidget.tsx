"use client";

import { useMemo } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/ui/UserAvatar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type WorkloadMember = {
  id: string;
  name: string;
  loadPercentage: number;
  assignedCount: number;
  initials: string;
  avatar?: string | null;
  color: string;
};

type WorkloadTask = {
  assignee: string;
  status: string;
};

export function WorkloadChartWidget({
  members = [],
  tasks = [],
}: {
  members?: { name: string; role?: string; initials?: string; color?: string; avatar?: string | null }[];
  tasks?: WorkloadTask[];
}) {
  const openTasks = useMemo(() => tasks.filter((t) => t.status !== "Completed"), [tasks]);
  const totalOpenCount = openTasks.length;

  const workloadList: WorkloadMember[] = useMemo(() => {
    if (!members || members.length === 0) return [];

    return members.slice(0, 5).map((m, idx) => {
      const assignedCount = openTasks.filter(
        (t) =>
          t.assignee.toLowerCase().includes(m.name.toLowerCase()) ||
          m.name.toLowerCase().includes(t.assignee.toLowerCase())
      ).length;

      const loadPercentage =
        totalOpenCount > 0 ? Math.round((assignedCount / totalOpenCount) * 100) : 0;

      return {
        id: `m-${idx}`,
        name: m.name.split(" ")[0],
        loadPercentage,
        assignedCount,
        initials: m.initials || m.name.slice(0, 2).toUpperCase(),
        avatar: m.avatar || null,
        color: m.color || "bg-primary",
      };
    });
  }, [members, openTasks, totalOpenCount]);

  const hasMembers = workloadList.length > 0;

  return (
    <Card data-testid="workload-chart-widget" className="flex flex-col h-full w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base font-semibold">Workload Distribution</CardTitle>
          <CardDescription className="text-xs">
            Active task allocation across team members
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild className="gap-1 text-xs text-primary">
          <Link href="/reports">
            Details
            <ChevronRight className="size-3.5" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-end pt-3">
        {hasMembers ? (
          <div className="flex items-end justify-between gap-2 sm:gap-4 px-1 pb-2 min-h-[120px] sm:min-h-[140px]">
            {workloadList.map((member) => (
              <div key={member.id} className="flex flex-col items-center gap-2 flex-1 min-w-0 group">
                <span className="text-[11px] font-mono text-muted-foreground group-hover:text-primary transition-colors font-medium">
                  {member.loadPercentage}%
                </span>

                <div className="relative w-3.5 sm:w-5 h-20 sm:h-28 rounded-full bg-secondary overflow-hidden flex flex-col justify-end">
                  <div
                    style={{ height: `${Math.max(member.loadPercentage, 6)}%` }}
                    className="w-full rounded-full bg-primary transition-all duration-500 group-hover:opacity-90"
                  />
                </div>

                <div
                  title={`${member.name} (${member.assignedCount} tasks, ${member.loadPercentage}% load)`}
                  className="shrink-0"
                >
                  <UserAvatar avatar={member.avatar} name={member.name} size="xs" />
                </div>

                <span className="text-[11px] font-medium text-foreground truncate max-w-[48px] text-center">
                  {member.name}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center text-center px-4">
            <div className="size-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground mb-3">
              <BarChart3 className="size-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">No task workload yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mt-1">
              Assign tasks to team members to visualize capacity and distribution.
            </p>
            <Button variant="outline" size="sm" asChild className="mt-4">
              <Link href="/tasks">Go to Tasks</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
