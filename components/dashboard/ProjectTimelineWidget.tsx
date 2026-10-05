"use client";

import { useMemo } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/ui/UserAvatar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronRight } from "lucide-react";

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
  badgeVariant: "default" | "secondary" | "outline" | "info" | "success" | "warning";
  members: { name: string; initials: string; color: string; avatar?: string | null }[];
};

export function ProjectTimelineWidget({
  tasks = [],
  teamMembers = [],
}: {
  tasks?: TimelineTask[];
  teamMembers?: { name: string; initials: string; color: string; avatar?: string | null }[];
}) {
  const hasTasks = tasks && tasks.length > 0;

  const phases = useMemo<TimelinePhase[]>(() => {
    if (!hasTasks) return [];

    const formatShortDate = (d: Date) => {
      if (isNaN(d.getTime())) return "TBD";
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    const statusGroups: Record<string, TimelineTask[]> = {};
    for (const task of tasks) {
      const groupKey = task.status || "In progress";
      if (!statusGroups[groupKey]) statusGroups[groupKey] = [];
      statusGroups[groupKey].push(task);
    }

    const stageConfig: Record<string, { badgeVariant: TimelinePhase["badgeVariant"] }> = {
      "Not started": { badgeVariant: "warning" },
      "In progress": { badgeVariant: "default" },
      "Review": { badgeVariant: "info" },
      "Completed": { badgeVariant: "success" },
      "Blocked": { badgeVariant: "outline" },
      "Pending": { badgeVariant: "secondary" },
    };

    return Object.entries(statusGroups).map(([statusName, stageTasks], idx) => {
      const taskTitles = stageTasks.slice(0, 3).map((t) => t.title).join(", ");
      const config = stageConfig[statusName] || { badgeVariant: "default" };

      const assignees = Array.from(new Set(stageTasks.map((t) => t.assignee).filter(Boolean)));
      const members = assignees.map((assigneeName) => {
        const found = teamMembers.find((m) => m.name.toLowerCase() === assigneeName.toLowerCase());
        return found || {
          name: assigneeName,
          initials: assigneeName.slice(0, 2).toUpperCase(),
          color: "bg-primary",
          avatar: null,
        };
      });

      const validDues = stageTasks
        .map((t) => new Date(t.due))
        .filter((d) => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());

      const startDate = validDues.length > 0 ? formatShortDate(validDues[0]) : formatShortDate(new Date());
      const endDate = validDues.length > 0 ? formatShortDate(validDues[validDues.length - 1]) : formatShortDate(new Date());

      return {
        id: `phase-${idx}`,
        name: `${statusName} Stage`,
        subtitle: `${stageTasks.length} work item${stageTasks.length > 1 ? "s" : ""}: ${taskTitles}`,
        startDate,
        endDate,
        badgeVariant: config.badgeVariant,
        members: members.slice(0, 4),
      };
    });
  }, [hasTasks, tasks, teamMembers]);

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
    <Card data-testid="project-timeline-widget" className="flex flex-col h-full w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base font-semibold">Project Timeline</CardTitle>
          <CardDescription className="text-xs">
            Sprint stages and milestone delivery schedule
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild className="gap-1 text-xs text-primary">
          <Link href="/tasks">
            Details
            <ChevronRight className="size-3.5" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col pt-2">
        {hasTasks ? (
          <div className="flex flex-col gap-3">
            {/* Desktop timeline markers */}
            <div className="hidden sm:grid grid-cols-6 gap-2 border-b border-border pb-2.5 text-center">
              {timelineDateMarkers.map((date, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <span className="text-[11px] font-mono text-muted-foreground">{date}</span>
                  <span className="mt-1 size-1.5 rounded-full bg-border" />
                </div>
              ))}
            </div>

            {/* Phases list */}
            <div className="flex flex-col gap-2">
              {phases.map((phase) => (
                <div
                  key={phase.id}
                  className="rounded-lg border border-border bg-card/60 p-3 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                          {phase.name}
                        </p>
                        <Badge variant={phase.badgeVariant} className="text-[10px] font-mono">
                          {phase.startDate} – {phase.endDate}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {phase.subtitle}
                      </p>
                    </div>

                    {phase.members.length > 0 && (
                      <div className="flex -space-x-1.5 shrink-0">
                        {phase.members.map((m, idx) => (
                          <div key={idx} className="shrink-0 ring-2 ring-card rounded-full" title={m.name}>
                            <UserAvatar avatar={m.avatar} name={m.name} size="xs" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="my-auto py-8 flex flex-col items-center justify-center text-center px-4">
            <div className="size-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground mb-3">
              <Calendar className="size-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">No project timeline yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mt-1">
              Create tasks with due dates to visualize milestone stages and sprint delivery.
            </p>
            <Button variant="outline" size="sm" asChild className="mt-4">
              <Link href="/tasks">+ Create a task</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
