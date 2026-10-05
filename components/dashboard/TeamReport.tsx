import { UserAvatar } from "@/components/ui/UserAvatar";

type TeamMemberMinimal = {
  name: string;
  role: string;
  initials?: string;
  avatar?: string | null;
  color?: string;
  assigned?: number;
  completed?: number;
  completedPct?: number;
};

export function TeamReport({ team, visible = true }: { team: TeamMemberMinimal[]; visible?: boolean }) {
  if (!visible) return null;

  // Render each team member's performance from the provided period-specific data
  return (
    <section className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-4 sm:p-5 shadow-xs">
      <h3 className="mb-3 text-base font-semibold text-on-surface font-headline-sm pb-2 border-b border-outline-variant/15">Team performance</h3>

      {team.length > 0 ? (
        <div className="space-y-2.5">
          {team.map((m) => {
            const assigned = m.assigned ?? 0;
            const completedPct = assigned > 0 ? (m.completedPct ?? 0) : 0;
            return (
              <div key={m.name} className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-3 hover:bg-surface-high/60 transition shadow-xs">
                <div className="flex items-center gap-2.5">
                  <UserAvatar
                    avatar={m.avatar}
                    name={m.name}
                    size="sm"
                    className="h-8 w-8"
                  />
                  <div>
                    <p className="text-xs font-medium text-on-surface">{m.name}</p>
                    <p className="text-[11px] text-on-surface-variant font-body-sm">{m.role}</p>
                  </div>
                </div>

                <div className="w-32">
                  <div className="flex items-center justify-between font-label-sm">
                    <span className="text-[11px] text-on-surface-variant">Assigned</span>
                    <span className="text-xs font-medium text-on-surface">{assigned}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-surface-container-highest overflow-hidden">
                    <div className="h-full rounded-full bg-secondary" style={{ width: `${completedPct}%` }} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-on-surface-variant font-label-sm">
                    <span>{m.completed ?? 0} done</span>
                    <span>{completedPct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          data-testid="no-team-reports"
          className="rounded border border-dashed border-outline/20 bg-surface-container-lowest p-6 text-center text-xs text-on-surface-variant"
        >
          No Team Members here
        </div>
      )}
    </section>
  );
}
