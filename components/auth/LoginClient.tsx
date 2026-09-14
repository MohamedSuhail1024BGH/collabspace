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
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-100">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 font-bold text-white shadow-lg shadow-violet-950/50">
            CS
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-400">Sign in to your CollabSpace workspace</p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {registered && (
            <div
              data-testid="registered-success-banner"
              className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-300"
            >
              Account created successfully! Please sign in with your credentials.
            </div>
          )}

          {deleted && (
            <div
              data-testid="deleted-success-banner"
              className="mb-5 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-3.5 text-sm text-sky-300"
            >
              Your account has been successfully deleted.
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">Password</label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none"
              />
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="login-show-password"
                  data-testid="login-show-password"
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-slate-950/60 text-violet-500 focus:ring-violet-400 focus:ring-offset-0"
                />
                <label
                  htmlFor="login-show-password"
                  className="cursor-pointer select-none text-xs text-slate-400 hover:text-slate-300"
                >
                  Show password
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:opacity-95 disabled:opacity-50"
            >
              {isPending ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        {/* Signup Link */}
        <p className="mt-6 text-center text-sm text-slate-400">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-violet-400 hover:text-violet-300">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}

