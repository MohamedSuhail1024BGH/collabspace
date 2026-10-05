"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { signupAction } from "@/app/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { User, Mail, Lock, AtSign, Eye, EyeOff, AlertCircle } from "lucide-react";

export function SignupClient() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await signupAction({
        name,
        username,
        email,
        password,
      });

      if (!res.success) {
        setError(res.error ?? "Failed to create account.");
        return;
      }

      router.push("/login?registered=true");
      router.refresh();
    });
  };

  return (
    <main className="flex min-h-screen flex-col justify-start sm:justify-center items-center bg-background px-4 py-8 sm:px-6 overflow-y-auto text-foreground">
      <div className="w-full max-w-md my-auto">
        {/* Brand Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center">
            <Logo size={48} className="h-12 w-12 shadow-md" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Create your account</h1>
          <p className="mt-1 text-xs text-muted-foreground">Start organizing projects and team execution today</p>
        </div>

        {/* Signup Card */}
        <Card className="border-border/60 shadow-xl backdrop-blur-xl">
          <CardContent className="p-6 sm:p-7">
            {error && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              <Field>
                <FieldLabel htmlFor="signup-name" className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                  Full Name
                </FieldLabel>
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="signup-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="pl-8 text-xs"
                  />
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="signup-email" className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                  Work Email
                </FieldLabel>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@company.com"
                    className="pl-8 text-xs"
                  />
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="signup-password" className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                  Password
                </FieldLabel>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="pl-8 pr-9 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    id="signup-show-password"
                    data-testid="signup-show-password"
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-0 cursor-pointer"
                  />
                  <label
                    htmlFor="signup-show-password"
                    className="cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground transition font-mono"
                  >
                    Show password
                  </label>
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="signup-username" className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                  Username <span className="text-primary font-normal">(@handle)</span>
                </FieldLabel>
                <div className="relative">
                  <AtSign className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="signup-username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="alexmorgan"
                    className="pl-8 text-xs font-mono"
                  />
                </div>
                <p className="mt-1 text-[11px] font-mono text-muted-foreground">
                  People can discover and invite you using this handle.
                </p>
              </Field>

              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-10 text-xs font-semibold rounded-full cursor-pointer shadow-xs"
              >
                {isPending ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Login Link */}
        <p className="mt-5 text-center text-xs font-mono text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
