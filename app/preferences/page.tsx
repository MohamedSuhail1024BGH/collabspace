import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/auth";
import { getActiveWorkspace } from "@/lib/db/workspace";
import { getWorkspaceMembers } from "@/lib/db/queries";
import { WorkspacePreferencesClient } from "@/components/dashboard/WorkspacePreferencesClient";

export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const activeWorkspace = await getActiveWorkspace();
  if (!activeWorkspace) {
    redirect("/start");
  }
  const members = await getWorkspaceMembers(activeWorkspace.id);

  return (
    <div className="space-y-6 pb-12 w-full max-w-full">
      <WorkspacePreferencesClient user={user} workspace={activeWorkspace} initialMembers={members} />
    </div>
  );
}

