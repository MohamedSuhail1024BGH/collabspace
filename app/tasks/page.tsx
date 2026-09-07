import { getTasks } from "@/lib/db/queries";
import { getActiveWorkspace } from "@/lib/db/workspace";
import { TasksClient } from "@/components/dashboard/TasksClient";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/auth";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const activeWorkspace = await getActiveWorkspace();
  const initialTasks = await getTasks(activeWorkspace.id);
  return <TasksClient key={activeWorkspace.id} initialTasks={initialTasks} />;
}
