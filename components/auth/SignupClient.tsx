"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import {
  requestSignupOtpAction,
  resendSignupConfirmationAction,
  verifySignupOtpAction,
} from "@/app/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  User,
  Mail,
  Lock,
  AtSign,
  Eye,
  EyeOff,
  AlertCircle,
  RotateCw,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export function SignupClient() {
  const [step, setStep] = useState<"form" | "confirm-sent">("form");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showManualCode, setShowManualCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const otpInputRef = useRef<HTMLInputElement>(null);

  // Countdown timer for resend email cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    startTransition(async () => {
      const res = await requestSignupOtpAction({
        name: trimmedName,
        username,
        email: trimmedEmail,
        password,
      });

      if (!res.success) {
        setError(res.error ?? "Failed to send confirmation email.");
        return;
      }

      setStep("confirm-sent");
      setCooldown(60);
    });
  };

  const handleResendConfirmation = () => {
    if (cooldown > 0 || isPending) return;
    setError(null);
    setInfoMessage(null);

    startTransition(async () => {
      const res = await resendSignupConfirmationAction({
        email: email.trim().toLowerCase(),
      });

      if (!res.success) {
        setError(res.error ?? "Failed to resend confirmation email.");
        return;
      }

      setInfoMessage("Confirmation email resent successfully! Please check your inbox and spam folder.");
      setCooldown(60);
    });
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const trimmedOtp = otp.trim();
    if (!trimmedOtp || trimmedOtp.length !== 6) {
      setError("Please enter the 6-digit confirmation code.");
      return;
    }

    startTransition(async () => {
      const res = await verifySignupOtpAction({
        email: email.trim().toLowerCase(),
        code: trimmedOtp,
      });

      if (!res.success) {
        setError(res.error ?? "Failed to verify code.");
        return;
      }

      // Successfully verified and created! Redirect to login with confirmation success indicator
      router.push("/login?confirmed=true");
      router.refresh();
    });
  };

  const isGmail = email.trim().toLowerCase().endsWith("@gmail.com");

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
                <span>Secure email confirmation powered by Supabase</span>
              </li>
              <li className="flex items-center gap-3">
                <Lock className="size-5 text-primary shrink-0" aria-hidden="true" />
                <span>Enterprise-grade encryption and access controls</span>
              </li>
            </ul>

            <p className="text-xs text-muted-foreground/60 font-mono">
              No credit card required · Free plan available
            </p>
          </div>

          {/* ── Signup Form / Confirmation Column ── */}
          <div className="w-full max-w-sm sm:max-w-[400px] mx-auto lg:mx-0">
            {/* Brand Header (mobile only — hidden on lg+) */}
            <div className="mb-3.5 sm:mb-4 text-center lg:hidden">
              <div className="mx-auto mb-2.5 flex items-center justify-center">
                <Logo size={44} className="h-11 w-11 sm:h-12 sm:w-12 shadow-md" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {step === "form" ? "Create your account" : "Confirm your email"}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {step === "form"
                  ? "Start organizing projects and team execution today"
                  : `We sent a confirmation link to ${email}`}
              </p>
            </div>

            {/* Desktop-only heading above card */}
            <div className="hidden lg:block mb-4">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {step === "form" ? "Create your account" : "Confirm your email"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {step === "form"
                  ? "Start organizing projects and team execution today"
                  : `We sent a confirmation link to ${email}`}
              </p>
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

                {infoMessage && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2 animate-in fade-in"
                  >
                    <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-500" aria-hidden="true" />
                    <span className="font-medium">{infoMessage}</span>
                  </div>
                )}

                {/* ── Step 1: Initial Registration Fields ── */}
                {step === "form" && (
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
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Alex Morgan"
                          className="pl-9 text-sm h-10 rounded-xl"
                          disabled={isPending}
                        />
                      </div>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="signup-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Email Address
                      </FieldLabel>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
                        <Input
                          id="signup-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="yourname@gmail.com"
                          className="pl-9 text-sm h-10 rounded-xl"
                          disabled={isPending}
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
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          className="pl-9 pr-10 text-sm h-10 rounded-xl"
                          disabled={isPending}
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
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                          placeholder="alexmorgan"
                          className="pl-9 text-sm h-10 rounded-xl"
                          disabled={isPending}
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
                      {isPending ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                )}

                {/* ── Step 2: Confirmation Email Sent View ── */}
                {step === "confirm-sent" && (
                  <div className="space-y-4 animate-in fade-in">
                    {/* Visual Callout */}
                    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-center sm:text-left flex flex-col sm:flex-row items-center sm:items-start gap-3.5">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <Mail className="size-5" aria-hidden="true" />
                      </div>
                      <div className="space-y-1 text-xs leading-relaxed">
                        <p className="font-semibold text-foreground text-sm">
                          Check your email inbox
                        </p>
                        <p className="text-muted-foreground">
                          We sent a confirmation email to <strong className="text-foreground">{email}</strong>.
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          Click the link inside to confirm your address and activate your account.
                        </p>
                      </div>
                    </div>

                    {/* Direct Email Action Buttons */}
                    <div className="space-y-2 pt-1">
                      {isGmail ? (
                        <a
                          href="https://mail.google.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full h-10 px-4 text-xs sm:text-sm font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <span>Open Gmail Inbox</span>
                          <ExternalLink className="size-3.5" aria-hidden="true" />
                        </a>
                      ) : (
                        <Link
                          href="/login"
                          className="flex items-center justify-center gap-2 w-full h-10 px-4 text-xs sm:text-sm font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs"
                        >
                          <span>Go to Sign In</span>
                        </Link>
                      )}

                      <Link
                        href="/login"
                        className="flex items-center justify-center w-full h-10 px-4 text-xs font-medium rounded-full border border-border/80 bg-card text-foreground hover:bg-accent hover:text-accent-foreground transition"
                      >
                        Already confirmed? Sign In
                      </Link>
                    </div>

                    {/* Resend and Edit Actions */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-border/60">
                      <button
                        type="button"
                        onClick={() => {
                          setStep("form");
                          setError(null);
                          setInfoMessage(null);
                        }}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground font-medium transition"
                      >
                        <ArrowLeft className="size-3.5" />
                        Change email
                      </button>

                      <button
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={cooldown > 0 || isPending}
                        className={`inline-flex items-center gap-1 font-medium ${
                          cooldown > 0
                            ? "text-muted-foreground/60 cursor-not-allowed"
                            : "text-primary hover:underline cursor-pointer"
                        }`}
                      >
                        <RotateCw className={`size-3.5 ${isPending ? "animate-spin" : ""}`} />
                        {cooldown > 0 ? `Resend email (${cooldown}s)` : "Resend email"}
                      </button>
                    </div>

                    {/* Optional Fallback: Manual 6-digit Code Entry */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowManualCode(!showManualCode)}
                        className="w-full flex items-center justify-between text-[11px] text-muted-foreground hover:text-foreground py-1 font-medium transition"
                        aria-expanded={showManualCode}
                      >
                        <span>Received a 6-digit confirmation code instead?</span>
                        {showManualCode ? (
                          <ChevronUp className="size-3.5" />
                        ) : (
                          <ChevronDown className="size-3.5" />
                        )}
                      </button>

                      {showManualCode && (
                        <form onSubmit={handleVerifyOtp} className="mt-3 space-y-3 p-3.5 rounded-xl border border-border/60 bg-muted/20 animate-in fade-in" noValidate>
                          <Field>
                            <FieldLabel htmlFor="signup-otp" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              6-Digit Code
                            </FieldLabel>
                            <Input
                              ref={otpInputRef}
                              id="signup-otp"
                              name="otp"
                              type="text"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              maxLength={6}
                              required
                              value={otp}
                              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              placeholder="123456"
                              className="text-center font-mono text-lg tracking-[0.3em] font-bold h-10 rounded-xl"
                              disabled={isPending}
                            />
                          </Field>
                          <Button
                            type="submit"
                            disabled={isPending || otp.length !== 6}
                            className="w-full h-9 text-xs font-semibold rounded-full shadow-xs"
                          >
                            {isPending ? "Verifying..." : "Verify Code & Continue"}
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                )}
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
