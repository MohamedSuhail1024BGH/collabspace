import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
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
  viewportFit: "cover",
  themeColor: "#111319",
  interactiveWidget: "resizes-content",
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
    if (user) {
      [activeWorkspace, allWorkspaces] = await Promise.all([
        getActiveWorkspace(),
        getAllWorkspaces(),
      ]);
      projects = activeWorkspace ? await getProjects(activeWorkspace.id) : [];
    }
  } catch {
    // Database credentials are provided at runtime by the deployment platform;
    // gracefully fallback during build-time static prerendering.
  }

  return (
    <html
      lang="en"
      className="h-full antialiased overflow-x-clip"
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
                var mode = localStorage.getItem('collabspace_theme_mode') || 'system';
                var resolved = mode;
                if (mode === 'system') {
                  resolved = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
                }
                document.documentElement.setAttribute('data-theme', resolved);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans overflow-x-clip w-full max-w-full">
        <NavigationProgress />
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
