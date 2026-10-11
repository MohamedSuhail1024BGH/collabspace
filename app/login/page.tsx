import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/auth";
import { LoginClient } from "@/components/auth/LoginClient";
import { Loader } from "@/components/ui/Loader";
import { StatusNoticeDialog } from "@/components/marketing/StatusNoticeDialog";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your CollabSpace workspace to manage projects, tasks, and team execution.",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }
  return (
    <>
      <StatusNoticeDialog />
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-surface">
            <Loader label="Loading authentication..." />
          </div>
        }
      >
        <LoginClient />
      </Suspense>
    </>
  );
}

