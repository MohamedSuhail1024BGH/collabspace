"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteTaskAction,
  updateTaskAction,
  updateTaskStatusAction,
  createTaskAction,
} from "@/app/actions";
import { TaskFilters } from "@/components/dashboard/TaskFilters";
import { TaskForm, type TaskDraft } from "@/components/dashboard/TaskForm";
import { TaskList } from "@/components/dashboard/TaskList";
import { TaskBoard } from "@/components/dashboard/TaskBoard";
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
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
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

  const openCreateTask = () => {
    setDraftTask({
      id: "",
      title: "",
      description: "",
      assignee: formAssigneeOptions[0] || "Unassigned",
      priority: "Medium",
      status: "Not started",
      due: getTodayValue(),
      project: projectOptions[0]?.name ?? "General",
      projectId: projectOptions[0]?.id,
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
    if (!draftTask) return;

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

    if (!draftTask.id) {
      setIsSaving(true);
      const res = await createTaskAction({
        workspaceId: _workspaceId,
        title: normalizedTask.title,
        description: normalizedTask.description,
        assignee: normalizedTask.assignee,
        priority: normalizedTask.priority,
        status: normalizedTask.status,
        due: normalizedTask.due,
        projectId: normalizedTask.projectId,
        projectName: normalizedTask.projectName,
      });
      if (res.success && res.id) {
        const createdTask: DashboardTask = {
          id: res.id,
          title: normalizedTask.title,
          description: normalizedTask.description,
          assignee: normalizedTask.assignee,
          priority: normalizedTask.priority,
          status: normalizedTask.status,
          due: normalizedTask.due,
          project: normalizedTask.projectName,
        };
        setTasks((prev) => [createdTask, ...prev]);
        closeForm();
        router.refresh();
      }
      setIsSaving(false);
      return;
    }

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
    <div className="space-y-4 sm:space-y-6 pb-12">
      <TaskSummary tasks={tasks} />

      <section className="rounded-xl bg-surface-container-low border border-outline-variant/20 p-4 sm:p-5 text-on-surface shadow-xs">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-outline-variant/15">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-on-surface font-headline-sm">Task queue</h1>
            <p className="text-[11px] font-mono text-on-surface-variant">Engineering tasks and execution queue</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="rounded-md bg-surface-container-high px-2 py-0.5 text-xs font-mono text-secondary">
              {filteredTasks.length} items
            </span>

            {/* Segmented View Switcher */}
            <div className="flex items-center gap-1 bg-surface-lowest p-0.5 rounded-lg border border-outline-variant/20">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`px-2.5 py-1 rounded-md font-mono text-xs flex items-center gap-1.5 transition-all ${
                  viewMode === "list"
                    ? "bg-surface-high text-on-surface shadow-xs font-medium"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span>List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("board")}
                className={`px-2.5 py-1 rounded-md font-mono text-xs flex items-center gap-1.5 transition-all ${
                  viewMode === "board"
                    ? "bg-surface-high text-on-surface shadow-xs font-medium"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4a1 1 0 001-1V5a1 1 0 00-1-1zm10 0h-4a1 1 0 00-1 1v14a1 1 0 001 1h4a1 1 0 001-1V5a1 1 0 00-1-1z" />
                </svg>
                <span>Board</span>
              </button>
            </div>

            {!isViewer && (
              <button
                type="button"
                onClick={openCreateTask}
                className="hidden sm:flex items-center gap-1.5 bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-3 py-1 rounded font-medium text-xs transition shadow-xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Task</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Chips Carousel (< md) inspired by stitch mobile view */}
        <div className="flex md:hidden items-center gap-1.5 overflow-x-auto no-scrollbar pb-3 mb-2 border-b border-outline/10">
          <button
            type="button"
            onClick={() => {
              setStatusFilter("All");
              setPriorityFilter("All");
            }}
            className={`flex items-center gap-1 px-3 py-1 rounded-full font-mono text-xs whitespace-nowrap active:scale-95 transition-all ${
              statusFilter === "All" && priorityFilter === "All"
                ? "bg-primary text-on-primary font-semibold shadow-xs"
                : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span>All</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-surface-lowest/50">
              {tasks.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setPriorityFilter("High")}
            className={`flex items-center gap-1 px-3 py-1 rounded-full font-mono text-xs whitespace-nowrap active:scale-95 transition-all ${
              priorityFilter === "High"
                ? "bg-error text-on-error font-semibold shadow-xs"
                : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span>High / Urgent</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-surface-lowest/50">
              {tasks.filter((t) => t.priority === "High").length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("In progress")}
            className={`flex items-center gap-1 px-3 py-1 rounded-full font-mono text-xs whitespace-nowrap active:scale-95 transition-all ${
              statusFilter === "In progress"
                ? "bg-primary text-on-primary font-semibold shadow-xs"
                : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span>In Progress</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-surface-lowest/50">
              {tasks.filter((t) => t.status === "In progress").length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("Completed")}
            className={`flex items-center gap-1 px-3 py-1 rounded-full font-mono text-xs whitespace-nowrap active:scale-95 transition-all ${
              statusFilter === "Completed"
                ? "bg-secondary text-on-secondary font-semibold shadow-xs"
                : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span>Completed</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-surface-lowest/50">
              {tasks.filter((t) => t.status === "Completed").length}
            </span>
          </button>
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

        {viewMode === "list" ? (
          <TaskList
            tasks={filteredTasks}
            onEdit={!isViewer ? openEditTask : undefined}
            onDelete={!isViewer ? handleDeleteTask : undefined}
            onStatusChange={!isViewer ? handleStatusChange : undefined}
            onResetFilters={handleResetFilters}
          />
        ) : (
          <TaskBoard
            tasks={filteredTasks}
            onEdit={!isViewer ? openEditTask : undefined}
            onDelete={!isViewer ? handleDeleteTask : undefined}
            onStatusChange={!isViewer ? handleStatusChange : undefined}
            onResetFilters={handleResetFilters}
          />
        )}
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
      {/* Mobile Floating Sticky Action Button (+ New Task) */}
      {!isViewer && (
        <div className="fixed bottom-20 right-4 md:hidden z-30">
          <button
            type="button"
            onClick={openCreateTask}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-primary hover:bg-primary-container text-on-primary font-mono text-xs font-bold shadow-xl active:scale-95 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Task</span>
            <span className="px-1.5 py-0.2 bg-on-primary/20 rounded text-[10px]">N</span>
          </button>
        </div>
      )}
    </div>
  );
}
