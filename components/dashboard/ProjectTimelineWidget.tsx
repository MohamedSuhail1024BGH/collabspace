"use client";

import { useMemo } from "react";

export type TimelineTask = {
  id: string;
  title: string;
  assignee: string;
  priority: string;
  status: string;
  due: string;
};

type TimelinePhase = {
  id: string;
  name: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  colorClass: string;
  textClass: string;
  members: { name: string; initials: string; color: string }[];
};

export function ProjectTimelineWidget({
  tasks = [],
  teamMembers = [],
}: {
  tasks?: TimelineTask[];
  teamMembers?: { name: string; initials: string; color: string }[];
}) {
  // Generate milestone timeline phases matching design
  const phases = useMemo<TimelinePhase[]>(() => {
    return [
      {
        id: "p1",
        name: "Planning & Scoping",
        subtitle: "Define goals, Research, Scope outline",
        startDate: "Aug 7",
        endDate: "Aug 14",
        colorClass: "bg-tertiary-container/15 border-tertiary/30",
        textClass: "text-tertiary",
        members: teamMembers.slice(0, 3),
      },
      {
        id: "p2",
        name: "Design & UX Prototyping",
        subtitle: "Wireframes, UI - UX, Revisions",
        startDate: "Aug 14",
        endDate: "Aug 21",
        colorClass: "bg-primary-container/15 border-primary/30",
        textClass: "text-primary",
        members: teamMembers.slice(1, 4),
      },
      {
        id: "p3",
        name: "Core Development",
        subtitle: "Front End, Back End, Integration",
        startDate: "Aug 21",
        endDate: "Aug 28",
        colorClass: "bg-surface-container-high border-outline/30",
        textClass: "text-on-surface",
        members: teamMembers.slice(0, 2),
      },
      {
        id: "p4",
        name: "Testing & Bug Fixes",
        subtitle: "Unit tests, E2E QA, Regression",
        startDate: "Aug 28",
        endDate: "Sept 4",
        colorClass: "bg-secondary-container/15 border-secondary/30",
        textClass: "text-secondary",
        members: teamMembers.slice(2, 5),
      },
    ];
  }, [teamMembers]);

  const timelineDates = ["Aug 7", "Aug 14", "Aug 21", "Aug 28", "Sept 4", "Sept 11"];

  return (
    <div
      data-testid="project-timeline-widget"
      className="rounded bg-surface-container-low border border-outline/20 p-4 flex flex-col text-on-surface h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-on-surface">Project timeline</h3>
          <p className="text-[11px] text-on-surface-variant font-mono">Sprint stages and milestone tracking</p>
        </div>
        <span className="text-xs text-primary font-mono cursor-pointer hover:underline">
          Details &rsaquo;
        </span>
      </div>

      {/* Date Header Markers */}
      <div className="border-b border-outline/10 pb-2 mb-3">
        <div className="grid grid-cols-6 gap-2 text-[10px] font-mono text-on-surface-variant text-center font-medium">
          {timelineDates.map((date, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <span>{date}</span>
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-outline/40" />
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Gantt Track */}
      <div className="space-y-2 overflow-x-auto pb-1">
        {phases.map((phase) => (
          <div
            key={phase.id}
            className={`rounded border p-2.5 transition-colors ${phase.colorClass}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={`text-xs font-semibold truncate ${phase.textClass}`}>
                  {phase.name}
                </p>
                <p className="text-[11px] text-on-surface-variant mt-0.5 truncate max-w-sm">
                  {phase.subtitle}
                </p>
              </div>

              {/* Members */}
              <div className="flex -space-x-1 shrink-0">
                {phase.members.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white ring-1 ring-surface-container-lowest ${
                      m.color || "bg-primary"
                    }`}
                    title={m.name}
                  >
                    {m.initials?.slice(0, 1) || "U"}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
