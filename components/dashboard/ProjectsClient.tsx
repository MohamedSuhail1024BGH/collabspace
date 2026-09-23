"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  createProjectAction,
  deleteProjectAction,
  updateProjectAction,
} from "@/app/actions";
import { StatCard } from "@/components/dashboard/StatCard";
import type { Project } from "@/data/mock-data";
import type { FullProject } from "@/lib/db/queries";

type WorkspaceMemberItem = {
  membershipId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    username: string | null;
    email: string;
    avatar: string | null;
  };
};

function toProject(p: FullProject): Project {
  return {
    id: p.id,
    name: p.name,
    progress: p.progress,
    due: p.due,
    owner: p.owner,
    status: p.status,
    overview: p.overview,
    teamMembers: p.teamMembers,
    recentActivity: p.recentActivity,
    tasks: p.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      assignee: t.assignee,
      priority: t.priority as "High" | "Medium" | "Low",
      status: t.status,
      due: t.due,
    })),
  };
}

export function ProjectsClient({
  initialProjects,
  workspaceMembers = [],
  currentUser,
  userRole = "member",
}: {
  initialProjects: FullProject[];
  workspaceMembers?: WorkspaceMemberItem[];
  currentUser?: { id: string; name: string; email: string };
  userRole?: string;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(() => initialProjects.map(toProject));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjects[0]?.id ?? "");
  const [showNewProject, setShowNewProject] = useState(false);
  const [draftProject, setDraftProject] = useState<Project | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isViewer = userRole === "viewer";

  const [newProject, setNewProject] = useState(() => ({
    name: "",
    ownerUserId: currentUser?.id ?? workspaceMembers[0]?.user.id ?? "",
    ownerName: currentUser?.name ?? workspaceMembers[0]?.user.name ?? "Unassigned",
    status: "Planning",
    due: "Next week",
    progress: 0,
    overview: "Add project context, timeline, and key milestones for the team.",
  }));
  const [, startTransition] = useTransition();

  const liveReportCards = useMemo(() => {
    const total = projects.length;
    const inProgress = projects.filter(
      (p) => p.status === "In progress" || p.status === "Planning" || p.status === "On track"
    ).length;
    const completed = projects.filter((p) => p.status === "Completed" || p.status === "Ready").length;
    const avgProgress =
      total > 0 ? Math.round(projects.reduce((acc, p) => acc + (Number(p.progress) || 0), 0) / total) : 0;

    return [
      { title: "Total projects", value: String(total), trend: "Active workspace" },
      { title: "In progress", value: String(inProgress), trend: "Underway" },
      { title: "Completed", value: String(completed), trend: "Delivered" },
      { title: "Average progress", value: `${avgProgress}%`, trend: "Across portfolio" },
    ];
  }, [projects]);

  const statusOptions = useMemo(
    () => ["All", ...Array.from(new Set(projects.map((project) => project.status)))],
    [projects],
  );

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesQuery = query.length === 0 || project.name.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "All" || project.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? filteredProjects[0] ?? null;

  const updateSelectedProject = (updates: Partial<Project>) => {
    if (!draftProject) return;
    setDraftProject({ ...draftProject, ...updates });
  };

  const handleCreateProject = async () => {
    const projectName = newProject.name.trim() || "Untitled project";
    const ownerName = newProject.ownerName || currentUser?.name || "Unassigned";

    setIsSubmitting(true);
    const res = await createProjectAction({
      name: projectName,
      owner: ownerName,
      ownerUserId: newProject.ownerUserId,
      status: newProject.status || "Planning",
      due: newProject.due || "Next week",
      progress: Number(newProject.progress) || 0,
      overview: newProject.overview || "Add project context, timeline, and key milestones for the team.",
    });

    if (res.success && res.id) {
      const createdProject: Project = {
        id: res.id,
        name: projectName,
        progress: Number(newProject.progress) || 0,
        due: newProject.due || "Next week",
        owner: ownerName,
        status: newProject.status || "Planning",
        overview: newProject.overview || "Add project context, timeline, and key milestones for the team.",
        teamMembers: [
          { name: ownerName, role: "lead", initials: ownerName.slice(0, 2).toUpperCase() || "PO", color: "bg-primary" },
        ],
        recentActivity: [`${currentUser?.name || "User"} created project '${projectName}'.`],
        tasks: [],
      };

      setProjects((current) => [createdProject, ...current]);
      setSelectedProjectId(createdProject.id);
      setShowNewProject(false);
      setNewProject({
        name: "",
        ownerUserId: currentUser?.id ?? workspaceMembers[0]?.user.id ?? "",
        ownerName: currentUser?.name ?? workspaceMembers[0]?.user.name ?? "Unassigned",
        status: "Planning",
        due: "Next week",
        progress: 0,
        overview: "Add project context, timeline, and key milestones for the team.",
      });
      router.refresh();
    }
    setIsSubmitting(false);
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects((current) => {
      const remainingProjects = current.filter((project) => project.id !== projectId);
      if (selectedProjectId === projectId) {
        setSelectedProjectId(remainingProjects[0]?.id ?? "");
      }
      return remainingProjects;
    });

    if (draftProject?.id === projectId) {
      setDraftProject(null);
    }

    startTransition(async () => {
      await deleteProjectAction(projectId);
    });
  };

  const handleSaveProjectEdits = () => {
    if (!draftProject) return;

    const targetId = draftProject.id;
    const updatedData = {
      name: draftProject.name,
      owner: draftProject.owner,
      status: draftProject.status,
      due: draftProject.due,
      progress: Math.min(100, Math.max(0, Number(draftProject.progress) || 0)),
      overview: draftProject.overview,
    };

    setProjects((current) =>
      current.map((project) =>
        project.id === targetId
          ? {
              ...project,
              ...updatedData,
            }
          : project,
      ),
    );
    setDraftProject(null);

    startTransition(async () => {
      await updateProjectAction(targetId, updatedData);
    });
  };

  const renderProjectCard = (project: Project) => {
    const isSelected = selectedProject?.id === project.id;
    const isHighCapacity = project.progress >= 80;

    return (
      <div
        key={project.id}
        className={[
          "rounded-xl border p-4 transition-all text-left",
          isSelected
            ? "border-primary/50 bg-surface-high shadow-md ring-1 ring-primary/40"
            : "border-outline-variant/20 bg-surface-container hover:bg-surface-high hover:border-outline/40 shadow-xs",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() => setSelectedProjectId(project.id)}
          className="block w-full text-left cursor-pointer"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-[10px] text-primary tracking-wider uppercase font-semibold">
                  PRJ-{project.id.slice(-4).toUpperCase()}
                </span>
                <span className="rounded-md bg-surface-lowest border border-outline-variant/25 px-2 py-0.5 text-[10px] font-mono text-secondary flex items-center gap-1">
                  {(project.status === "In progress" || project.status === "On track") && (
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                  )}
                  <span>{project.status}</span>
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-on-surface hover:text-primary transition-colors font-headline-sm truncate">
                {project.name}
              </p>
              <p className="mt-0.5 text-xs text-on-surface-variant font-mono truncate">Owner: {project.owner}</p>
            </div>
            {project.teamMembers && project.teamMembers.length > 0 && (
              <div className="flex -space-x-1.5 shrink-0 pt-0.5">
                {project.teamMembers.slice(0, 3).map((m, idx) => (
                  <div
                    key={idx}
                    title={`${m.name} (${m.role})`}
                    className={`w-5 h-5 rounded-full text-[9px] font-mono font-bold flex items-center justify-center text-white ring-1 ring-surface-container ${m.color || "bg-primary"}`}
                  >
                    {m.initials || m.name.slice(0, 1)}
                  </div>
                ))}
                {project.teamMembers.length > 3 && (
                  <div className="w-5 h-5 rounded-full bg-surface-container-high text-primary font-mono text-[9px] flex items-center justify-center font-semibold ring-1 ring-surface-container">
                    +{project.teamMembers.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mb-1.5 flex items-center justify-between text-xs text-on-surface-variant">
            <span className="font-mono text-[11px]">Progress</span>
            <span
              className={`inline-flex items-center gap-1 font-mono text-[11px] ${
                isHighCapacity ? "text-tertiary font-semibold" : "text-secondary"
              }`}
            >
              <span>{project.progress}%</span>
              {isHighCapacity && (
                <svg className="w-3 h-3 text-tertiary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-lowest">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isHighCapacity ? "bg-tertiary" : "bg-secondary"
              }`}
              style={{ width: `${project.progress}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-on-surface-variant font-mono">
            <span className="rounded bg-surface-lowest px-1.5 py-0.5 border border-outline-variant/15 text-[10px]">
              Due {project.due}
            </span>
            <span className="text-[10px] text-on-surface-variant/60">Portfolio</span>
          </div>
        </button>

        <div className="mt-3 pt-2.5 border-t border-outline/10 flex items-center justify-between gap-2">
          <Link
            href={`/projects/${project.id}`}
            className="text-xs font-mono font-medium text-primary hover:underline flex items-center gap-1"
          >
            <span>Open details</span>
            <span>&rarr;</span>
          </Link>
          {!isViewer && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDraftProject({ ...project })}
                className="rounded bg-surface-container hover:bg-surface-container-highest px-2 py-1 text-xs font-mono text-on-surface transition"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDeleteProject(project.id)}
                className="rounded bg-error-container/20 hover:bg-error-container/30 px-2 py-1 text-xs font-mono text-error transition"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Metrics Row (2x2 Bento on Mobile, 4-col on Desktop) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {liveReportCards.map((report) => (
          <StatCard key={report.title} label={report.title} value={report.value} change={report.trend} />
        ))}
      </section>

      {/* Main Portfolio Grid */}
      <section className="grid gap-5 xl:grid-cols-[1.8fr_1fr]">
        <div className="rounded-xl bg-surface-container-low border border-outline-variant/20 p-3.5 sm:p-5 shadow-xs">
          <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pb-3 border-b border-outline-variant/15">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold tracking-tight text-on-surface font-headline-sm">Project portfolio</h1>
                <p className="text-[11px] font-mono text-on-surface-variant">Active initiatives and engineering deliverables</p>
              </div>
              {!isViewer && (
                <button
                  type="button"
                  onClick={() => setShowNewProject((current) => !current)}
                  className="sm:hidden rounded-lg bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-3 py-1.5 text-xs font-medium transition shadow-xs shrink-0"
                >
                  {showNewProject ? "Close" : "+ New"}
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="relative w-full sm:w-auto">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  type="search"
                  placeholder="Search projects..."
                  className="w-full sm:w-48 lg:w-56 rounded-lg bg-surface-lowest border border-outline-variant/25 px-3 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/50 focus:outline-none transition-all"
                />
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-lg bg-surface-lowest border border-outline-variant/25 px-3 py-1.5 text-xs text-on-surface focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/50 focus:outline-none font-mono transition-all"
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option} className="bg-surface-container-high text-on-surface">
                      {option}
                    </option>
                  ))}
                </select>
                {!isViewer && (
                  <button
                    type="button"
                    onClick={() => setShowNewProject((current) => !current)}
                    className="rounded-lg bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-3.5 py-1.5 text-xs font-medium transition shadow-xs whitespace-nowrap"
                  >
                    {showNewProject ? "Close" : "New project"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Filter Chips Carousel */}
          <div className="sm:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3 mb-2 -mx-1 px-1">
            {statusOptions.map((option) => {
              const count = option === "All" ? projects.length : projects.filter((p) => p.status === option).length;
              const isActive = statusFilter === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStatusFilter(option)}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? "bg-primary text-on-primary font-semibold shadow-xs"
                      : "bg-surface-lowest border border-outline-variant/25 text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-on-primary animate-pulse" />}
                  <span>{option}</span>
                  <span className={`text-[10px] ${isActive ? "text-on-primary/80" : "text-on-surface-variant/70"}`}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>

          {showNewProject && (
            <div className="mb-4 rounded bg-surface-container border border-primary/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-on-surface">Create new project</h2>
                <span className="text-[10px] font-mono text-primary bg-surface-container-high px-1.5 py-0.5 rounded">Draft</span>
              </div>

              <div className="grid gap-2.5 md:grid-cols-2">
                <input
                  value={newProject.name}
                  onChange={(event) => setNewProject((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Project name"
                  className="rounded bg-surface-container-lowest border border-outline/20 px-2.5 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none"
                />
                <select
                  data-testid="new-project-owner-select"
                  value={newProject.ownerUserId}
                  onChange={(event) => {
                    const selected = workspaceMembers.find((m) => m.user.id === event.target.value);
                    setNewProject((current) => ({
                      ...current,
                      ownerUserId: event.target.value,
                      ownerName: selected ? selected.user.name : current.ownerName,
                    }));
                  }}
                  className="rounded bg-surface-container-lowest border border-outline/20 px-2.5 py-1.5 text-xs text-on-surface focus:border-primary focus:outline-none"
                >
                  {workspaceMembers.length > 0 ? (
                    workspaceMembers.map((m) => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user.name} ({m.role})
                      </option>
                    ))
                  ) : (
                    <option value={currentUser?.id ?? ""}>{currentUser?.name ?? "Current User"}</option>
                  )}
                </select>
                <select
                  value={newProject.status}
                  onChange={(event) => setNewProject((current) => ({ ...current, status: event.target.value }))}
                  className="rounded bg-surface-container-lowest border border-outline/20 px-2.5 py-1.5 text-xs text-on-surface focus:border-primary focus:outline-none"
                >
                  <option value="Planning">Planning</option>
                  <option value="Ready">Ready</option>
                  <option value="Review">Review</option>
                  <option value="On track">On track</option>
                  <option value="At risk">At risk</option>
                </select>
                <input
                  value={newProject.due}
                  onChange={(event) => setNewProject((current) => ({ ...current, due: event.target.value }))}
                  placeholder="Due date"
                  className="rounded bg-surface-container-lowest border border-outline/20 px-2.5 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={newProject.progress}
                  onChange={(event) =>
                    setNewProject((current) => ({ ...current, progress: Number(event.target.value) || 0 }))
                  }
                  placeholder="Progress"
                  className="rounded bg-surface-container-lowest border border-outline/20 px-2.5 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none"
                />
                <div className="md:col-span-2">
                  <textarea
                    value={newProject.overview}
                    onChange={(event) => setNewProject((current) => ({ ...current, overview: event.target.value }))}
                    rows={2}
                    placeholder="Project overview"
                    className="w-full rounded bg-surface-container-lowest border border-outline/20 px-2.5 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewProject(false)}
                  className="rounded bg-surface-container-high hover:bg-surface-container-highest px-3 py-1 text-xs text-on-surface transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCreateProject}
                  className="rounded bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-3.5 py-1 text-xs font-medium transition disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Save project"}
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => renderProjectCard(project))
            ) : (
              <div className="col-span-full rounded border border-dashed border-outline/20 bg-surface-container-lowest p-8 text-center text-xs font-mono text-on-surface-variant">
                No projects match your current filters.
              </div>
            )}
          </div>
        </div>

        {/* Selected Project Details Panel */}
        <aside className="rounded-xl bg-surface-container-low border border-outline-variant/20 p-4 sm:p-5 shadow-xs">
          {selectedProject ? (
            <>
              <div className="mb-4 flex items-center justify-between gap-3 pb-3 border-b border-outline-variant/15">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">Selected</p>
                  <h2 className="text-base font-bold text-on-surface font-headline-sm">{selectedProject.name}</h2>
                </div>
                <span className="rounded-md bg-surface-lowest border border-outline-variant/25 px-2 py-0.5 text-[10px] font-mono text-secondary">
                  {selectedProject.status}
                </span>
              </div>

              {draftProject && draftProject.id === selectedProject.id ? (
                <div className="space-y-2.5">
                  <input
                    value={draftProject.name}
                    onChange={(event) => updateSelectedProject({ name: event.target.value })}
                    className="w-full rounded bg-surface-container-lowest border border-outline/20 px-2.5 py-1.5 text-xs text-on-surface focus:border-primary focus:outline-none"
                  />
                  <input
                    value={draftProject.owner}
                    onChange={(event) => updateSelectedProject({ owner: event.target.value })}
                    className="w-full rounded bg-surface-container-lowest border border-outline/20 px-2.5 py-1.5 text-xs text-on-surface focus:border-primary focus:outline-none"
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      value={draftProject.status}
                      onChange={(event) => updateSelectedProject({ status: event.target.value })}
                      className="rounded bg-surface-container-lowest border border-outline/20 px-2.5 py-1.5 text-xs text-on-surface focus:border-primary focus:outline-none"
                    >
                      <option value="Planning">Planning</option>
                      <option value="Ready">Ready</option>
                      <option value="Review">Review</option>
                      <option value="On track">On track</option>
                      <option value="At risk">At risk</option>
                    </select>
                    <input
                      value={draftProject.due}
                      onChange={(event) => updateSelectedProject({ due: event.target.value })}
                      className="rounded bg-surface-container-lowest border border-outline/20 px-2.5 py-1.5 text-xs text-on-surface focus:border-primary focus:outline-none"
                    />
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draftProject.progress}
                    onChange={(event) =>
                      updateSelectedProject({ progress: Number(event.target.value) || 0 })
                    }
                    className="w-full rounded bg-surface-container-lowest border border-outline/20 px-2.5 py-1.5 text-xs text-on-surface focus:border-primary focus:outline-none"
                  />
                  <textarea
                    value={draftProject.overview}
                    rows={3}
                    onChange={(event) => updateSelectedProject({ overview: event.target.value })}
                    className="w-full rounded bg-surface-container-lowest border border-outline/20 px-2.5 py-1.5 text-xs text-on-surface focus:border-primary focus:outline-none"
                  />

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setDraftProject(null)}
                      className="rounded bg-surface-container-high hover:bg-surface-container-highest px-3 py-1 text-xs text-on-surface transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProjectEdits}
                      className="rounded bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-3.5 py-1 text-xs font-medium transition"
                    >
                      Save changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded bg-surface-container-lowest border border-outline/20 p-3">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-on-surface-variant font-mono">
                      <span>Progress</span>
                      <span className="text-secondary">{selectedProject.progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-highest">
                      <div
                        className="h-full rounded-full bg-secondary"
                        style={{ width: `${selectedProject.progress}%` }}
                      />
                    </div>
                  </div>

                  <dl className="space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-on-surface-variant font-mono">Owner</dt>
                      <dd className="font-medium text-on-surface">{selectedProject.owner}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-on-surface-variant font-mono">Due</dt>
                      <dd className="font-mono text-on-surface">{selectedProject.due}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-on-surface-variant font-mono">Status</dt>
                      <dd className="font-mono text-on-surface">{selectedProject.status}</dd>
                    </div>
                  </dl>

                  <p className="text-xs leading-relaxed text-on-surface-variant">{selectedProject.overview}</p>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-outline/10">
                    <Link
                      href={`/projects/${selectedProject.id}`}
                      className="flex-1 rounded bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-3 py-1.5 text-center text-xs font-medium transition shadow-sm"
                    >
                      Open project
                    </Link>
                    {!isViewer && (
                      <>
                        <button
                          type="button"
                          onClick={() => setDraftProject({ ...selectedProject })}
                          className="rounded bg-surface-container hover:bg-surface-container-highest px-2.5 py-1.5 text-xs font-mono text-on-surface transition"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(selectedProject.id)}
                          className="rounded bg-error-container/20 hover:bg-error-container/30 px-2.5 py-1.5 text-xs font-mono text-error transition"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded border border-dashed border-outline/20 bg-surface-container-lowest p-6 text-center text-xs font-mono text-on-surface-variant">
              Select a project to review details.
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
