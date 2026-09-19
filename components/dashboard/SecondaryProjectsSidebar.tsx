"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

  // Group projects by status
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
      className="w-60 shrink-0 bg-surface-container-low border-r border-outline/20 flex flex-col h-[calc(100vh-3.5rem)] sticky top-14 select-none custom-scrollbar hidden lg:flex"
    >
      {/* Header */}
      <div className="p-3 border-b border-outline/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold tracking-tight text-on-surface">My Projects</h2>
          <span className="font-mono text-[10px] text-on-surface-variant px-1.5 py-0.5 rounded bg-surface-container-high">
            {projects.length}
          </span>
        </div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-[11px] font-mono text-primary hover:underline group"
          title="All projects"
        >
          <span>View all</span>
          <svg className="w-3 h-3 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Search Input */}
      <div className="p-2.5 border-b border-outline/10">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-on-surface-variant"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full rounded bg-surface-container-lowest border border-outline/20 py-1.5 pl-8 pr-7 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary font-body-sm transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-2 p-0.5 text-on-surface-variant hover:text-on-surface rounded"
              aria-label="Clear search"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Project Lists Accordion */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
        {/* Ongoing */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection("ongoing")}
            className="flex w-full items-center justify-between py-1 text-[11px] font-mono text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              Ongoing
              <span className="rounded bg-surface-container-high px-1 text-[10px]">
                {ongoingProjects.length}
              </span>
            </span>
            <svg
              className={`h-3 w-3 transition-transform text-on-surface-variant ${
                expandedSections.ongoing ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.ongoing && (
            <div className="mt-1 space-y-1">
              {ongoingProjects.length > 0 ? (
                ongoingProjects.map((project) => {
                  const isActive =
                    activeProjectId === project.id ||
                    pathname === `/projects/${project.id}`;

                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className={`group flex flex-col gap-1 rounded p-2 text-xs transition-colors border ${
                        isActive
                          ? "bg-surface-container-high border-primary/40 text-on-surface"
                          : "bg-surface-container-lowest/50 border-outline/10 text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate font-medium text-xs pr-1 group-hover:text-primary transition-colors">
                          {project.name}
                        </span>
                        <span className="text-[10px] font-mono text-on-surface-variant shrink-0">
                          {project.progress}%
                        </span>
                      </div>
                      <div className="h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
                        <div
                          className="h-full bg-secondary rounded-full"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </Link>
                  );
                })
              ) : (
                <p className="text-[10px] font-mono text-on-surface-variant/70 italic px-2 py-1">
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
            className="flex w-full items-center justify-between py-1 text-[11px] font-mono text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
              Upcoming
              <span className="rounded bg-surface-container-high px-1 text-[10px]">
                {upcomingProjects.length}
              </span>
            </span>
            <svg
              className={`h-3 w-3 transition-transform text-on-surface-variant ${
                expandedSections.upcoming ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.upcoming && (
            <div className="mt-1 space-y-1">
              {upcomingProjects.length > 0 ? (
                upcomingProjects.map((project) => {
                  const isActive =
                    activeProjectId === project.id ||
                    pathname === `/projects/${project.id}`;

                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className={`group flex items-center justify-between rounded p-2 text-xs transition-colors border ${
                        isActive
                          ? "bg-surface-container-high border-primary/40 text-on-surface"
                          : "bg-surface-container-lowest/50 border-outline/10 text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      <span className="truncate font-medium text-xs pr-1 group-hover:text-primary transition-colors">
                        {project.name}
                      </span>
                      <span className="text-[10px] font-mono text-tertiary shrink-0">
                        {project.status}
                      </span>
                    </Link>
                  );
                })
              ) : (
                <p className="text-[10px] font-mono text-on-surface-variant/70 italic px-2 py-1">
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
            className="flex w-full items-center justify-between py-1 text-[11px] font-mono text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Finished
              <span className="rounded bg-surface-container-high px-1 text-[10px]">
                {finishedProjects.length}
              </span>
            </span>
            <svg
              className={`h-3 w-3 transition-transform text-on-surface-variant ${
                expandedSections.finished ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.finished && (
            <div className="mt-1 space-y-1">
              {finishedProjects.length > 0 ? (
                finishedProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between rounded p-2 text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-outline/10 bg-surface-container-lowest/30 transition-colors"
                  >
                    <span className="truncate line-through opacity-75">{project.name}</span>
                    <span className="text-[10px] font-mono text-secondary font-medium">100%</span>
                  </Link>
                ))
              ) : (
                <p className="text-[10px] font-mono text-on-surface-variant/70 italic px-2 py-1">
                  No finished projects
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer telemetry */}
      <div className="p-3 border-t border-outline/10 bg-surface-container-lowest flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
        <span>Active: {ongoingProjects.length}</span>
        <span className="text-secondary font-medium">Synced</span>
      </div>
    </aside>
  );
}

