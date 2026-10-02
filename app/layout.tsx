import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getActiveWorkspace, getAllWorkspaces } from "@/lib/db/workspace";
import { getCurrentUser } from "@/lib/db/auth";
import { getProjects } from "@/lib/db/queries";
import type { DbWorkspace } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CollabSpace",
  description: "A collaborative workspace dashboard for product teams.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#111319",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user = null;
  let activeWorkspace = null;
  let allWorkspaces: DbWorkspace[] = [];
  let projects: Awaited<ReturnType<typeof getProjects>> = [];

  try {
    user = await getCurrentUser();
    activeWorkspace = await getActiveWorkspace();
    allWorkspaces = await getAllWorkspaces();
    projects = activeWorkspace ? await getProjects(activeWorkspace.id) : [];
  } catch {
    // Database credentials are provided at runtime by the deployment platform;
    // gracefully fallback during build-time static prerendering.
  }

  return (
    <html
      lang="en"
      className="h-full antialiased overflow-x-hidden"
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
      <body className="min-h-full flex flex-col font-sans overflow-x-hidden w-full max-w-full">
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
