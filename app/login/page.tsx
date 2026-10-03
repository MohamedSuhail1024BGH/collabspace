import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/auth";
import { LoginClient } from "@/components/auth/LoginClient";
import { Loader } from "@/components/ui/Loader";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface">
          <Loader label="Loading authentication..." />
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}

