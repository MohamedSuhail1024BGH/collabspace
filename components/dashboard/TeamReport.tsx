"use client";

type TeamMemberMinimal = {
  name: string;
  role: string;
  initials?: string;
  color?: string;
  assigned?: number;
  completed?: number;
  completedPct?: number;
};

export function TeamReport({ team, visible = true }: { team: TeamMemberMinimal[]; visible?: boolean }) {
  if (!visible) return null;

  // Render each team member's performance from the provided period-specific data
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/20">
      <h3 className="mb-3 text-lg font-semibold text-white">Team performance</h3>

      <div className="space-y-3">
        {team.map((m) => (
          <div key={m.name} className="flex items-center justify-between gap-3 rounded-2xl border border-white/6 bg-slate-950/50 p-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-medium text-white ${m.color ?? "bg-slate-700"}`}>
                {m.initials ?? m.name.split(" ").map((s) => s[0]).slice(0,2).join("")}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{m.name}</p>
                <p className="text-xs text-slate-400">{m.role}</p>
              </div>
            </div>

            <div className="w-36">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300">Assigned</span>
                <span className="text-sm font-medium text-white">{m.assigned}</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-slate-800">
                <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${m.completedPct}%` }} />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                <span>{m.completed} done</span>
                <span>{m.completedPct}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
