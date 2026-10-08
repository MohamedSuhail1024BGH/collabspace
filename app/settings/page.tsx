import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/auth";
import { getActiveWorkspace } from "@/lib/db/workspace";
import { getWorkspaceMembers } from "@/lib/db/queries";
import { SettingsClient } from "@/components/dashboard/SettingsClient";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workspace Settings",
  description: "Manage workspace details, member roles, security configurations, and notifications.",
};

export default async function SettingsPage() {
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
      <SettingsClient user={user} workspace={activeWorkspace} initialMembers={members} />
    </div>
  );
}

