import { getConversations, getWorkspaceMembers } from "@/lib/db/queries";
import { getActiveWorkspace } from "@/lib/db/workspace";
import { MessagesClient } from "@/components/dashboard/MessagesClient";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/auth";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Messages & Channels",
  description: "Real-time team chat, direct messaging, channels, and discussions within your workspace.",
};

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const activeWorkspace = await getActiveWorkspace();
  if (!activeWorkspace) {
    redirect("/start");
  }

  const [initialConversations, workspaceMembers] = await Promise.all([
    getConversations(activeWorkspace.id, user.id),
    getWorkspaceMembers(activeWorkspace.id),
  ]);

  return (
    <MessagesClient
      key={activeWorkspace.id}
      workspaceId={activeWorkspace.id}
      currentUser={user}
      workspaceMembers={workspaceMembers}
      initialConversations={initialConversations}
    />
  );
}
