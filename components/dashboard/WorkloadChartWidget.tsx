"use client";

import { useMemo } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/ui/UserAvatar";

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
    <div
      data-testid="workload-chart-widget"
      className="rounded-lg bg-surface-container-low border border-outline/20 p-3 sm:p-4 flex flex-col text-on-surface h-full w-full max-w-full min-w-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold tracking-tight text-on-surface">Work load</h3>
        <Link href="/reports" className="text-xs text-primary font-mono hover:underline">
          Details &rsaquo;
        </Link>
      </div>
      <p className="text-[10px] sm:text-[11px] text-on-surface-variant font-mono mb-3 sm:mb-4">
        Active task distribution across workspace members
      </p>

      {hasMembers ? (
        /* Bar Chart Container */
        <div className="flex-1 flex items-end justify-between gap-2 sm:gap-3 px-1 sm:px-2 pb-1 min-h-[95px] sm:min-h-[130px]">
          {workloadList.map((member) => (
            <div key={member.id} className="flex flex-col items-center gap-1.5 flex-1 min-w-0 group">
              {/* Percentage Label */}
              <span className="text-[9px] font-mono text-on-surface-variant group-hover:text-secondary transition-colors">
                {member.loadPercentage}%
              </span>

              {/* Vertical Bar Track */}
              <div className="relative w-2.5 sm:w-3.5 h-16 sm:h-28 rounded-full bg-surface-container-highest overflow-hidden flex flex-col justify-end">
                <div
                  style={{ height: `${Math.max(member.loadPercentage, 4)}%` }}
                  className="w-full rounded-full bg-secondary transition-all duration-500 group-hover:brightness-110"
                />
              </div>

              {/* Avatar Pill */}
              <div
                title={`${member.name} (${member.assignedCount} tasks, ${member.loadPercentage}% load)`}
                className="shrink-0"
              >
                <UserAvatar
                  avatar={member.avatar}
                  name={member.name}
                  size="xs"
                />
              </div>

              {/* Member Name */}
              <span className="text-[9px] sm:text-[10px] font-mono text-on-surface-variant truncate max-w-[42px] text-center">
                {member.name}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="my-auto py-6 sm:py-8 flex flex-col items-center justify-center text-center px-4">
          <div className="h-10 w-10 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant mb-2.5 border border-outline-variant/15">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-on-surface font-headline-sm">No task workload yet</p>
          <p className="text-[10px] sm:text-[11px] font-mono text-on-surface-variant max-w-xs mt-1">
            Assign tasks to workspace members to visualize capacity and distribution across workstreams.
          </p>
          <Link
            href="/tasks"
            className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-high border border-outline-variant/25 text-xs font-mono text-primary transition shadow-xs active:scale-95"
          >
            <span>Go to Tasks &rarr;</span>
          </Link>
        </div>
      )}
    </div>
  );
}
