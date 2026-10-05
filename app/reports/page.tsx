import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/auth";
import { getActiveWorkspace } from "@/lib/db/workspace";
import { getWorkspaceReportsData } from "@/lib/db/queries";
import { ReportsWorkspace } from "@/components/dashboard/ReportsWorkspace";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const activeWorkspace = await getActiveWorkspace();
  if (!activeWorkspace) {
    redirect("/start");
  }

  const reportsData = await getWorkspaceReportsData(activeWorkspace.id);

  return (
    <div className="space-y-6 pb-12 w-full max-w-full">
      <ReportsWorkspace data={reportsData} workspaceName={activeWorkspace.name} />
    </div>
  );
}
