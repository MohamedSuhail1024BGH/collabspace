"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { StatCard } from "@/components/dashboard/StatCard";
import { projectDirectory, reportCards, type Project } from "@/data/mock-data";

const defaultProjectDraft = {
  name: "",
  owner: "",
  status: "Planning",
  due: "Next week",
  progress: 0,
  overview: "Add project context, timeline, and key milestones for the team.",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState(projectDirectory);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedProjectId, setSelectedProjectId] = useState(projectDirectory[0]?.id ?? "");
  const [showNewProject, setShowNewProject] = useState(false);
  const [draftProject, setDraftProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState(defaultProjectDraft);

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
    if (!draftProject) {
      return;
    }

    setDraftProject({ ...draftProject, ...updates });
  };

  const handleCreateProject = () => {
    const projectName = newProject.name.trim() || "Untitled project";
    const createdProject: Project = {
      id: `project-${Date.now()}`,
      name: projectName,
      progress: Number(newProject.progress) || 0,
      due: newProject.due || "Next week",
      owner: newProject.owner || "Unassigned",
      status: newProject.status || "Planning",
      overview: newProject.overview || "Add project context, timeline, and key milestones for the team.",
      teamMembers: [
        { name: newProject.owner || "Unassigned", role: "Project owner", initials: "PO", color: "bg-violet-500" },
      ],
      recentActivity: ["Project created and ready for the next planning cycle."],
      tasks: [],
    };

    setProjects((current) => [createdProject, ...current]);
    setSelectedProjectId(createdProject.id);
    setShowNewProject(false);
    setNewProject(defaultProjectDraft);
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
  };

  const handleSaveProjectEdits = () => {
    if (!draftProject) {
      return;
    }

    setProjects((current) =>
      current.map((project) =>
        project.id === draftProject.id
          ? {
              ...project,
              name: draftProject.name,
              owner: draftProject.owner,
              status: draftProject.status,
              due: draftProject.due,
              progress: Math.min(100, Math.max(0, Number(draftProject.progress) || 0)),
              overview: draftProject.overview,
            }
          : project,
      ),
    );
    setDraftProject(null);
  };

  const renderProjectCard = (project: Project) => {
    const isSelected = selectedProject?.id === project.id;

    return (
      <div
        key={project.id}
        className={[
          "rounded-2xl border bg-slate-950/50 p-4 transition",
          isSelected ? "border-violet-400/50 bg-violet-500/10" : "border-white/10",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() => setSelectedProjectId(project.id)}
          className="block w-full text-left"
        >
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-medium text-white">{project.name}</p>
              <p className="mt-1 text-sm text-slate-400">Owner: {project.owner}</p>
            </div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300">
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
        </button>

        <div className="mt-4 flex items-center justify-between gap-3">
          <Link
            href={`/projects/${project.id}`}
            className="text-sm font-medium text-violet-300 hover:text-violet-200"
          >
            Open details
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDraftProject({ ...project })}
              className="rounded-xl border border-white/10 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-200 hover:border-violet-500/40 hover:text-white"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDeleteProject(project.id)}
              className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-200 hover:bg-rose-500/20"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {reportCards.slice(0, 4).map((report) => (
          <StatCard key={report.title} label={report.title} value={report.value} change={report.trend} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h3 className="text-lg font-semibold text-white">Project portfolio</h3>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                type="search"
                placeholder="Search projects"
                className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:outline-none"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-violet-400/50 focus:outline-none"
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewProject((current) => !current)}
                className="rounded-2xl bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400"
              >
                {showNewProject ? "Close" : "New project"}
              </button>
            </div>
          </div>

          {showNewProject ? (
            <div className="mb-5 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-base font-medium text-white">Create new project</h4>
                <span className="text-xs text-violet-200">Draft</span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={newProject.name}
                  onChange={(event) => setNewProject((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Project name"
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:outline-none"
                />
                <input
                  value={newProject.owner}
                  onChange={(event) => setNewProject((current) => ({ ...current, owner: event.target.value }))}
                  placeholder="Owner"
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:outline-none"
                />
                <select
                  value={newProject.status}
                  onChange={(event) => setNewProject((current) => ({ ...current, status: event.target.value }))}
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-violet-400/50 focus:outline-none"
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
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:outline-none"
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
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:outline-none"
                />
                <div className="md:col-span-2">
                  <textarea
                    value={newProject.overview}
                    onChange={(event) => setNewProject((current) => ({ ...current, overview: event.target.value }))}
                    rows={3}
                    placeholder="Project overview"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewProject(false)}
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateProject}
                  className="rounded-xl bg-violet-500 px-3 py-2 text-sm font-medium text-white hover:bg-violet-400"
                >
                  Save project
                </button>
              </div>
            </div>
          ) : null}

          <div className="space-y-4">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => renderProjectCard(project))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-10 text-center text-slate-300">
                No projects match your current filters.
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
          {selectedProject ? (
            <>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Selected</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{selectedProject.name}</h3>
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300">
                  {selectedProject.status}
                </span>
              </div>

              {draftProject && draftProject.id === selectedProject.id ? (
                <div className="space-y-3">
                  <input
                    value={draftProject.name}
                    onChange={(event) => updateSelectedProject({ name: event.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-violet-400/50 focus:outline-none"
                  />
                  <input
                    value={draftProject.owner}
                    onChange={(event) => updateSelectedProject({ owner: event.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-violet-400/50 focus:outline-none"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      value={draftProject.status}
                      onChange={(event) => updateSelectedProject({ status: event.target.value })}
                      className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-violet-400/50 focus:outline-none"
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
                      className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-violet-400/50 focus:outline-none"
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
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-violet-400/50 focus:outline-none"
                  />
                  <textarea
                    value={draftProject.overview}
                    rows={4}
                    onChange={(event) => updateSelectedProject({ overview: event.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-violet-400/50 focus:outline-none"
                  />

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setDraftProject(null)}
                      className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProjectEdits}
                      className="rounded-xl bg-violet-500 px-3 py-2 text-sm font-medium text-white hover:bg-violet-400"
                    >
                      Save changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                    <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                      <span>Progress</span>
                      <span>{selectedProject.progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                        style={{ width: `${selectedProject.progress}%` }}
                      />
                    </div>
                  </div>

                  <dl className="space-y-3 text-sm text-slate-300">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-slate-400">Owner</dt>
                      <dd className="font-medium text-white">{selectedProject.owner}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-slate-400">Due</dt>
                      <dd className="font-medium text-white">{selectedProject.due}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-slate-400">Status</dt>
                      <dd className="font-medium text-white">{selectedProject.status}</dd>
                    </div>
                  </dl>

                  <p className="text-sm leading-6 text-slate-300">{selectedProject.overview}</p>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/projects/${selectedProject.id}`}
                      className="flex-1 rounded-xl bg-violet-500 px-3 py-2 text-center text-sm font-medium text-white hover:bg-violet-400"
                    >
                      Open project
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDraftProject({ ...selectedProject })}
                      className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProject(selectedProject.id)}
                      className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-6 text-center text-slate-300">
              Select a project to review details.
            </div>
          )}
        </aside>
      </section>
    </>
  );
}
