import { notFound, redirect } from "next/navigation";
import { ProjectDetailView } from "@/components/dashboard/ProjectDetailView";
import { getProjectById, getWorkspaceMembers } from "@/lib/db/queries";
import { getCurrentUser } from "@/lib/db/auth";
import { getActiveWorkspace, getUserRoleInWorkspace } from "@/lib/db/workspace";
import type { Project } from "@/data/mock-data";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId } = await params;
  const project = await getProjectById(projectId);
  if (!project) {
    return {
      title: "Project Not Found",
      description: "The requested project could not be found.",
    };
  }
  return {
    title: `${project.name} — Project Details`,
    description:
      project.overview ||
      `Manage tasks, timelines, and milestones for project ${project.name}.`,
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const activeWorkspace = await getActiveWorkspace();
  if (!activeWorkspace) {
    redirect("/start");
  }

  const { projectId } = await params;
  const project = await getProjectById(projectId, activeWorkspace.id);

  if (!project) {
    notFound();
  }

  const [workspaceMembers, userRole] = await Promise.all([
    getWorkspaceMembers(activeWorkspace.id),
    getUserRoleInWorkspace(activeWorkspace.id, user.id),
  ]);

  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";
  const isLead =
    (project.ownerUserId ? project.ownerUserId === user.id : false) ||
    project.teamMembers.some((m) => m.userId === user.id && (m.role === "lead" || m.role === "Project owner"));
  const canManageProject = isOwnerOrAdmin || isLead;

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

  return (
    <ProjectDetailView
      project={mappedProject}
      workspaceMembers={workspaceMembers}
      canManageProject={canManageProject}
      currentUser={user}
      workspaceId={activeWorkspace.id}
    />
  );
}
