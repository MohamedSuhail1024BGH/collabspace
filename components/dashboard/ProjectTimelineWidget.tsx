"use client";

import { useMemo } from "react";
import Link from "next/link";

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
  const hasTasks = tasks && tasks.length > 0;

  // Generate milestone timeline phases dynamically when tasks exist
  const phases = useMemo<TimelinePhase[]>(() => {
    if (!hasTasks) return [];

    const now = new Date();
    const formatShortDate = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const d0 = new Date(now);
    d0.setDate(now.getDate() - 7);
    const d1 = new Date(now);
    const d2 = new Date(now);
    d2.setDate(now.getDate() + 7);
    const d3 = new Date(now);
    d3.setDate(now.getDate() + 14);
    const d4 = new Date(now);
    d4.setDate(now.getDate() + 21);

    return [
      {
        id: "p1",
        name: "Planning & Scoping",
        subtitle: "Define goals, Research, Scope outline",
        startDate: formatShortDate(d0),
        endDate: formatShortDate(d1),
        colorClass: "bg-tertiary-container/15 border-tertiary/30",
        textClass: "text-tertiary",
        members: teamMembers.slice(0, 3),
      },
      {
        id: "p2",
        name: "Design & UX Prototyping",
        subtitle: "Wireframes, UI - UX, Revisions",
        startDate: formatShortDate(d1),
        endDate: formatShortDate(d2),
        colorClass: "bg-primary-container/15 border-primary/30",
        textClass: "text-primary",
        members: teamMembers.slice(1, 4),
      },
      {
        id: "p3",
        name: "Core Development",
        subtitle: "Front End, Back End, Integration",
        startDate: formatShortDate(d2),
        endDate: formatShortDate(d3),
        colorClass: "bg-surface-container-high border-outline/30",
        textClass: "text-on-surface",
        members: teamMembers.slice(0, 2),
      },
      {
        id: "p4",
        name: "Testing & Bug Fixes",
        subtitle: "Unit tests, E2E QA, Regression",
        startDate: formatShortDate(d3),
        endDate: formatShortDate(d4),
        colorClass: "bg-secondary-container/15 border-secondary/30",
        textClass: "text-secondary",
        members: teamMembers.slice(2, 5),
      },
    ];
  }, [hasTasks, teamMembers]);

  const timelineDateMarkers = useMemo(() => {
    const now = new Date();
    const markers: string[] = [];
    for (let i = -1; i <= 4; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i * 7);
      markers.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
    }
    return markers;
  }, []);

  return (
    <div
      data-testid="project-timeline-widget"
      className="rounded-lg bg-surface-container-low border border-outline/20 p-3 sm:p-4 flex flex-col text-on-surface h-full w-full max-w-full min-w-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5 sm:mb-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-on-surface">Project timeline</h3>
          <p className="text-[10px] sm:text-[11px] text-on-surface-variant font-mono">
            Sprint stages and milestone tracking
          </p>
        </div>
        <Link href="/tasks" className="text-xs text-primary font-mono hover:underline">
          Details &rsaquo;
        </Link>
      </div>

      {hasTasks ? (
        <>
          {/* Date Header Markers (desktop/tablet only to eliminate mobile horizontal expansion) */}
          <div className="hidden sm:block border-b border-outline/10 pb-2 mb-3">
            <div className="grid grid-cols-6 gap-2 text-[10px] font-mono text-on-surface-variant text-center font-medium">
              {timelineDateMarkers.map((date, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <span className="truncate">{date}</span>
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-outline/40" />
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Gantt Track */}
          <div className="space-y-1.5 sm:space-y-2 min-w-0 w-full">
            {phases.map((phase) => (
              <div
                key={phase.id}
                className={`rounded-lg border p-2 sm:p-2.5 transition-colors ${phase.colorClass}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`text-xs font-semibold truncate ${phase.textClass}`}>
                        {phase.name}
                      </p>
                      <span className="text-[9px] sm:text-[10px] font-mono text-on-surface-variant px-1.5 py-0.5 rounded bg-surface-container-highest/60 shrink-0">
                        {phase.startDate} – {phase.endDate}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-on-surface-variant mt-0.5 truncate">
                      {phase.subtitle}
                    </p>
                  </div>

                  {/* Members */}
                  {phase.members.length > 0 && (
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
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="my-auto py-6 sm:py-8 flex flex-col items-center justify-center text-center px-4">
          <div className="h-10 w-10 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant mb-2.5 border border-outline-variant/15">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-on-surface font-headline-sm">No project timeline yet</p>
          <p className="text-[10px] sm:text-[11px] font-mono text-on-surface-variant max-w-xs mt-1">
            Create tasks with due dates to visualize milestone stages and sprint delivery.
          </p>
          <Link
            href="/tasks"
            className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-high border border-outline-variant/25 text-xs font-mono text-primary transition shadow-xs active:scale-95"
          >
            <span>+ Create a task</span>
          </Link>
        </div>
      )}
    </div>
  );
}
