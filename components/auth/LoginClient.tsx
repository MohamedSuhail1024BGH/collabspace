"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginAction } from "@/app/actions";

export function LoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "true";
  const deleted = searchParams.get("deleted") === "true";

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
    <main className="flex min-h-screen items-center justify-center bg-surface p-4 text-on-surface">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center">
            <svg
              className="h-12 w-12 shrink-0 shadow-md"
              viewBox="0 0 64 64"
              role="img"
              aria-label="CollabSpace logo"
            >
              <rect x="0.5" y="0.5" width="63" height="63" rx="15" fill="#111319" stroke="#282a30" strokeWidth="1" />
              <rect x="13" y="14" width="19" height="19" rx="5" fill="#8083ff" />
              <rect x="32" y="31" width="19" height="19" rx="5" fill="#4edea3" />
              <path d="M28 25.5 H36 A6 6 0 0 1 42 31.5 V34.5" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-mono text-[10px] mb-2 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span>SEC-AUTH-V2 · ONLINE</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface">Welcome back</h1>
          <p className="mt-1 text-xs font-mono text-on-surface-variant">Sign in to your CollabSpace workspace</p>
        </div>

        {/* Login Card */}
        <div className="rounded-lg border border-outline/20 bg-surface-container-low p-6 shadow-2xl backdrop-blur-xl sm:p-7">
          {registered && (
            <div
              data-testid="registered-success-banner"
              className="mb-4 rounded border border-secondary/30 bg-secondary/10 p-3 text-xs font-mono text-secondary flex items-start gap-2"
            >
              <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Account created successfully! Please sign in with your credentials.</span>
            </div>
          )}

          {deleted && (
            <div
              data-testid="deleted-success-banner"
              className="mb-4 rounded border border-primary/30 bg-primary/10 p-3 text-xs font-mono text-primary flex items-start gap-2"
            >
              <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Your account has been successfully deleted.</span>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded border border-error/30 bg-error/10 p-3 text-xs font-mono text-error flex items-start gap-2">
              <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-[11px] font-mono uppercase tracking-wider text-on-surface-variant">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full rounded bg-surface-container-lowest border border-outline/20 px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none transition"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-mono uppercase tracking-wider text-on-surface-variant">
                Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded bg-surface-container-lowest border border-outline/20 px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none transition font-mono"
              />
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="login-show-password"
                  data-testid="login-show-password"
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-outline/30 bg-surface-container-lowest text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <label
                  htmlFor="login-show-password"
                  className="cursor-pointer select-none text-xs text-on-surface-variant hover:text-on-surface transition font-mono text-[11px]"
                >
                  Show password
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 flex w-full items-center justify-center rounded bg-primary hover:bg-primary/90 text-on-primary py-2.5 text-xs font-medium tracking-wide shadow-sm transition disabled:opacity-50"
            >
              {isPending ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        {/* Signup Link */}
        <p className="mt-5 text-center text-xs font-mono text-on-surface-variant">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary hover:underline font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
