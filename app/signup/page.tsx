import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/auth";
import { SignupClient } from "@/components/auth/SignupClient";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }
  return <SignupClient />;
}

