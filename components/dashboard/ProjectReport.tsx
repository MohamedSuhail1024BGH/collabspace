"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FolderKanban, ArrowUpRight } from "lucide-react";
import type { ProjectPerformance } from "@/data/mock-data";

export function ProjectReport({
  projects,
  visible = true,
}: {
  projects: ProjectPerformance[];
  visible?: boolean;
}) {
  if (!visible) return null;

  return (
    <Card className="p-4 sm:p-5 border-border/60 shadow-xs">
      <div className="mb-4 flex items-center justify-between pb-3 border-b border-border/60">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <FolderKanban className="size-4 text-primary" />
            <span>Project performance</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Overview of active projects, milestone velocity, and progress
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {projects.length > 0 ? (
          projects.map((p) => (
            <Card
              key={p.id}
              data-testid="project-report-item"
              className="group p-4 bg-muted/10 border-border/50 hover:bg-muted/20 transition shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/projects/${p.id}`}
                      className="text-sm font-semibold text-foreground transition hover:text-primary flex items-center gap-1.5"
                    >
                      <span>{p.name}</span>
                      <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                    </Link>
                    <Badge variant="outline" className="text-[10px] font-mono bg-background">
                      {p.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    Owner: <span className="text-foreground">{p.owner}</span> • Due:{" "}
                    <span className="text-foreground">{p.due}</span>
                  </p>
                </div>

                <div className="w-full sm:w-48 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Progress</span>
                    <span className="font-semibold text-foreground font-mono">{p.progress}%</span>
                  </div>
                  <Progress value={Math.min(Math.max(p.progress, 0), 100)} className="h-2" />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                    <span>Tasks: {p.tasksCompleted}/{p.totalTasks} done</span>
                    <span>
                      {p.totalTasks > 0
                        ? `${Math.round((p.tasksCompleted / p.totalTasks) * 100)}%`
                        : "0%"}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground font-mono">
            No projects available for performance analysis.
          </div>
        )}
      </div>
    </Card>
  );
}
