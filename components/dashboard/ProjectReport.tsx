"use client";

import type { ProjectPerformance } from "@/data/mock-data";

export function ProjectReport({ projects, visible = true }: { projects: ProjectPerformance[]; visible?: boolean }) {
  if (!visible) return null;

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Project performance</h3>
        <p className="text-sm text-slate-300">Overview of active projects and progress</p>
      </div>

      <div className="space-y-4">
        {projects.length > 0 ? (
          projects.map((p) => (
            <div key={p.id} className="rounded-2xl border border-white/6 bg-slate-950/50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white">{p.name}</p>
                  <p className="mt-1 text-xs text-slate-300">Owner: {p.owner} • Status: {p.status} • Due: {p.due}</p>
                </div>

                <div className="w-40">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-slate-300">Progress</span>
                    <span className="text-sm font-medium text-white">{p.progress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${p.progress}%` }} />
                  </div>
                  <div className="mt-3 text-xs text-slate-400">Tasks completed: {p.tasksCompleted} • Total: {p.totalTasks}</div>
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
