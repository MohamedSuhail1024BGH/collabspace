import { getProjects } from "@/lib/db/queries";
import { getActiveWorkspace } from "@/lib/db/workspace";
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
  const initialProjects = await getProjects(activeWorkspace.id);
  return <ProjectsClient key={activeWorkspace.id} initialProjects={initialProjects} />;
}
