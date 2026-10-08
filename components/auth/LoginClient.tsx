"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { loginAction } from "@/app/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { CheckCircle2, AlertCircle, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { ForgotPasswordModal } from "@/components/auth/ForgotPasswordModal";

export function LoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "true";
  const confirmed =
    searchParams.get("confirmed") === "true" || searchParams.get("verified") === "true";
  const deleted = searchParams.get("deleted") === "true";
  const urlError = searchParams.get("error");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await loginAction({ email, password });
      if (!res.success) {
        setError(res.error ?? "Failed to log in.");
        return;
      }
      router.push("/start");
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
                Work together,<br />in context.
              </h1>
              <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-md">
                The collaborative workspace where teams organize projects, track tasks, and ship faster — all in one place.
              </p>
            </div>

            {/* Feature highlights */}
            <ul className="space-y-3 text-sm text-muted-foreground" aria-label="Key features">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="size-5 text-emerald-500 shrink-0" aria-hidden="true" />
                <span>Real-time project tracking and task boards</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="size-5 text-emerald-500 shrink-0" aria-hidden="true" />
                <span>Team messaging and calendar coordination</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="size-5 text-emerald-500 shrink-0" aria-hidden="true" />
                <span>Reports, analytics, and workload insights</span>
              </li>
            </ul>
          </div>

          {/* ── Login Form Column ── */}
          <div className="w-full max-w-sm sm:max-w-[400px] mx-auto lg:mx-0">
            {/* Brand Header (mobile only — hidden on lg+) */}
            <div className="mb-3.5 sm:mb-4 text-center lg:hidden">
              <div className="mx-auto mb-2.5 flex items-center justify-center">
                <Logo size={44} className="h-11 w-11 sm:h-12 sm:w-12 shadow-md" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
              <p className="mt-1 text-xs text-muted-foreground">Sign in to your CollabSpace workspace</p>
            </div>

            {/* Desktop-only heading above card */}
            <div className="hidden lg:block mb-4">
              <h2 className="text-xl font-bold tracking-tight text-foreground">Welcome back</h2>
              <p className="mt-1 text-xs text-muted-foreground">Sign in to your CollabSpace workspace</p>
            </div>

            {/* Login Card */}
            <Card className="border-border/60 shadow-xl backdrop-blur-xl">
              <CardContent className="p-6 md:p-6">
                {registered && (
                  <div
                    data-testid="registered-success-banner"
                    role="status"
                    className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2"
                  >
                    <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                    <span>Account created successfully! Please sign in with your credentials.</span>
                  </div>
                )}

                {confirmed && !registered && (
                  <div
                    data-testid="confirmed-success-banner"
                    role="status"
                    className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2 animate-in fade-in"
                  >
                    <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                    <span>Email confirmed successfully! You can now sign in with your credentials.</span>
                  </div>
                )}

                {urlError && !error && (
                  <div
                    role="alert"
                    className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2 animate-in fade-in"
                  >
                    <AlertCircle className="size-4 shrink-0 mt-0.5 text-destructive" aria-hidden="true" />
                    <span className="font-medium">{urlError}</span>
                  </div>
                )}

                {deleted && (
                  <div
                    data-testid="deleted-success-banner"
                    className="mb-4 rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-primary flex items-start gap-2"
                  >
                    <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                    <span>Your account has been successfully deleted.</span>
                  </div>
                )}

                {resetSuccess && (
                  <div
                    role="status"
                    className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-400 flex items-start gap-2 animate-in fade-in"
                  >
                    <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-400" />
                    <span>Password reset successful! Please sign in with your new password.</span>
                  </div>
                )}

                {error && (
                  <div
                    id="login-error-message"
                    role="alert"
                    aria-live="assertive"
                    className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2 animate-in fade-in"
                  >
                    <AlertCircle className="size-4 shrink-0 mt-0.5 text-destructive" aria-hidden="true" />
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4" noValidate>
                  <Field>
                    <FieldLabel htmlFor="login-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Email address
                    </FieldLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="login-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? "login-error-message" : undefined}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className={`pl-9 text-sm h-10 rounded-xl ${
                          error ? "border-destructive focus-visible:ring-destructive" : ""
                        }`}
                      />
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Password
                    </FieldLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="login-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? "login-error-message" : undefined}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
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

                    {/* Option row under password input box */}
                    <div className="mt-2.5 flex items-center justify-between text-xs py-0.5">
                      <div className="flex items-center gap-2">
                        <input
                          id="login-show-password"
                          data-testid="login-show-password"
                          type="checkbox"
                          checked={showPassword}
                          onChange={(e) => setShowPassword(e.target.checked)}
                          className="size-4 rounded border-input text-primary focus:ring-0 cursor-pointer"
                        />
                        <label
                          htmlFor="login-show-password"
                          className="cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground transition font-medium"
                        >
                          Show password
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() => setForgotPasswordOpen(true)}
                        className="text-xs text-primary hover:underline font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </Field>

                  <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-10 text-xs sm:text-sm font-semibold rounded-full cursor-pointer shadow-xs mt-2"
                  >
                    {isPending ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Signup Link */}
            <p className="mt-5 text-center text-xs text-muted-foreground font-medium">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline font-semibold">
                Create an account
              </Link>
            </p>

            {/* Forgot Password OTP Modal */}
            <ForgotPasswordModal
              isOpen={forgotPasswordOpen}
              onClose={() => setForgotPasswordOpen(false)}
              initialEmail={email}
              onSuccess={(updatedEmail) => {
                setEmail(updatedEmail);
                setPassword("");
                setResetSuccess(true);
                setError(null);
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
