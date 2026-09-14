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
        >
          {children}
        </DashboardShell>
      </body>
    </html>
  );
}
