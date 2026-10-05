"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Search, X, ChevronDown, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProjectSidebarItem = {
  id: string;
  name: string;
  status: string;
  progress: number;
  teamMembers?: { id?: string; name: string; initials?: string; color?: string }[];
};

export function SecondaryProjectsSidebar({
  projects = [],
  activeProjectId,
  isOpen = true,
}: {
  projects: ProjectSidebarItem[];
  activeProjectId?: string;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState({
    ongoing: true,
    upcoming: true,
    finished: false,
  });

  const toggleSection = (section: "ongoing" | "upcoming" | "finished") => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    return projects.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [projects, searchQuery]);

  const ongoingProjects = useMemo(
    () =>
      filteredProjects.filter(
        (p) =>
          p.status === "In Progress" ||
          p.status === "Planning" ||
          (p.progress > 0 && p.progress < 100)
      ),
    [filteredProjects]
  );

  const upcomingProjects = useMemo(
    () =>
      filteredProjects.filter(
        (p) =>
          p.status === "Upcoming" ||
          (p.progress === 0 && p.status !== "Completed")
      ),
    [filteredProjects]
  );

  const finishedProjects = useMemo(
    () =>
      filteredProjects.filter(
        (p) => p.status === "Completed" || p.progress === 100
      ),
    [filteredProjects]
  );

  if (!isOpen) return null;

  return (
    <aside
      data-testid="secondary-projects-sidebar"
      className="w-60 shrink-0 bg-card border-r border-border flex flex-col h-[calc(100vh-3.5rem)] sticky top-14 select-none hidden lg:flex"
    >
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold tracking-tight text-foreground">My Projects</h2>
          <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
            {projects.length}
          </Badge>
        </div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline group"
          title="All projects"
        >
          <span>View all</span>
          <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Search Input */}
      <div className="p-2.5 border-b border-border">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="h-8 pl-8 pr-7 text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground rounded"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Project Lists Accordion */}
      <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-3">
        {/* Ongoing */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection("ongoing")}
            className="flex w-full items-center justify-between py-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <span className="size-1.5 rounded-full bg-primary" />
              Ongoing
              <span className="rounded bg-secondary px-1 text-[10px] font-mono">
                {ongoingProjects.length}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform text-muted-foreground",
                expandedSections.ongoing ? "rotate-180" : ""
              )}
            />
          </button>

          {expandedSections.ongoing && (
            <div className="mt-1 flex flex-col gap-1">
              {ongoingProjects.length > 0 ? (
                ongoingProjects.map((project) => {
                  const isActive =
                    activeProjectId === project.id ||
                    pathname === `/projects/${project.id}`;

                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className={cn(
                        "group flex flex-col gap-1.5 rounded-lg p-2 text-xs transition-colors border",
                        isActive
                          ? "bg-secondary border-primary/40 text-foreground font-semibold"
                          : "bg-card/50 border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate text-xs pr-1 group-hover:text-primary transition-colors">
                          {project.name}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                          {project.progress}%
                        </span>
                      </div>
                      <Progress value={project.progress} className="h-1" />
                    </Link>
                  );
                })
              ) : (
                <p className="text-[10px] font-mono text-muted-foreground/70 italic px-2 py-1">
                  No ongoing projects
                </p>
              )}
            </div>
          )}
        </div>

        {/* Upcoming */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection("upcoming")}
            className="flex w-full items-center justify-between py-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <span className="size-1.5 rounded-full bg-amber-500" />
              Upcoming
              <span className="rounded bg-secondary px-1 text-[10px] font-mono">
                {upcomingProjects.length}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform text-muted-foreground",
                expandedSections.upcoming ? "rotate-180" : ""
              )}
            />
          </button>

          {expandedSections.upcoming && (
            <div className="mt-1 flex flex-col gap-1">
              {upcomingProjects.length > 0 ? (
                upcomingProjects.map((project) => {
                  const isActive =
                    activeProjectId === project.id ||
                    pathname === `/projects/${project.id}`;

                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className={cn(
                        "group flex items-center justify-between rounded-lg p-2 text-xs transition-colors border",
                        isActive
                          ? "bg-secondary border-primary/40 text-foreground font-semibold"
                          : "bg-card/50 border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      )}
                    >
                      <span className="truncate text-xs pr-1 group-hover:text-primary transition-colors">
                        {project.name}
                      </span>
                      <span className="text-[10px] font-mono text-amber-500 shrink-0">
                        {project.status}
                      </span>
                    </Link>
                  );
                })
              ) : (
                <p className="text-[10px] font-mono text-muted-foreground/70 italic px-2 py-1">
                  No upcoming projects
                </p>
              )}
            </div>
          )}
        </div>

        {/* Finished */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection("finished")}
            className="flex w-full items-center justify-between py-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Finished
              <span className="rounded bg-secondary px-1 text-[10px] font-mono">
                {finishedProjects.length}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform text-muted-foreground",
                expandedSections.finished ? "rotate-180" : ""
              )}
            />
          </button>

          {expandedSections.finished && (
            <div className="mt-1 flex flex-col gap-1">
              {finishedProjects.length > 0 ? (
                finishedProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between rounded-lg p-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/40 bg-card/40 transition-colors"
                  >
                    <span className="truncate line-through opacity-75">{project.name}</span>
                    <span className="text-[10px] font-mono text-emerald-500 font-medium">100%</span>
                  </Link>
                ))
              ) : (
                <p className="text-[10px] font-mono text-muted-foreground/70 italic px-2 py-1">
                  No finished projects
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer telemetry */}
      <div className="p-3 border-t border-border bg-secondary/30 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
        <span>Active: {ongoingProjects.length}</span>
        <span className="text-emerald-500 font-medium">Synced</span>
        <span>Total: {projects.length}</span>
      </div>
    </aside>
  );
}
