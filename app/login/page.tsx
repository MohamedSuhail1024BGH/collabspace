import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/auth";
import { LoginClient } from "@/components/auth/LoginClient";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }
  return (
    <Suspense fallback={<div className="flex min-h-screen min-h-dvh items-center justify-center bg-surface" />}>
      <LoginClient />
    </Suspense>
  );
}

