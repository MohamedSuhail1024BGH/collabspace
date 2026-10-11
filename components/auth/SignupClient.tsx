"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { signupAction } from "@/app/actions-auth";
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
    <main className="flex min-h-dvh sm:min-h-screen flex-col justify-center items-center bg-background px-4 py-6 sm:py-8 sm:px-6 overflow-y-auto text-foreground">
      <div className="w-full max-w-sm sm:max-w-[400px] lg:max-w-5xl my-auto">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
          {/* ── Hero / Value Proposition (desktop only — visible lg+) ── */}
          <div className="hidden lg:flex lg:flex-col lg:gap-6 lg:pr-8">
            <div className="flex items-center gap-3">
              <Logo size={48} className="shadow-md" />
              <span className="text-2xl font-bold tracking-tight text-foreground">CollabSpace</span>
            </div>

            <div>
              <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                Ship faster,<br />together.
              </h1>
              <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-md">
                Join thousands of product teams using CollabSpace to plan, track, and deliver projects with clarity.
              </p>
            </div>

            {/* Feature highlights */}
            <ul className="space-y-3 text-sm text-muted-foreground" aria-label="What you get">
              <li className="flex items-center gap-3">
                <User className="size-5 text-primary shrink-0" aria-hidden="true" />
                <span>Personal and team workspaces, free to start</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="size-5 text-primary shrink-0" aria-hidden="true" />
                <span>Built-in messaging with real-time updates</span>
              </li>
              <li className="flex items-center gap-3">
                <Lock className="size-5 text-primary shrink-0" aria-hidden="true" />
                <span>Enterprise-grade security and access control</span>
              </li>
            </ul>

            <p className="text-xs text-muted-foreground/60 font-mono">
              No credit card required · Free plan available
            </p>
          </div>

          {/* ── Signup Form Column ── */}
          <div className="w-full max-w-sm sm:max-w-[400px] mx-auto lg:mx-0">
            {/* Brand Header (mobile only — hidden on lg+) */}
            <div className="mb-3.5 sm:mb-4 text-center lg:hidden">
              <div className="mx-auto mb-2.5 flex items-center justify-center">
                <Logo size={44} className="h-11 w-11 sm:h-12 sm:w-12 shadow-md" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Create your account</h1>
              <p className="mt-1 text-xs text-muted-foreground">Start organizing projects and team execution today</p>
            </div>

            {/* Desktop-only heading above card */}
            <div className="hidden lg:block mb-4">
              <h2 className="text-xl font-bold tracking-tight text-foreground">Create your account</h2>
              <p className="mt-1 text-xs text-muted-foreground">Start organizing projects and team execution today</p>
            </div>

            {/* Signup Card */}
            <Card className="border-border/60 shadow-xl backdrop-blur-xl">
              <CardContent className="p-6 md:p-6">
                {error && (
                  <div
                    id="signup-error-message"
                    role="alert"
                    aria-live="assertive"
                    className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2 animate-in fade-in"
                  >
                    <AlertCircle className="size-4 shrink-0 mt-0.5 text-destructive" aria-hidden="true" />
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                <form onSubmit={handleSignup} className="space-y-4" noValidate>
                  <Field>
                    <FieldLabel htmlFor="signup-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Full Name
                    </FieldLabel>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="signup-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        required
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? "signup-error-message" : undefined}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Alex Morgan"
                        className={`pl-9 text-sm h-10 rounded-xl ${
                          error ? "border-destructive focus-visible:ring-destructive" : ""
                        }`}
                      />
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="signup-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Work Email
                    </FieldLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? "signup-error-message" : undefined}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@company.com"
                        className={`pl-9 text-sm h-10 rounded-xl ${
                          error ? "border-destructive focus-visible:ring-destructive" : ""
                        }`}
                      />
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="signup-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Password
                    </FieldLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="signup-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        minLength={6}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? "signup-error-message" : undefined}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className={`pl-9 pr-10 text-sm h-10 rounded-xl ${
                          error ? "border-destructive focus-visible:ring-destructive" : ""
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2 py-0.5">
                      <input
                        id="signup-show-password"
                        data-testid="signup-show-password"
                        type="checkbox"
                        checked={showPassword}
                        onChange={(e) => setShowPassword(e.target.checked)}
                        className="size-4 rounded border-input text-primary focus:ring-0 cursor-pointer"
                      />
                      <label
                        htmlFor="signup-show-password"
                        className="cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground transition font-medium"
                      >
                        Show password
                      </label>
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="signup-username" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Username <span className="text-primary font-normal">(@handle)</span>
                    </FieldLabel>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="signup-username"
                        name="username"
                        type="text"
                        autoComplete="username"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                        placeholder="alexmorgan"
                        className="pl-9 text-sm h-10 rounded-xl"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      People can discover and invite you using this handle.
                    </p>
                  </Field>

                  <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-10 text-xs sm:text-sm font-semibold rounded-full cursor-pointer shadow-xs mt-2"
                  >
                    {isPending ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Login Link */}
            <p className="mt-4 sm:mt-4.5 text-center text-xs text-muted-foreground font-medium">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
