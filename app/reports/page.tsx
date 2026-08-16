import { reportCards } from "@/data/mock-data";
import { StatCard } from "@/components/dashboard/StatCard";

export default function ReportsPage() {
  return (
    <>
      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {reportCards.map((report) => (
          <StatCard key={report.title} label={report.title} value={report.value} change={report.trend} />
        ))}
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Executive summary</h3>
          <button type="button" className="text-sm text-violet-300 hover:text-violet-200">
            Export
          </button>
        </div>

        <div className="space-y-4">
          {reportCards.map((report) => (
            <div key={report.title} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="mb-2 flex items-center justify-between gap-4">
                <p className="font-medium text-white">{report.title}</p>
                <span className="text-xs text-emerald-300">{report.trend}</span>
              </div>
              <p className="text-sm text-slate-300">{report.summary}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
