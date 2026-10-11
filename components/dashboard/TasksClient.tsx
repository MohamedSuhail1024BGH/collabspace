"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTaskAction, deleteTaskAction, updateTaskAction, updateTaskStatusAction } from "@/app/actions-tasks";
import { TaskFilters } from "@/components/dashboard/TaskFilters";
import { TaskForm, type TaskDraft } from "@/components/dashboard/TaskForm";
import { TaskList } from "@/components/dashboard/TaskList";
import { TaskBoard } from "@/components/dashboard/TaskBoard";
import { TaskSummary } from "@/components/dashboard/TaskSummary";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { List, Kanban, Plus } from "lucide-react";
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
  currentUser,
  userRole = "member",
  workspaceId,
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

  const openCreateTask = () => {
    setDraftTask({
      title: "",
      description: "",
      assignee: currentUser?.name ?? workspaceMembers[0]?.user.name ?? "Unassigned",
      priority: "Medium",
      status: "Not started",
      due: getTodayValue(),
      project: "General",
      projectId: undefined,
    });
    setIsFormOpen(true);
  };

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

    setIsSaving(true);
    if (draftTask.id) {
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
    } else {
      const res = await createTaskAction({
        workspaceId,
        title: normalizedTask.title,
        description: normalizedTask.description,
        assignee: normalizedTask.assignee,
        priority: normalizedTask.priority,
        status: normalizedTask.status,
        due: normalizedTask.due,
        projectId: normalizedTask.projectId,
        projectName: normalizedTask.projectName,
      });
      if (res && res.id) {
        setTasks((current) => [
          {
            id: res.id,
            ...normalizedTask,
            project: normalizedTask.projectName,
          },
          ...current,
        ]);
      }
    }
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
    <div className="flex flex-col gap-5 sm:gap-6 pb-12">
      <TaskSummary tasks={tasks} />

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg font-bold">Task Queue</CardTitle>
            <CardDescription className="text-xs">
              Engineering work items, priorities, and execution status
            </CardDescription>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            {!isViewer && (
              <Button
                size="sm"
                data-testid="tasks-new-task-btn"
                onClick={openCreateTask}
                className="gap-1.5 h-8 rounded-full shadow-xs cursor-pointer font-semibold"
              >
                <Plus className="size-3.5" />
                <span>New Task</span>
              </Button>
            )}

            <Badge variant="secondary" className="font-mono text-xs">
              {filteredTasks.length} items
            </Badge>

            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(val) => val && setViewMode(val as "list" | "board")}
              className="bg-secondary/60 p-0.5 rounded-lg border border-border"
            >
              <ToggleGroupItem value="list" size="sm" className="h-7 px-2.5 gap-1.5 text-xs font-medium">
                <List className="size-3.5" />
                <span>List</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="board" size="sm" className="h-7 px-2.5 gap-1.5 text-xs font-medium">
                <Kanban className="size-3.5" />
                <span>Board</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>

        <CardContent className="pt-0 flex flex-col gap-4">
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
              onCreateTask={!isViewer ? openCreateTask : undefined}
              hasActiveFilters={Boolean(search.trim() || statusFilter !== "All" || priorityFilter !== "All" || assigneeFilter !== "All")}
            />
          ) : (
            <TaskBoard
              tasks={filteredTasks}
              onEdit={!isViewer ? openEditTask : undefined}
              onDelete={!isViewer ? handleDeleteTask : undefined}
              onStatusChange={!isViewer ? handleStatusChange : undefined}
              onResetFilters={handleResetFilters}
              onCreateTask={!isViewer ? openCreateTask : undefined}
              hasActiveFilters={Boolean(search.trim() || statusFilter !== "All" || priorityFilter !== "All" || assigneeFilter !== "All")}
            />
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
