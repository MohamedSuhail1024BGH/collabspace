import { getCalendarEvents } from "@/lib/db/queries";
import { getActiveWorkspace } from "@/lib/db/workspace";
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
  const initialEvents = await getCalendarEvents(activeWorkspace.id);
  return <CalendarClient key={activeWorkspace.id} initialEvents={initialEvents} />;
}
