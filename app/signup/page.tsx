import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/auth";
import { SignupClient } from "@/components/auth/SignupClient";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create an Account",
  description: "Join CollabSpace today. Set up your workspace, invite teammates, and start organizing projects.",
};

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }
  return <SignupClient />;
}

