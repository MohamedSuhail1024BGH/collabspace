import { StatCard } from "@/components/dashboard/StatCard";
import type { DashboardTask } from "@/data/mock-data";

const toDate = (value: string) => {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function TaskSummary({ tasks }: { tasks: DashboardTask[] }) {
  const inProgress = tasks.filter((task) => task.status === "In progress").length;
  const completed = tasks.filter((task) => task.status === "Completed").length;
  const overdue = tasks.filter((task) => {
    if (task.status === "Completed") {
      return false;
    }

    const dueDate = toDate(task.due);
    if (!dueDate) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  }).length;

  const cards = [
    { label: "Total tasks", value: tasks.length.toString(), change: "Across all workstreams" },
    { label: "In progress", value: inProgress.toString(), change: inProgress > 0 ? `${inProgress} active currently` : "None in progress" },
    { label: "Completed", value: completed.toString(), change: completed > 0 ? `${completed} delivered` : "None completed" },
    { label: "Overdue", value: overdue.toString(), change: overdue > 0 ? `${overdue} overdue items` : "All on schedule" },
  ];

  return (
    <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <StatCard key={card.label} label={card.label} value={card.value} change={card.change} />
      ))}
    </section>
  );
}
