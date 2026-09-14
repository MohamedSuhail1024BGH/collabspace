import { getProjects, getWorkspaceMembers } from "@/lib/db/queries";
import { getActiveWorkspace, getUserRoleInWorkspace } from "@/lib/db/workspace";
import { ProjectsClient } from "@/components/dashboard/ProjectsClient";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/auth";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const activeWorkspace = await getActiveWorkspace();
  if (!activeWorkspace) {
    redirect("/start");
  }

  const [initialProjects, workspaceMembers, userRole] = await Promise.all([
    getProjects(activeWorkspace.id),
    getWorkspaceMembers(activeWorkspace.id),
    getUserRoleInWorkspace(activeWorkspace.id, user.id),
  ]);

  return (
    <ProjectsClient
      key={activeWorkspace.id}
      initialProjects={initialProjects}
      workspaceMembers={workspaceMembers}
      currentUser={user}
      userRole={userRole ?? "member"}
    />
  );
}
