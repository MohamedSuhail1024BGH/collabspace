import { getConversations } from "@/lib/db/queries";
import { getActiveWorkspace } from "@/lib/db/workspace";
import { MessagesClient } from "@/components/dashboard/MessagesClient";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/auth";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const activeWorkspace = await getActiveWorkspace();
  const initialConversations = await getConversations(activeWorkspace.id);
  return <MessagesClient key={activeWorkspace.id} initialConversations={initialConversations} />;
}
