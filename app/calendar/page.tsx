import { getCalendarEvents, getWorkspaceMembers } from "@/lib/db/queries";
import { getActiveWorkspace, getUserRoleInWorkspace } from "@/lib/db/workspace";
import { CalendarClient } from "@/components/dashboard/CalendarClient";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/auth";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const activeWorkspace = await getActiveWorkspace();
  if (!activeWorkspace) {
    redirect("/start");
  }

  const [initialEvents, workspaceMembers, userRole] = await Promise.all([
    getCalendarEvents(activeWorkspace.id),
    getWorkspaceMembers(activeWorkspace.id),
    getUserRoleInWorkspace(activeWorkspace.id, user.id),
  ]);

  return (
    <CalendarClient
      key={activeWorkspace.id}
      initialEvents={initialEvents}
      workspaceMembers={workspaceMembers}
      userRole={userRole ?? "member"}
      currentUser={user}
      workspaceId={activeWorkspace.id}
    />
  );
}
