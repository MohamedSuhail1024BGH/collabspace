import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import { CookieBanner } from "@/components/ui/CookieBanner";
import { DevelopmentNoticeModal } from "@/components/ui/DevelopmentNoticeModal";
import { AnalyticsProvider } from "@/components/ui/AnalyticsProvider";
import { getActiveWorkspace, getAllWorkspaces } from "@/lib/db/workspace";
import { getCurrentUser } from "@/lib/db/auth";
import { getProjects } from "@/lib/db/queries";
import type { DbWorkspace } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://collabspace.app"),
  title: {
    default: "CollabSpace — Collaborative Workspace for Product Teams",
    template: "%s | CollabSpace",
  },
  description:
    "A modern collaborative workspace dashboard for product teams to organize projects, track tasks, coordinate schedules, and ship faster together.",
  applicationName: "CollabSpace",
  keywords: [
    "collaboration",
    "project management",
    "task tracker",
    "team workspace",
    "kanban",
    "product management",
  ],
  authors: [{ name: "CollabSpace Team" }],
  creator: "CollabSpace",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/icon.svg" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://collabspace.app",
    siteName: "CollabSpace",
    title: "CollabSpace — Work Together, In Context",
    description:
      "A high-performance workspace dashboard for product teams to organize projects, track tasks, and ship faster together.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CollabSpace — Work Together, In Context",
    description:
      "A modern collaborative workspace for fast-moving product teams.",
    creator: "@collabspace",
  },
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
        <Suspense fallback={null}>
          <AnalyticsProvider />
        </Suspense>
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
        <CookieBanner />
        <DevelopmentNoticeModal />
      </body>
    </html>
  );
}
