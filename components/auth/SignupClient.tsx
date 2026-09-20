"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signupAction } from "@/app/actions";

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
            <span>ONBOARDING · WORKSPACE INITIALIZATION</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface">Create your account</h1>
          <p className="mt-1 text-xs font-mono text-on-surface-variant">Start organizing projects and team execution today</p>
        </div>

        {/* Signup Card */}
        <div className="rounded-lg border border-outline/20 bg-surface-container-low p-6 shadow-2xl backdrop-blur-xl sm:p-7">
          {error && (
            <div className="mb-4 rounded border border-error/30 bg-error/10 p-3 text-xs font-mono text-error flex items-start gap-2">
              <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="mb-1 block text-[11px] font-mono uppercase tracking-wider text-on-surface-variant">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full rounded bg-surface-container-lowest border border-outline/20 px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none transition"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-mono uppercase tracking-wider text-on-surface-variant">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@company.com"
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded bg-surface-container-lowest border border-outline/20 px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none transition font-mono"
              />
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="signup-show-password"
                  data-testid="signup-show-password"
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-outline/30 bg-surface-container-lowest text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <label
                  htmlFor="signup-show-password"
                  className="cursor-pointer select-none text-xs text-on-surface-variant hover:text-on-surface transition font-mono text-[11px]"
                >
                  Show password
                </label>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-mono uppercase tracking-wider text-on-surface-variant">
                Username <span className="text-primary font-normal">(@handle)</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-mono text-on-surface-variant/60">@</span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="alexmorgan"
                  className="w-full rounded bg-surface-container-lowest border border-outline/20 pl-7 pr-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none transition font-mono"
                />
              </div>
              <p className="mt-1 text-[10px] font-mono text-on-surface-variant">People can discover and invite you using this handle.</p>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 flex w-full items-center justify-center rounded bg-primary hover:bg-primary/90 text-on-primary py-2.5 text-xs font-medium tracking-wide shadow-sm transition disabled:opacity-50"
            >
              {isPending ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        </div>

        {/* Login Link */}
        <p className="mt-5 text-center text-xs font-mono text-on-surface-variant">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
