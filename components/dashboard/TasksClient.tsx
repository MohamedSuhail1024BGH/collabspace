"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteTaskAction,
  updateTaskAction,
  updateTaskStatusAction,
} from "@/app/actions";
import { TaskFilters } from "@/components/dashboard/TaskFilters";
import { TaskForm, type TaskDraft } from "@/components/dashboard/TaskForm";
import { TaskList } from "@/components/dashboard/TaskList";
import { TaskSummary } from "@/components/dashboard/TaskSummary";
import type { DashboardTask, TaskPriority } from "@/data/mock-data";
import type { DbTask } from "@/lib/db/schema";

const statusOptions = ["All", "Not started", "In progress", "Pending", "Review", "Blocked", "Completed"];
const priorityOptions = ["All", "High", "Medium", "Low"];

const getTodayValue = () => new Date().toISOString().slice(0, 10);

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

type ProjectOption = {
  id: string;
  name: string;
};

function toDashboardTask(t: DbTask): DashboardTask {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    assignee: t.assignee,
    priority: t.priority as TaskPriority,
    status: t.status,
    due: t.due,
    project: t.projectName ?? "General",
  };
}

export function TasksClient({
  initialTasks,
  workspaceMembers = [],
  projects = [],
  currentUser: _currentUser,
  userRole = "member",
  workspaceId: _workspaceId,
}: {
  initialTasks: DbTask[];
  workspaceMembers?: WorkspaceMemberItem[];
  projects?: ProjectOption[];
  currentUser?: { id: string; name: string; email: string };
  userRole?: string;
  workspaceId?: string;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState<DashboardTask[]>(() => initialTasks.map(toDashboardTask));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [draftTask, setDraftTask] = useState<TaskDraft | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [, startTransition] = useTransition();

  const isViewer = userRole === "viewer";

  const assigneeOptions = useMemo(() => {
    const memberNames = workspaceMembers.map((m) => m.user.name);
    const taskAssignees = tasks.map((task) => task.assignee).filter(Boolean);
    const unique = Array.from(new Set([...memberNames, ...taskAssignees, "Unassigned"]));
    return ["All", ...unique];
  }, [workspaceMembers, tasks]);

  const formAssigneeOptions = useMemo(() => {
    const memberNames = workspaceMembers.map((m) => m.user.name);
    const taskAssignees = tasks.map((task) => task.assignee).filter(Boolean);
    return Array.from(new Set([...memberNames, ...taskAssignees, "Unassigned"]));
  }, [workspaceMembers, tasks]);

  const projectOptions = useMemo(() => {
    return projects.map((p) => ({ id: p.id, name: p.name }));
  }, [projects]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesQuery =
        query.length === 0 ||
        task.title.toLowerCase().includes(query) ||
        task.assignee.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "All" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "All" || task.priority === priorityFilter;
      const matchesAssignee = assigneeFilter === "All" || task.assignee === assigneeFilter;

      return matchesQuery && matchesStatus && matchesPriority && matchesAssignee;
    });
  }, [assigneeFilter, priorityFilter, search, statusFilter, tasks]);

  const openEditTask = (task: DashboardTask) => {
    const matchedProj = projects.find((p) => p.name === task.project);
    setDraftTask({
      id: task.id,
      title: task.title,
      description: task.description,
      assignee: task.assignee,
      priority: task.priority,
      status: task.status,
      due: task.due,
      project: task.project ?? "General",
      projectId: matchedProj?.id,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setDraftTask(null);
    setIsFormOpen(false);
  };

  const updateDraftTask = (field: keyof TaskDraft, value: string) => {
    setDraftTask((current) => {
      if (!current) return current;
      return {
        ...current,
        [field]: field === "priority" ? (value as TaskPriority) : value,
      };
    });
  };

  const handleSaveTask = async () => {
    if (!draftTask || !draftTask.id) return;

    const normalizedTask = {
      title: draftTask.title.trim() || "Untitled task",
      description: draftTask.description.trim(),
      assignee: draftTask.assignee.trim() || "Unassigned",
      projectName: draftTask.project.trim() || "General",
      projectId: draftTask.projectId,
      due: draftTask.due || getTodayValue(),
      status: draftTask.status || "Not started",
      priority: (draftTask.priority || "Medium") as TaskPriority,
    };

    setIsSaving(true);
    const taskId = draftTask.id;
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              ...normalizedTask,
              project: normalizedTask.projectName,
            }
          : task,
      ),
    );

    await updateTaskAction(taskId, {
      title: normalizedTask.title,
      description: normalizedTask.description,
      assignee: normalizedTask.assignee,
      priority: normalizedTask.priority,
      status: normalizedTask.status,
      due: normalizedTask.due,
      projectId: normalizedTask.projectId,
      projectName: normalizedTask.projectName,
    });
    router.refresh();

    setIsSaving(false);
    closeForm();
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((current) => current.filter((task) => task.id !== taskId));
    startTransition(async () => {
      await deleteTaskAction(taskId);
    });
  };

  const handleStatusChange = (taskId: string, status: string) => {
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, status } : task)),
    );
    startTransition(async () => {
      await updateTaskStatusAction(taskId, status);
    });
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setAssigneeFilter("All");
  };

  return (
    <>
      <TaskSummary tasks={tasks} />

      <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-white">Task queue</h3>
        </div>

        <TaskFilters
          search={search}
          status={statusFilter}
          priority={priorityFilter}
          assignee={assigneeFilter}
          statusOptions={statusOptions}
          priorityOptions={priorityOptions}
          assigneeOptions={assigneeOptions}
          onSearchChange={setSearch}
          onStatusChange={setStatusFilter}
          onPriorityChange={setPriorityFilter}
          onAssigneeChange={setAssigneeFilter}
          onClear={handleResetFilters}
        />

        <TaskList
          tasks={filteredTasks}
          onEdit={!isViewer ? openEditTask : undefined}
          onDelete={!isViewer ? handleDeleteTask : undefined}
          onStatusChange={!isViewer ? handleStatusChange : undefined}
          onResetFilters={handleResetFilters}
        />
      </section>

      {isFormOpen && draftTask ? (
        <TaskForm
          mode={draftTask.id ? "edit" : "create"}
          draft={draftTask}
          assigneeOptions={formAssigneeOptions}
          projectOptions={projectOptions}
          statusOptions={statusOptions.slice(1)}
          priorityOptions={["High", "Medium", "Low"]}
          isSaving={isSaving}
          onFieldChange={updateDraftTask}
          onCancel={closeForm}
          onSave={handleSaveTask}
        />
      ) : null}
    </>
  );
}

