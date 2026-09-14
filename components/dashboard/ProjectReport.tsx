"use client";

import Link from "next/link";
import type { ProjectPerformance } from "@/data/mock-data";

const statusStyles: Record<string, string> = {
  "In Progress": "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  "Completed": "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  "Planning": "border-amber-500/30 bg-amber-500/10 text-amber-300",
  "On Hold": "border-slate-500/30 bg-slate-500/10 text-slate-400",
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
    <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Project performance</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Overview of active projects, milestone velocity, and progress
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {projects.length > 0 ? (
          projects.map((p) => (
            <div
              key={p.id}
              data-testid="project-report-item"
              className="group rounded-2xl border border-white/10 bg-slate-950/50 p-4 transition hover:border-violet-500/30 hover:bg-slate-950/70"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2.5">
                    <Link
                      href={`/projects/${p.id}`}
                      className="text-base font-medium text-white transition hover:text-violet-300 flex items-center gap-1.5"
                    >
                      <span>{p.name}</span>
                      <svg
                        className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100 text-violet-400"
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
                      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        statusStyles[p.status] || "border-slate-700 bg-slate-800 text-slate-300"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    Owner: <span className="text-slate-300">{p.owner}</span> • Due:{" "}
                    <span className="text-slate-300">{p.due}</span>
                  </p>
                </div>

                <div className="w-full sm:w-48">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Progress</span>
                    <span className="font-semibold text-white">{p.progress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-all duration-300"
                      style={{ width: `${Math.min(Math.max(p.progress, 0), 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
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
            className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-6 text-center text-sm text-slate-400"
          >
            No Project Reports here
          </div>
        )}
      </div>
    </section>
  );
}
