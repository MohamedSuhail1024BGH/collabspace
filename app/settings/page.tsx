import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/auth";
import { getActiveWorkspace } from "@/lib/db/workspace";
import { SettingsClient } from "@/components/dashboard/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const activeWorkspace = await getActiveWorkspace();

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8">
      <SettingsClient user={user} workspace={activeWorkspace} />
    </div>
  );
}

