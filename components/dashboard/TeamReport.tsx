import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Users } from "lucide-react";

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

  return (
    <Card className="p-4 sm:p-5 border-border/60 shadow-xs">
      <div className="mb-4 flex items-center justify-between pb-3 border-b border-border/60">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <span>Team performance</span>
        </h3>
      </div>

      {team.length > 0 ? (
        <div className="space-y-2.5">
          {team.map((m) => {
            const assigned = m.assigned ?? 0;
            const completedPct = assigned > 0 ? (m.completedPct ?? 0) : 0;
            return (
              <Card
                key={m.name}
                className="flex items-center justify-between gap-3 p-3 bg-muted/10 border-border/50 hover:bg-muted/20 transition shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <UserAvatar
                    avatar={m.avatar}
                    name={m.name}
                    size="sm"
                    className="h-8 w-8"
                  />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{m.name}</p>
                    <p className="text-[11px] text-muted-foreground capitalize font-mono">{m.role}</p>
                  </div>
                </div>

                <div className="w-32 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-muted-foreground">Assigned</span>
                    <span className="text-xs font-semibold text-foreground font-mono">{assigned}</span>
                  </div>
                  <Progress value={completedPct} className="h-1.5" />
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                    <span>{m.completed ?? 0} done</span>
                    <span className="font-semibold text-foreground">{completedPct}%</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div
          data-testid="no-team-reports"
          className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground font-mono"
        >
          No Team Members here
        </div>
      )}
    </Card>
  );
}
