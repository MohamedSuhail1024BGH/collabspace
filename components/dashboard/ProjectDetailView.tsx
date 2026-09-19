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
import type { Project, TaskPriority } from "@/data/mock-data";

const priorityStyles = {
  High: "border-error/30 bg-error-container/20 text-error",
  Medium: "border-tertiary/30 bg-tertiary-container/20 text-tertiary",
  Low: "border-secondary/30 bg-secondary-container/20 text-secondary",
} as const;

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
      {/* Project Top Header & Details Card (Stitch Precision Engineering Dark) */}
      <section className="rounded-xl bg-surface-container-low border border-outline-variant/20 p-4 sm:p-6 transition-all shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-on-primary font-bold text-lg shadow-sm">
              {project.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
                  Project Workspace
                </span>
                <span className="rounded-md bg-surface-lowest border border-outline-variant/25 px-2 py-0.5 text-[10px] font-mono text-secondary">
                  {project.status}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface font-headline-sm">{project.name}</h1>

              {/* Repo & Telemetry Pills */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-md bg-surface-lowest border border-outline-variant/20 px-2.5 py-1 text-[11px] font-mono text-on-surface-variant">
                  <span className="text-primary font-bold">git:</span>
                  <span>github.com/collabspace/{project.id}</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-md bg-surface-lowest border border-outline-variant/20 px-2.5 py-1 text-[11px] font-mono text-on-surface-variant">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  <span>branch: main</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-md bg-surface-lowest border border-outline-variant/20 px-2.5 py-1 text-[11px] font-mono text-on-surface-variant">
                  <span className="text-on-surface-variant/70">commit:</span>
                  <span>7f8b92a</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/projects"
              className="rounded-lg bg-surface-container hover:bg-surface-high border border-outline-variant/25 px-3 py-1.5 text-xs font-mono text-on-surface transition shadow-xs"
            >
              &larr; All projects
            </Link>
            {canManageProject && (
              <button
                type="button"
                data-testid="project-header-new-task-btn"
                onClick={openCreateTaskModal}
                className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-3.5 py-1.5 text-xs font-medium shadow-xs transition"
              >
                <span>+</span>
                <span>New Task</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Stat Metrics Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-4 border-t border-outline-variant/15">
          <div className="rounded-xl bg-surface-container border border-outline-variant/20 p-3.5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
              Owner
            </p>
            <p className="mt-1 text-sm font-semibold truncate text-on-surface">{project.owner}</p>
          </div>
          <div className="rounded-xl bg-surface-container border border-outline-variant/20 p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
                Progress
              </p>
              {project.progress >= 80 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-tertiary">
                  <svg className="w-3 h-3 text-tertiary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>80%+ Cap</span>
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-surface-lowest overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    project.progress >= 80 ? "bg-tertiary" : "bg-secondary"
                  }`}
                  style={{ width: `${project.progress}%` }}
                />
              </div>
              <span
                className={`text-xs font-mono ${
                  project.progress >= 80 ? "text-tertiary font-bold" : "text-secondary"
                }`}
              >
                {project.progress}%
              </span>
            </div>
          </div>
          <div className="rounded-xl bg-surface-container border border-outline-variant/20 p-3.5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
              Due Date
            </p>
            <p className="mt-1 text-sm font-mono text-on-surface">{project.due}</p>
          </div>
          <div className="rounded-xl bg-surface-container border border-outline-variant/20 p-3.5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
              Health
            </p>
            <p
              className={`mt-1 text-sm font-mono ${
                project.progress >= 70
                  ? "text-secondary"
                  : project.progress >= 50
                  ? "text-tertiary"
                  : "text-error"
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
      </section>

      {/* Project Navigation Tabs Bar */}
      <div className="flex items-center justify-between gap-3 border-b border-outline/10 pb-0">
        <div className="flex items-center gap-1 overflow-x-auto">
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
              className={`px-3 py-2 text-xs font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Team Members Avatar Stack (Preserves "Team members" locator) */}
        <div className="flex items-center gap-2 shrink-0 pb-1">
          <span className="text-xs font-mono text-on-surface-variant hidden sm:inline">
            Team members:
          </span>
          <div className="flex -space-x-1 overflow-hidden">
            {project.teamMembers.map((m, idx) => (
              <div
                key={idx}
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white shadow ring-1 ring-surface-container-lowest ${
                  m.color || "bg-primary"
                }`}
                title={`${m.name} (${m.role})`}
              >
                {m.initials}
              </div>
            ))}
          </div>
          {canManageProject && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("team");
                setShowAssignForm(true);
              }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition text-xs font-bold"
              title="Add member"
            >
              +
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Top Sprint Timeline */}
          <div>
            <ProjectTimelineWidget
              tasks={project.tasks}
              teamMembers={project.teamMembers}
            />
          </div>

          {/* Bottom Row: Associated Tasks & Workload Distribution */}
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            {/* Associated Tasks Card with required heading for E2E */}
            <div className="rounded-xl bg-surface-container-low border border-outline-variant/20 p-4 sm:p-5 flex flex-col transition-all shadow-xs">
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-outline-variant/15">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight text-on-surface font-headline-sm">Associated tasks</h2>
                  <p className="text-[11px] font-mono text-on-surface-variant">
                    {completedTasksCount}/{project.tasks.length} done ({taskCompletionRate}%)
                  </p>
                </div>
                {canManageProject && (
                  <button
                    type="button"
                    data-testid="project-add-task-btn"
                    onClick={openCreateTaskModal}
                    className="rounded-lg bg-surface-container hover:bg-surface-high border border-outline-variant/25 px-2.5 py-1 text-xs font-mono text-primary transition shadow-xs"
                  >
                    + Add task
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-72 scrollbar-thin">
                {project.tasks.length > 0 ? (
                  project.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-xl bg-surface-container border border-outline-variant/20 p-3 hover:bg-surface-high hover:border-outline/30 transition shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-on-surface truncate font-headline-sm">{task.title}</p>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-mono ${
                            priorityStyles[task.priority]
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-on-surface-variant">
                        <span>{task.assignee}</span>
                        <span>Due {task.due}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs font-mono text-on-surface-variant italic text-center py-6">
                    No tasks associated yet.
                  </p>
                )}
              </div>
            </div>

            {/* Workload Bar Chart */}
            <WorkloadChartWidget members={project.teamMembers} />
          </div>
        </div>
      )}

      {/* Tab: Tasks Full View */}
      {activeTab === "tasks" && (
        <section className="rounded-xl bg-surface-container-low border border-outline-variant/20 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-outline-variant/15">
            <div>
              <h2 className="text-base font-bold text-on-surface font-headline-sm">Associated tasks</h2>
              <p className="text-xs font-mono text-on-surface-variant">
                {completedTasksCount} / {project.tasks.length} completed ({taskCompletionRate}%)
              </p>
            </div>
            {canManageProject && (
              <button
                type="button"
                data-testid="project-add-task-btn"
                onClick={openCreateTaskModal}
                className="rounded-lg bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-3.5 py-1.5 text-xs font-medium shadow-xs transition"
              >
                + Add task
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {project.tasks.map((task) => (
              <div
                key={task.id}
                className="rounded bg-surface-container-lowest border border-outline/20 p-3 hover:bg-surface-container transition"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-on-surface">{task.title}</p>
                  <span
                    className={`rounded border px-2 py-0.5 text-[10px] font-mono uppercase ${
                      priorityStyles[task.priority]
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
                  <span>{task.assignee}</span>
                  <span>{task.status}</span>
                </div>
                <p className="mt-2 text-[10px] font-mono text-on-surface-variant">Due {task.due}</p>
              </div>
            ))}
          </div>
        </section>
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
        <section className="rounded bg-surface-container-low border border-outline/20 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-on-surface">Team Members</h2>
              <p className="text-xs font-mono text-on-surface-variant">
                {project.teamMembers.length} assigned members on this project
              </p>
            </div>

            {canManageProject && workspaceMembers.length > 0 && (
              <button
                type="button"
                data-testid="assign-member-toggle-btn"
                onClick={() => setShowAssignForm(!showAssignForm)}
                className="rounded bg-surface-container hover:bg-surface-container-highest border border-outline/20 px-3 py-1.5 text-xs font-mono text-primary transition"
              >
                {showAssignForm ? "Cancel" : "+ Assign Member"}
              </button>
            )}
          </div>

          {showAssignForm && (
            <form
              onSubmit={handleAssignMember}
              className="mb-4 rounded bg-surface-container border border-outline/20 p-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-on-surface-variant mb-1">
                    Select Workspace Member
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full rounded bg-surface-container-lowest border border-outline/20 p-2 text-xs text-on-surface focus:border-primary focus:outline-none"
                  >
                    {workspaceMembers.map((m) => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-on-surface-variant mb-1">
                    Project Role
                  </label>
                  <select
                    value={selectedProjectRole}
                    onChange={(e) =>
                      setSelectedProjectRole(
                        e.target.value as "lead" | "contributor" | "reviewer" | "viewer"
                      )
                    }
                    className="w-full rounded bg-surface-container-lowest border border-outline/20 p-2 text-xs text-on-surface focus:border-primary focus:outline-none"
                  >
                    <option value="contributor">Contributor</option>
                    <option value="lead">Project Lead</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-4 py-1.5 text-xs font-medium transition"
                >
                  {isPending ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {project.teamMembers.map((member) => (
              <div
                key={member.name}
                className="flex items-center justify-between rounded bg-surface-container-lowest border border-outline/20 p-3"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow ${
                      member.color || "bg-primary"
                    }`}
                  >
                    {member.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-on-surface">{member.name}</p>
                    <span className="text-[10px] font-mono text-on-surface-variant capitalize">
                      {member.role}
                    </span>
                  </div>
                </div>

                {canManageProject && member.name !== project.owner && member.id && (
                  <button
                    type="button"
                    onClick={() => handleRemoveProjectMember(member.id)}
                    disabled={isPending}
                    title="Remove from project"
                    className="rounded p-1 text-on-surface-variant hover:text-error hover:bg-error-container/20 transition"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tab: Activity */}
      {activeTab === "activity" && (
        <section className="rounded bg-surface-container-low border border-outline/20 p-4 sm:p-5">
          <h2 className="text-base font-bold text-on-surface mb-3">Recent Activity</h2>
          <div className="space-y-2">
            {project.recentActivity.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 rounded bg-surface-container-lowest border border-outline/20 p-2.5 text-xs text-on-surface"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
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
