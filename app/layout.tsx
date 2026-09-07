import type { Metadata } from "next";
import "./globals.css";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getActiveWorkspace, getAllWorkspaces } from "@/lib/db/workspace";
import { getCurrentUser } from "@/lib/db/auth";

export const metadata: Metadata = {
  title: "CollabSpace",
  description: "A collaborative workspace dashboard for product teams.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const activeWorkspace = await getActiveWorkspace();
  const allWorkspaces = await getAllWorkspaces();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <DashboardShell
          user={user}
          activeWorkspace={activeWorkspace}
          workspaces={allWorkspaces}
        >
          {children}
        </DashboardShell>
      </body>
    </html>
  );
}
