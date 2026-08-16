import { notFound } from "next/navigation";

import { ProjectDetailView } from "@/components/dashboard/ProjectDetailView";
import { projectDirectory } from "@/data/mock-data";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = projectDirectory.find((entry) => entry.id === projectId);

  if (!project) {
    notFound();
  }

  return <ProjectDetailView project={project} />;
}
