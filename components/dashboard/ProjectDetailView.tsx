"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { assignProjectMemberAction, removeProjectMemberAction, createTaskAction } from "@/app/actions";
import { TaskForm, type TaskDraft } from "@/components/dashboard/TaskForm";
import type { Project, TaskPriority } from "@/data/mock-data";

const priorityStyles = {
  High: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  Medium: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  Low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
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
  const [selectedUserId, setSelectedUserId] = useState(workspaceMembers[0]?.user.id ?? "");
  const [selectedProjectRole, setSelectedProjectRole] = useState<"lead" | "contributor" | "reviewer" | "viewer">("contributor");
  const [showAssignForm, setShowAssignForm] = useState(false);

  // Task modal state (matching Tasks route TaskForm interface)
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
    project.tasks.length > 0 ? Math.round((completedTasksCount / project.tasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-violet-200">Project detail</p>
            <h3 className="mt-3 text-3xl font-semibold text-white">{project.name}</h3>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/projects"
              className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 transition hover:border-violet-500/40 hover:text-white"
            >
              Back to projects
            </Link>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              {project.status}
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Owner</p>
            <p className="mt-3 text-xl font-semibold text-white">{project.owner}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Progress</p>
            <p className="mt-3 text-xl font-semibold text-white">{project.progress}%</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Due date</p>
            <p className="mt-3 text-xl font-semibold text-white">{project.due}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Health</p>
            <p className="mt-3 text-xl font-semibold text-white">
              {project.progress >= 70 ? "Strong" : project.progress >= 50 ? "Steady" : "Needs focus"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Project overview</h3>
              <span className="text-xs text-slate-400">Summary</span>
            </div>
            <p className="text-base leading-7 text-slate-300">{project.overview}</p>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                <span>Overall progress</span>
                <span>{project.progress}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Recent activity</h3>
              <span className="text-xs text-slate-400">Updated today</span>
            </div>

            <div className="space-y-3">
              {project.recentActivity.map((item, idx) => (
                <div key={idx} className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-300">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-violet-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {/* Project Team Members with Granular Roles */}
          <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Team Members</h3>
                <span className="text-xs text-slate-400">{project.teamMembers.length} assigned members</span>
              </div>

              {canManageProject && workspaceMembers.length > 0 && (
                <button
                  type="button"
                  data-testid="assign-member-toggle-btn"
                  onClick={() => setShowAssignForm(!showAssignForm)}
                  className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-500/20 transition"
                >
                  {showAssignForm ? "Cancel" : "+ Assign Member"}
                </button>
              )}
            </div>

            {/* Assign Member Form */}
            {showAssignForm && (
              <form onSubmit={handleAssignMember} className="mb-4 rounded-2xl border border-violet-500/30 bg-slate-950/70 p-3.5 space-y-3">
                <p className="text-xs font-semibold text-white">Assign Workspace Member to Project</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase">Select Member</label>
                    <select
                      data-testid="assign-user-select"
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:border-violet-400 focus:outline-none"
                    >
                      {workspaceMembers.map((m) => (
                        <option key={m.user.id} value={m.user.id}>
                          {m.user.name} (@{m.user.username || "user"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase">Project Role</label>
                    <select
                      data-testid="assign-project-role-select"
                      value={selectedProjectRole}
                      onChange={(e) => setSelectedProjectRole(e.target.value as "lead" | "contributor" | "reviewer" | "viewer")}
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:border-violet-400 focus:outline-none"
                    >
                      <option value="lead">Project Lead</option>
                      <option value="contributor">Contributor</option>
                      <option value="reviewer">Reviewer</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    data-testid="submit-assign-member-btn"
                    disabled={isPending || !selectedUserId}
                    className="rounded-xl bg-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition"
                  >
                    {isPending ? "Assigning..." : "Confirm Assignment"}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {project.teamMembers.map((member) => {
                const roleColor =
                  member.role.toLowerCase() === "lead" || member.role.toLowerCase() === "project owner"
                    ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                    : member.role.toLowerCase() === "reviewer"
                    ? "bg-violet-500/15 text-violet-300 border-violet-500/30"
                    : member.role.toLowerCase() === "viewer"
                    ? "bg-slate-800 text-slate-400 border-slate-700"
                    : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";

                return (
                  <div key={member.name} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white shadow ${member.color || "bg-violet-500"}`}>
                        {member.initials}
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">{member.name}</p>
                        <span className={`inline-block mt-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${roleColor}`}>
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
                        className="rounded-lg p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Associated Tasks */}
          <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Associated tasks</h3>
                <span className="text-xs text-slate-400">
                  {completedTasksCount} / {project.tasks.length} completed ({taskCompletionRate}%)
                </span>
              </div>

              {canManageProject && (
                <button
                  type="button"
                  data-testid="project-add-task-btn"
                  onClick={openCreateTaskModal}
                  className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition"
                >
                  + Add task
                </button>
              )}
            </div>

            <div className="space-y-3">
              {project.tasks.map((task) => (
                <div key={task.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-medium text-white">{task.title}</p>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${priorityStyles[task.priority]}`}>
                      {task.priority}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{task.assignee}</span>
                    <span>{task.status}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Due {task.due}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {isTaskModalOpen && taskDraft && (
        <TaskForm
          mode="create"
          draft={taskDraft}
          assigneeOptions={assigneeOptions}
          projectOptions={projectOptions}
          statusOptions={["Not started", "In progress", "Pending", "Review", "Blocked", "Completed"]}
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
