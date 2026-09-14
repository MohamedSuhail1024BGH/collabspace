import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/auth";
import { getUserWorkspacesWithDetails, searchWorkspaces } from "@/lib/db/queries";
import { StartClient } from "@/components/start/StartClient";

export const dynamic = "force-dynamic";

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

