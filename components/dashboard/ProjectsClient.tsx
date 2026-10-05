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
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Plus,
  FolderKanban,
  Calendar,
  User,
  ArrowUpRight,
  Edit3,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
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
      <Card
        key={project.id}
        className={`group transition-all duration-200 text-left ${
          isSelected
            ? "border-primary ring-1 ring-primary/40 bg-card shadow-sm"
            : "border-border/60 bg-card/60 hover:bg-card hover:border-border hover:shadow-xs"
        }`}
      >
        <button
          type="button"
          onClick={() => setSelectedProjectId(project.id)}
          className="block w-full p-4 sm:p-5 text-left cursor-pointer focus:outline-none"
        >
          <div className="mb-3.5 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {project.name}
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <User className="size-3 text-muted-foreground/80" />
                <span>{project.owner}</span>
              </p>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] font-medium font-mono shrink-0 bg-muted/40 border-border/60"
            >
              {project.status}
            </Badge>
          </div>

          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-[11px]">Progress</span>
            <span
              className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold ${
                isHighCapacity ? "text-emerald-500" : "text-primary"
              }`}
            >
              <span>{project.progress}%</span>
              {isHighCapacity && <Sparkles className="size-3 text-emerald-500" />}
            </span>
          </div>

          <Progress value={project.progress} className="h-2" />

          <div className="mt-3.5 flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded bg-muted/40 px-2 py-0.5 text-[10px] font-mono border border-border/40">
              <Calendar className="size-3 text-muted-foreground/70" />
              Due {project.due}
            </span>
            <span className="text-[10px] text-muted-foreground/70 font-mono">
              {project.tasks.length} tasks
            </span>
          </div>
        </button>

        <CardFooter className="px-4 sm:px-5 py-2.5 border-t border-border/50 flex items-center justify-between gap-2 bg-muted/10">
          <Link
            href={`/projects/${project.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <span>Open details</span>
            <ArrowUpRight className="size-3" />
          </Link>
          {!isViewer && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDraftProject({ ...project })}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Edit3 className="size-3 mr-1" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteProject(project.id)}
                className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-3 mr-1" />
                Delete
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Metrics Row (2x2 grid on mobile, 4 columns on desktop) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {liveReportCards.map((report) => (
          <StatCard key={report.title} label={report.title} value={report.value} change={report.trend} />
        ))}
      </section>

      {/* Main Portfolio Grid */}
      <section className="grid gap-5 xl:grid-cols-[1.8fr_1fr]">
        <Card className="p-4 sm:p-5 border-border/60 shadow-xs">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pb-3.5 border-b border-border/60">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <FolderKanban className="size-5 text-primary" />
                <span>Project portfolio</span>
              </h1>
              <p className="text-xs text-muted-foreground">Active initiatives and engineering deliverables</p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  type="search"
                  placeholder="Search projects..."
                  className="pl-8 h-9 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filter by project status"
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option} className="bg-background text-foreground">
                      {option}
                    </option>
                  ))}
                </select>
                {!isViewer && (
                  <Button
                    size="sm"
                    onClick={() => setShowNewProject((current) => !current)}
                    className="h-9 px-3.5 text-xs font-medium shrink-0 cursor-pointer"
                  >
                    {showNewProject ? (
                      <>
                        <X className="size-3.5 mr-1" />
                        Close
                      </>
                    ) : (
                      <>
                        <Plus className="size-3.5 mr-1" />
                        New project
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {showNewProject && (
            <Card className="mb-5 border-primary/40 bg-muted/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Plus className="size-4 text-primary" />
                  <span>Create new project</span>
                </h2>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  Draft
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  value={newProject.name}
                  onChange={(event) => setNewProject((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Project name"
                  className="text-xs"
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
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="Planning">Planning</option>
                  <option value="Ready">Ready</option>
                  <option value="Review">Review</option>
                  <option value="On track">On track</option>
                  <option value="At risk">At risk</option>
                </select>
                <Input
                  value={newProject.due}
                  onChange={(event) => setNewProject((current) => ({ ...current, due: event.target.value }))}
                  placeholder="Due date (e.g. Next week, Oct 24)"
                  className="text-xs"
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={newProject.progress}
                  onChange={(event) =>
                    setNewProject((current) => ({ ...current, progress: Number(event.target.value) || 0 }))
                  }
                  placeholder="Progress percentage"
                  className="text-xs"
                />
                <div className="sm:col-span-2">
                  <Textarea
                    value={newProject.overview}
                    onChange={(event) => setNewProject((current) => ({ ...current, overview: event.target.value }))}
                    rows={2}
                    placeholder="Project overview, goals and milestones"
                    className="text-xs resize-none"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewProject(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={isSubmitting}
                  onClick={handleCreateProject}
                  className="h-8 text-xs"
                >
                  {isSubmitting ? "Creating..." : "Save project"}
                </Button>
              </div>
            </Card>
          )}

          <div className="grid gap-3.5 sm:grid-cols-2">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => renderProjectCard(project))
            ) : (
              <div className="col-span-full rounded-lg border border-dashed border-border p-10 text-center text-xs text-muted-foreground">
                <FolderKanban className="size-8 mx-auto mb-2 text-muted-foreground/40" />
                No projects match your current filters.
              </div>
            )}
          </div>
        </Card>

        {/* Selected Project Details Panel */}
        <aside className="space-y-4">
          <Card className="p-4 sm:p-5 border-border/60 shadow-xs">
            {selectedProject ? (
              <>
                <div className="mb-4 flex items-center justify-between gap-3 pb-3 border-b border-border/60">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Inspector</p>
                    <h2 className="text-base font-bold text-foreground line-clamp-1">{selectedProject.name}</h2>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono bg-muted/40">
                    {selectedProject.status}
                  </Badge>
                </div>

                {draftProject && draftProject.id === selectedProject.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">Name</label>
                      <Input
                        value={draftProject.name}
                        onChange={(event) => updateSelectedProject({ name: event.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">Owner</label>
                      <Input
                        value={draftProject.owner}
                        onChange={(event) => updateSelectedProject({ owner: event.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground block mb-1">Status</label>
                        <select
                          value={draftProject.status}
                          onChange={(event) => updateSelectedProject({ status: event.target.value })}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="Planning">Planning</option>
                          <option value="Ready">Ready</option>
                          <option value="Review">Review</option>
                          <option value="On track">On track</option>
                          <option value="At risk">At risk</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground block mb-1">Due</label>
                        <Input
                          value={draftProject.due}
                          onChange={(event) => updateSelectedProject({ due: event.target.value })}
                          className="text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">Progress (%)</label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={draftProject.progress}
                        onChange={(event) =>
                          updateSelectedProject({ progress: Number(event.target.value) || 0 })
                        }
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">Overview</label>
                      <Textarea
                        value={draftProject.overview}
                        rows={3}
                        onChange={(event) => updateSelectedProject({ overview: event.target.value })}
                        className="text-xs resize-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDraftProject(null)}
                        className="h-8 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveProjectEdits}
                        className="h-8 text-xs"
                      >
                        Save changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-muted/30 border border-border/50 p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                        <span>Progress completion</span>
                        <span className="font-semibold text-foreground">{selectedProject.progress}%</span>
                      </div>
                      <Progress value={selectedProject.progress} className="h-2" />
                    </div>

                    <dl className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2 py-1 border-b border-border/40">
                        <dt className="text-muted-foreground">Owner</dt>
                        <dd className="font-medium text-foreground">{selectedProject.owner}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2 py-1 border-b border-border/40">
                        <dt className="text-muted-foreground">Due date</dt>
                        <dd className="font-mono text-foreground">{selectedProject.due}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2 py-1 border-b border-border/40">
                        <dt className="text-muted-foreground">Status</dt>
                        <dd className="font-mono text-foreground">{selectedProject.status}</dd>
                      </div>
                    </dl>

                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground mb-1">Overview</p>
                      <p className="text-xs leading-relaxed text-muted-foreground/90 bg-muted/20 p-3 rounded-lg border border-border/30">
                        {selectedProject.overview}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                      <Button asChild size="sm" className="flex-1 h-9 text-xs">
                        <Link href={`/projects/${selectedProject.id}`}>
                          Open project details
                        </Link>
                      </Button>
                      {!isViewer && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDraftProject({ ...selectedProject })}
                            className="h-9 px-3 text-xs"
                          >
                            <Edit3 className="size-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteProject(selectedProject.id)}
                            className="h-9 px-3 text-xs text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                          >
                            <Trash2 className="size-3.5 mr-1" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                Select a project to review details.
              </div>
            )}
          </Card>
        </aside>
      </section>
    </div>
  );
}
