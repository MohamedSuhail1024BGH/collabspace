import { projectDirectory, reportCards } from "@/data/mock-data";
import { StatCard } from "@/components/dashboard/StatCard";

export default function ProjectsPage() {
  return (
    <>
      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {reportCards.slice(0, 4).map((report) => (
          <StatCard key={report.title} label={report.title} value={report.value} change={report.trend} />
        ))}
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Project portfolio</h3>
          <button type="button" className="text-sm text-violet-300 hover:text-violet-200">
            Filter
          </button>
        </div>

        <div className="space-y-4">
          {projectDirectory.map((project) => (
            <div key={project.name} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-medium text-white">{project.name}</p>
                  <p className="mt-1 text-sm text-slate-400">Owner: {project.owner}</p>
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                  {project.status}
                </span>
              </div>

              <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                <span>Progress</span>
                <span>{project.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                  style={{ width: `${project.progress}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
                <span>Due {project.due}</span>
                <span>Portfolio</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
