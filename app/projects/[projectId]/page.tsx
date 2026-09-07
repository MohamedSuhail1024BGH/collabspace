import { notFound, redirect } from "next/navigation";
import { ProjectDetailView } from "@/components/dashboard/ProjectDetailView";
import { getProjectById } from "@/lib/db/queries";
import { getCurrentUser } from "@/lib/db/auth";
import type { Project } from "@/data/mock-data";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { projectId } = await params;
  const project = await getProjectById(projectId);

  if (!project) {
    notFound();
  }

  const mappedProject: Project = {
    id: project.id,
    name: project.name,
    progress: project.progress,
    due: project.due,
    owner: project.owner,
    status: project.status,
    overview: project.overview,
    teamMembers: project.teamMembers,
    recentActivity: project.recentActivity,
    tasks: project.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      assignee: t.assignee,
      priority: t.priority as "High" | "Medium" | "Low",
      status: t.status,
      due: t.due,
    })),
  };

  return <ProjectDetailView project={mappedProject} />;
}
