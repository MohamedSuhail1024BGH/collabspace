"use client";

import Link from "next/link";

type WorkloadMember = {
  id: string;
  name: string;
  loadPercentage: number;
  initials: string;
  color: string;
};

export function WorkloadChartWidget({
  members = [],
}: {
  members?: { name: string; role?: string; initials?: string; color?: string }[];
}) {
  // Generate member workloads from input or defaults
  const workloadList: WorkloadMember[] = members.length > 0
    ? members.slice(0, 5).map((m, idx) => {
        const loads = [75, 48, 88, 62, 35];
        return {
          id: `m-${idx}`,
          name: m.name.split(" ")[0],
          loadPercentage: loads[idx % loads.length],
          initials: m.initials || m.name.slice(0, 2).toUpperCase(),
          color: m.color || "bg-primary",
        };
      })
    : [
        { id: "1", name: "Jacob", loadPercentage: 75, initials: "JC", color: "bg-error" },
        { id: "2", name: "Lucie", loadPercentage: 45, initials: "LC", color: "bg-secondary" },
        { id: "3", name: "Anna", loadPercentage: 85, initials: "AN", color: "bg-primary" },
        { id: "4", name: "Frankie", loadPercentage: 65, initials: "FK", color: "bg-tertiary" },
        { id: "5", name: "Alif", loadPercentage: 35, initials: "AL", color: "bg-primary-container" },
      ];

  return (
    <div
      data-testid="workload-chart-widget"
      className="rounded bg-surface-container-low border border-outline/20 p-4 flex flex-col text-on-surface h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold tracking-tight text-on-surface">Work load</h3>
        <Link href="/reports" className="text-xs text-primary font-mono hover:underline">
          Details &rsaquo;
        </Link>
      </div>
      <p className="text-[11px] text-on-surface-variant font-mono mb-4">
        Workload distribution across team this week
      </p>

      {/* Bar Chart Container */}
      <div className="flex-1 flex items-end justify-between gap-3 px-2 pb-2 min-h-[140px]">
        {workloadList.map((member) => (
          <div key={member.id} className="flex flex-col items-center gap-2 flex-1 group">
            {/* Vertical Bar Track */}
            <div className="relative w-2.5 sm:w-3.5 h-28 sm:h-32 rounded-full bg-surface-container-highest overflow-hidden flex flex-col justify-end">
              <div
                style={{ height: `${member.loadPercentage}%` }}
                className="w-full rounded-full bg-secondary transition-all duration-500 group-hover:brightness-110"
              />
            </div>

            {/* Avatar Pill */}
            <div
              className={`flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[9px] sm:text-[10px] font-bold text-white shadow ring-1 ring-surface-container-lowest ${member.color}`}
              title={`${member.name} (${member.loadPercentage}% load)`}
            >
              {member.initials.slice(0, 1)}
            </div>

            {/* Member Name */}
            <span className="text-[10px] font-mono text-on-surface-variant truncate max-w-[45px] text-center">
              {member.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
