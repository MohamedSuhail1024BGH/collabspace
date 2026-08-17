"use client";

import { useMemo, useState } from "react";

import { TaskFilters } from "@/components/dashboard/TaskFilters";
import { TaskForm, type TaskDraft } from "@/components/dashboard/TaskForm";
import { TaskList } from "@/components/dashboard/TaskList";
import { TaskSummary } from "@/components/dashboard/TaskSummary";
import { taskBoard, type DashboardTask, type TaskPriority } from "@/data/mock-data";

const statusOptions = ["All", "Not started", "In progress", "Pending", "Review", "Blocked", "Completed"];
const priorityOptions = ["All", "High", "Medium", "Low"];

const getTodayValue = () => new Date().toISOString().slice(0, 10);

const buildDefaultDraft = (): TaskDraft => ({
  title: "",
  description: "",
  assignee: "Unassigned",
  priority: "Medium",
  status: "Not started",
  due: getTodayValue(),
  project: "General",
});

export default function TasksPage() {
  const [tasks, setTasks] = useState<DashboardTask[]>(taskBoard);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [draftTask, setDraftTask] = useState<TaskDraft | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const assigneeOptions = useMemo(
    () => ["All", ...Array.from(new Set(tasks.map((task) => task.assignee).filter(Boolean)))],
    [tasks],
  );

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
    setDraftTask(buildDefaultDraft());
    setIsFormOpen(true);
  };

  const openEditTask = (task: DashboardTask) => {
    setDraftTask({
      id: task.id,
      title: task.title,
      description: task.description,
      assignee: task.assignee,
      priority: task.priority,
      status: task.status,
      due: task.due,
      project: task.project ?? "General",
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setDraftTask(null);
    setIsFormOpen(false);
  };

  const updateDraftTask = (field: keyof TaskDraft, value: string) => {
    setDraftTask((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [field]: field === "priority" ? (value as TaskPriority) : value,
      };
    });
  };

  const handleSaveTask = () => {
    if (!draftTask) {
      return;
    }

    const normalizedTask = {
      ...draftTask,
      title: draftTask.title.trim() || "Untitled task",
      description: draftTask.description.trim(),
      assignee: draftTask.assignee.trim() || "Unassigned",
      project: draftTask.project.trim() || "General",
      due: draftTask.due || getTodayValue(),
      status: draftTask.status || "Not started",
      priority: (draftTask.priority || "Medium") as TaskPriority,
    };

    if (draftTask.id) {
      setTasks((current) =>
        current.map((task) =>
          task.id === draftTask.id
            ? {
                ...task,
                ...normalizedTask,
                priority: normalizedTask.priority,
              }
            : task,
        ),
      );
    } else {
      const createdTask: DashboardTask = {
        ...normalizedTask,
        id: `task-${Date.now()}`,
      };

      setTasks((current) => [createdTask, ...current]);
    }

    closeForm();
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((current) => current.filter((task) => task.id !== taskId));
  };

  const handleStatusChange = (taskId: string, status: string) => {
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, status } : task)),
    );
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
          <button
            type="button"
            onClick={openCreateTask}
            className="rounded-2xl bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400"
          >
            New task
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

        <TaskList
          tasks={filteredTasks}
          onEdit={openEditTask}
          onDelete={handleDeleteTask}
          onStatusChange={handleStatusChange}
          onResetFilters={handleResetFilters}
        />
      </section>

      {isFormOpen && draftTask ? (
        <TaskForm
          mode={draftTask.id ? "edit" : "create"}
          draft={draftTask}
          assigneeOptions={[...new Set([...tasks.map((task) => task.assignee), "Unassigned"])].filter(Boolean)}
          statusOptions={statusOptions.slice(1)}
          priorityOptions={["High", "Medium", "Low"]}
          onFieldChange={updateDraftTask}
          onCancel={closeForm}
          onSave={handleSaveTask}
        />
      ) : null}
    </>
  );
}
