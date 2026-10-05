"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  assignProjectMemberAction,
  removeProjectMemberAction,
  createTaskAction,
} from "@/app/actions";
import { TaskForm, type TaskDraft } from "@/components/dashboard/TaskForm";
import { ProjectTimelineWidget } from "./ProjectTimelineWidget";
import { WorkloadChartWidget } from "./WorkloadChartWidget";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  Users,
  ShieldCheck,
  Activity,
  Trash2,
  ListTodo,
} from "lucide-react";
import type { Project, TaskPriority } from "@/data/mock-data";

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

export function ProjectDetailView({
  project,
  workspaceMembers = [],
  canManageProject = true,
  currentUser,
  workspaceId,
}: {
  project: Project;
  workspaceMembers?: WorkspaceMemberItem[];
  canManageProject?: boolean;
  currentUser?: { id: string; name: string; email: string };
  workspaceId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<
    "overview" | "tasks" | "timeline" | "team" | "activity"
  >("overview");

  const [selectedUserId, setSelectedUserId] = useState(workspaceMembers[0]?.user.id ?? "");
  const [selectedProjectRole, setSelectedProjectRole] = useState<
    "lead" | "contributor" | "reviewer" | "viewer"
  >("contributor");
  const [showAssignForm, setShowAssignForm] = useState(false);

  // Task modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [taskDraft, setTaskDraft] = useState<TaskDraft | null>(null);

  const assigneeOptions = useMemo(() => {
    const memberNames = workspaceMembers.map((m) => m.user.name);
    const projectMemberNames = project.teamMembers.map((m) => m.name);
    const taskAssignees = project.tasks.map((t) => t.assignee).filter(Boolean);
    const names = Array.from(
      new Set([
        ...memberNames,
        ...projectMemberNames,
        ...taskAssignees,
        currentUser?.name ?? "",
        "Unassigned",
      ])
    ).filter(Boolean);
    return names.length > 0 ? names : ["Unassigned"];
  }, [workspaceMembers, project.teamMembers, project.tasks, currentUser?.name]);

  const projectOptions = useMemo(
    () => [{ id: project.id, name: project.name }],
    [project.id, project.name]
  );

  const openCreateTaskModal = () => {
    setTaskDraft({
      title: "",
      description: "",
      assignee: currentUser?.name ?? workspaceMembers[0]?.user.name ?? "Unassigned",
      priority: "Medium",
      status: "Not started",
      due: new Date().toISOString().slice(0, 10),
      project: project.name,
      projectId: project.id,
    });
    setIsTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setTaskDraft(null);
    setIsTaskModalOpen(false);
  };

  const updateTaskDraft = (field: keyof TaskDraft, value: string) => {
    setTaskDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        [field]: field === "priority" ? (value as TaskPriority) : value,
      };
    });
  };

  const handleSaveProjectTask = async () => {
    if (!taskDraft || !taskDraft.title.trim()) return;

    setIsSavingTask(true);
    await createTaskAction({
      workspaceId,
      title: taskDraft.title.trim(),
      description: taskDraft.description.trim(),
      assignee: taskDraft.assignee.trim() || "Unassigned",
      priority: taskDraft.priority,
      status: taskDraft.status || "Not started",
      due: taskDraft.due || new Date().toISOString().slice(0, 10),
      projectId: project.id,
      projectName: project.name,
    });
    setIsSavingTask(false);
    closeTaskModal();
    router.refresh();
  };

  const handleAssignMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    startTransition(async () => {
      await assignProjectMemberAction({
        projectId: project.id,
        userId: selectedUserId,
        role: selectedProjectRole,
      });
      setShowAssignForm(false);
      router.refresh();
    });
  };

  const handleRemoveProjectMember = (memberId?: string) => {
    if (!memberId) return;
    startTransition(async () => {
      await removeProjectMemberAction(project.id, memberId);
      router.refresh();
    });
  };

  const completedTasksCount = project.tasks.filter((t) => t.status === "Completed").length;
  const taskCompletionRate =
    project.tasks.length > 0
      ? Math.round((completedTasksCount / project.tasks.length) * 100)
      : 0;

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Project Top Header & Details Card */}
      <Card className="p-4 sm:p-6 border-border/60 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-5">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-sm shrink-0">
              {project.name.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Project Workspace
                </span>
                <Badge variant="outline" className="text-[10px] font-mono bg-muted/40">
                  {project.status}
                </Badge>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {project.name}
              </h1>

              {/* Project Meta Chips */}
              <div className="pt-1.5 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-md bg-muted/40 border border-border/50 px-2.5 py-1 text-[11px] font-mono text-muted-foreground">
                  <Calendar className="size-3 text-primary" />
                  <span className="text-foreground font-medium">Due:</span>
                  <span>{project.due}</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-md bg-muted/40 border border-border/50 px-2.5 py-1 text-[11px] font-mono text-muted-foreground">
                  <CheckCircle2 className="size-3 text-emerald-500" />
                  <span className="text-foreground font-medium">Tasks:</span>
                  <span>{completedTasksCount} / {project.tasks.length} done</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-md bg-muted/40 border border-border/50 px-2.5 py-1 text-[11px] font-mono text-muted-foreground">
                  <User className="size-3 text-primary" />
                  <span className="text-foreground font-medium">Lead:</span>
                  <span>{project.owner}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Button asChild variant="outline" size="sm" className="h-9 text-xs">
              <Link href="/projects">
                <ArrowLeft className="size-3.5 mr-1" />
                All projects
              </Link>
            </Button>
            {canManageProject && (
              <Button
                size="sm"
                data-testid="project-header-new-task-btn"
                onClick={openCreateTaskModal}
                className="h-9 text-xs font-medium cursor-pointer"
              >
                <Plus className="size-3.5 mr-1" />
                New Task
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stat Metrics Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-4 border-t border-border/60">
          <div className="rounded-lg bg-muted/20 border border-border/40 p-3">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Owner
            </p>
            <p className="mt-1 text-sm font-semibold truncate text-foreground">{project.owner}</p>
          </div>
          <div className="rounded-lg bg-muted/20 border border-border/40 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Progress
              </p>
              <span className="text-xs font-mono font-semibold text-foreground">
                {project.progress}%
              </span>
            </div>
            <Progress value={project.progress} className="h-2" />
          </div>
          <div className="rounded-lg bg-muted/20 border border-border/40 p-3">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Due Date
            </p>
            <p className="mt-1 text-sm font-mono text-foreground">{project.due}</p>
          </div>
          <div className="rounded-lg bg-muted/20 border border-border/40 p-3">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Health
            </p>
            <p
              className={`mt-1 text-sm font-medium ${
                project.progress >= 70
                  ? "text-emerald-500"
                  : project.progress >= 50
                  ? "text-amber-500"
                  : "text-destructive"
              }`}
            >
              {project.progress >= 70
                ? "Strong"
                : project.progress >= 50
                ? "Steady"
                : "Needs focus"}
            </p>
          </div>
        </div>
      </Card>

      {/* Project Navigation Tabs Bar */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-0">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {[
            { id: "overview", label: "Overview" },
            { id: "tasks", label: `Tasks (${project.tasks.length})` },
            { id: "timeline", label: "Timeline" },
            { id: "team", label: `Team (${project.teamMembers.length})` },
            { id: "activity", label: "Activity" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setActiveTab(
                  tab.id as "overview" | "tasks" | "timeline" | "team" | "activity"
                )
              }
              className={`px-3.5 py-2.5 text-xs font-medium border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Team Members Avatar Stack (Preserves "Team members:" locator) */}
        <div className="flex items-center gap-2 shrink-0 pb-1">
          <span className="text-xs font-mono text-muted-foreground hidden sm:inline">
            Team members:
          </span>
          <div className="flex -space-x-1.5 overflow-hidden">
            {project.teamMembers.map((m, idx) => (
              <div
                key={idx}
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white shadow ring-1 ring-background ${
                  m.color || "bg-primary"
                }`}
                title={`${m.name} (${m.role})`}
              >
                {m.initials}
              </div>
            ))}
          </div>
          {canManageProject && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setActiveTab("team");
                setShowAssignForm(true);
              }}
              className="h-6 w-6 rounded-full p-0 text-xs"
              title="Add member"
            >
              <Plus className="size-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <ProjectTimelineWidget
            tasks={project.tasks}
            teamMembers={project.teamMembers}
          />

          {/* Associated Tasks & Workload Distribution */}
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card className="p-4 sm:p-5 flex flex-col border-border/60 shadow-xs">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-border/60">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight text-foreground">
                    Associated tasks
                  </h2>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    {completedTasksCount}/{project.tasks.length} done ({taskCompletionRate}%)
                  </p>
                </div>
                {canManageProject && (
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="project-add-task-btn"
                    onClick={openCreateTaskModal}
                    className="h-7 px-2.5 text-xs text-primary"
                  >
                    <Plus className="size-3 mr-1" />
                    Add task
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-72">
                {project.tasks.length > 0 ? (
                  project.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-lg bg-muted/20 border border-border/40 p-3 hover:bg-muted/40 transition"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-foreground truncate">{task.title}</p>
                        <Badge
                          variant={task.priority === "High" ? "destructive" : task.priority === "Medium" ? "secondary" : "outline"}
                          className="text-[9px] font-mono px-1.5 py-0 h-4"
                        >
                          {task.priority}
                        </Badge>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                        <span>{task.assignee}</span>
                        <span>Due {task.due}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs font-mono text-muted-foreground italic text-center py-8">
                    No tasks associated yet.
                  </p>
                )}
              </div>
            </Card>

            <WorkloadChartWidget members={project.teamMembers} />
          </div>
        </div>
      )}

      {/* Tab: Tasks Full View */}
      {activeTab === "tasks" && (
        <Card className="p-4 sm:p-5 border-border/60 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
            <div>
              <h2 className="text-base font-bold text-foreground">Associated tasks</h2>
              <p className="text-xs font-mono text-muted-foreground">
                {completedTasksCount} / {project.tasks.length} completed ({taskCompletionRate}%)
              </p>
            </div>
            {canManageProject && (
              <Button
                size="sm"
                data-testid="project-add-task-btn"
                onClick={openCreateTaskModal}
                className="h-8 text-xs font-medium"
              >
                <Plus className="size-3.5 mr-1" />
                Add task
              </Button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {project.tasks.map((task) => (
              <Card
                key={task.id}
                className="p-3.5 bg-muted/10 border-border/60 hover:bg-muted/30 transition"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-foreground line-clamp-1">{task.title}</p>
                  <Badge
                    variant={task.priority === "High" ? "destructive" : task.priority === "Medium" ? "secondary" : "outline"}
                    className="text-[10px] font-mono"
                  >
                    {task.priority}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                  <span>{task.assignee}</span>
                  <Badge variant="outline" className="text-[10px] bg-background">
                    {task.status}
                  </Badge>
                </div>
                <p className="mt-2 text-[10px] font-mono text-muted-foreground">Due {task.due}</p>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Tab: Timeline Full View */}
      {activeTab === "timeline" && (
        <ProjectTimelineWidget
          tasks={project.tasks}
          teamMembers={project.teamMembers}
        />
      )}

      {/* Tab: Team Members Management */}
      {activeTab === "team" && (
        <Card className="p-4 sm:p-5 border-border/60 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
            <div>
              <h2 className="text-base font-bold text-foreground">Team Members</h2>
              <p className="text-xs font-mono text-muted-foreground">
                {project.teamMembers.length} assigned members on this project
              </p>
            </div>

            {canManageProject && workspaceMembers.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                data-testid="assign-member-toggle-btn"
                onClick={() => setShowAssignForm(!showAssignForm)}
                className="h-8 text-xs"
              >
                {showAssignForm ? "Cancel" : "+ Assign Member"}
              </Button>
            )}
          </div>

          {showAssignForm && (
            <Card className="mb-5 p-4 border-primary/30 bg-muted/20">
              <form onSubmit={handleAssignMember}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-muted-foreground mb-1">
                      Select Workspace Member
                    </label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {workspaceMembers.map((m) => (
                        <option key={m.user.id} value={m.user.id}>
                          {m.user.name} ({m.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-muted-foreground mb-1">
                      Project Role
                    </label>
                    <select
                      value={selectedProjectRole}
                      onChange={(e) =>
                        setSelectedProjectRole(
                          e.target.value as "lead" | "contributor" | "reviewer" | "viewer"
                        )
                      }
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="contributor">Contributor</option>
                      <option value="lead">Project Lead</option>
                      <option value="reviewer">Reviewer</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3.5 flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isPending}
                    className="h-8 text-xs font-medium"
                  >
                    {isPending ? "Assigning..." : "Confirm Assignment"}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {project.teamMembers.map((member) => (
              <Card
                key={member.name}
                className="flex items-center justify-between p-3.5 bg-muted/10 border-border/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow ${
                      member.color || "bg-primary"
                    }`}
                  >
                    {member.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-foreground">{member.name}</p>
                    <span className="text-[10px] font-mono text-muted-foreground capitalize">
                      {member.role}
                    </span>
                  </div>
                </div>

                {canManageProject && member.name !== project.owner && member.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveProjectMember(member.id)}
                    disabled={isPending}
                    title="Remove from project"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Tab: Activity */}
      {activeTab === "activity" && (
        <Card className="p-4 sm:p-5 border-border/60 shadow-xs">
          <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <span>Recent Activity</span>
          </h2>
          <div className="space-y-2">
            {project.recentActivity.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-lg bg-muted/20 border border-border/40 p-3 text-xs text-foreground"
              >
                <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Task Creation Modal */}
      {isTaskModalOpen && taskDraft && (
        <TaskForm
          mode="create"
          draft={taskDraft}
          assigneeOptions={assigneeOptions}
          projectOptions={projectOptions}
          statusOptions={[
            "Not started",
            "In progress",
            "Pending",
            "Review",
            "Blocked",
            "Completed",
          ]}
          priorityOptions={["High", "Medium", "Low"]}
          isSaving={isSavingTask}
          onFieldChange={updateTaskDraft}
          onCancel={closeTaskModal}
          onSave={handleSaveProjectTask}
        />
      )}
    </div>
  );
}
