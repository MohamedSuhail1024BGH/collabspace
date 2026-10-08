import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createSession } from "@/lib/db/auth";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/login?confirmed=true";

  const supabase = await createClient();

  let user = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      user = data.user;
    }
  } else if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error && data.user) {
      user = data.user;
    }
  } else {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      user = data.user;
    }
  }

  if (user) {
    const email = user.email?.toLowerCase();
    if (email) {
      const name = (user.user_metadata?.name as string) || email.split("@")[0];
      const username =
        (user.user_metadata?.username as string) ||
        email.split("@")[0].replace(/[^a-z0-9_]/g, "");

      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!existing) {
        await db.insert(users).values({
          id: user.id,
          email,
          username,
          name,
          passwordHash: "supabase_auth_managed",
          createdAt: new Date().toISOString(),
        });
      }

      await createSession(user.id);
    }

    const redirectUrl = new URL(next, origin);
    return NextResponse.redirect(redirectUrl);
  }

  const fallbackUrl = new URL(
    `/login?error=${encodeURIComponent(
      "Email verification link expired or invalid. Please sign in or request a new confirmation email."
    )}`,
    origin
  );
  return NextResponse.redirect(fallbackUrl);
}
