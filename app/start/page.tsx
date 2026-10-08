import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/auth";
import { getUserWorkspacesWithDetails, searchWorkspaces } from "@/lib/db/queries";
import { StartClient } from "@/components/start/StartClient";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workspace Hub",
  description: "Select an existing workspace, create a new team hub, or discover public workspaces.",
};

export default async function StartPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const userWorkspaces = await getUserWorkspacesWithDetails(user.id);
  const publicWorkspaces = await searchWorkspaces("");

  return (
    <StartClient
      user={user}
      userWorkspaces={userWorkspaces}
      publicWorkspaces={publicWorkspaces}
    />
  );
}

