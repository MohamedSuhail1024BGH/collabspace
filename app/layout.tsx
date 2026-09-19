import type { Metadata } from "next";
import "./globals.css";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getActiveWorkspace, getAllWorkspaces } from "@/lib/db/workspace";
import { getCurrentUser } from "@/lib/db/auth";
import { getProjects } from "@/lib/db/queries";

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
  const projects = activeWorkspace ? await getProjects(activeWorkspace.id) : [];



  return (
    <html
      lang="en"
      className="h-full antialiased"
      data-accent="violet"
      data-density="comfortable"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('collabspace_accent_theme');
                if (theme) document.documentElement.setAttribute('data-accent', theme.toLowerCase());
                var density = localStorage.getItem('collabspace_density');
                if (density) document.documentElement.setAttribute('data-density', density.toLowerCase());
                var mode = localStorage.getItem('collabspace_theme_mode');
                if (mode) document.documentElement.setAttribute('data-theme', mode);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <DashboardShell
          user={user}
          activeWorkspace={activeWorkspace ?? undefined}
          workspaces={allWorkspaces}
          projects={projects.map((p) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            progress: p.progress,
            teamMembers: p.teamMembers,
          }))}
        >
          {children}
        </DashboardShell>
      </body>
    </html>
  );
}
