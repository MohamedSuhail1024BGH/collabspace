"use client";

import { ReportsWorkspace } from "@/components/dashboard/ReportsWorkspace";

export default function ReportsPage() {
  return (
    <div className="space-y-6 px-4 py-6 lg:px-8">
      {/* ReportsWorkspace is a client interactive workspace built from deterministic mock data */}
      <ReportsWorkspace />
    </div>
  );
}
