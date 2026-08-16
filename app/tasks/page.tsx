import { taskBoard } from "@/data/mock-data";
import { TaskRow } from "@/components/dashboard/TaskRow";

export default function TasksPage() {
  return (
    <>
      <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Task queue</h3>
          <button type="button" className="text-sm text-violet-300 hover:text-violet-200">
            Add task
          </button>
        </div>

        <div className="space-y-3">
          {taskBoard.map((task) => (
            <TaskRow
              key={task.title}
              task={{
                title: task.title,
                priority: task.priority,
                assignee: task.assignee,
                time: task.due,
              }}
            />
          ))}
        </div>
      </section>
    </>
  );
}
