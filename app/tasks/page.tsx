import { getProjects, getTasks, getWorkspaceMembers } from "@/lib/db/queries";
import { getActiveWorkspace, getUserRoleInWorkspace } from "@/lib/db/workspace";
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
  if (!activeWorkspace) {
    redirect("/start");
  }

  const [initialTasks, workspaceMembers, projects, userRole] = await Promise.all([
    getTasks(activeWorkspace.id),
    getWorkspaceMembers(activeWorkspace.id),
    getProjects(activeWorkspace.id),
    getUserRoleInWorkspace(activeWorkspace.id, user.id),
  ]);

  return (
    <TasksClient
      key={activeWorkspace.id}
      initialTasks={initialTasks}
      workspaceMembers={workspaceMembers}
      projects={projects}
      currentUser={user}
      userRole={userRole ?? "member"}
      workspaceId={activeWorkspace.id}
    />
  );
}
