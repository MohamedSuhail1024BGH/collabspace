"use client";

import Link from "next/link";
import type { ProjectPerformance } from "@/data/mock-data";

const statusStyles: Record<string, string> = {
  "In Progress": "border-primary/30 bg-primary/10 text-primary",
  "Completed": "border-secondary/30 bg-secondary-container/20 text-secondary",
  "Planning": "border-tertiary/30 bg-tertiary-container/20 text-tertiary",
  "On Hold": "border-outline-variant/30 bg-surface-lowest text-on-surface-variant",
};

export function ProjectReport({
  projects,
  visible = true,
}: {
  projects: ProjectPerformance[];
  visible?: boolean;
}) {
  if (!visible) return null;

  return (
    <section className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-4 sm:p-5 shadow-xs">
      <div className="mb-3.5 flex items-center justify-between pb-2.5 border-b border-outline-variant/15">
        <div>
          <h3 className="text-base font-semibold text-on-surface font-headline-sm">Project performance</h3>
          <p className="text-xs text-on-surface-variant mt-0.5 font-body-sm">
            Overview of active projects, milestone velocity, and progress
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {projects.length > 0 ? (
          projects.map((p) => (
            <div
              key={p.id}
              data-testid="project-report-item"
              className="group rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4 transition hover:border-primary/40 hover:bg-surface-high shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/projects/${p.id}`}
                      className="text-sm font-medium text-on-surface transition hover:text-primary flex items-center gap-1.5"
                    >
                      <span>{p.name}</span>
                      <svg
                        className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </Link>
                    <span
                      className={`inline-block rounded border px-1.5 py-0.2 text-[10px] font-medium ${
                        statusStyles[p.status] || "border-outline/20 bg-surface-container text-on-surface-variant"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-on-surface-variant font-body-sm">
                    Owner: <span className="text-on-surface">{p.owner}</span> • Due:{" "}
                    <span className="text-on-surface">{p.due}</span>
                  </p>
                </div>

                <div className="w-full sm:w-44">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant font-body-sm">Progress</span>
                    <span className="font-semibold text-on-surface font-label-sm">{p.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-surface-container-highest overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${Math.min(Math.max(p.progress, 0), 100)}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-on-surface-variant font-label-sm">
                    <span>Tasks: {p.tasksCompleted}/{p.totalTasks} done</span>
                    <span>
                      {p.totalTasks > 0
                        ? `${Math.round((p.tasksCompleted / p.totalTasks) * 100)}%`
                        : "0%"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div
            data-testid="no-project-reports"
            className="rounded border border-dashed border-outline/20 bg-surface-container-lowest p-6 text-center text-xs text-on-surface-variant"
          >
            No Project Reports here
          </div>
        )}
      </div>
    </section>
  );
}
