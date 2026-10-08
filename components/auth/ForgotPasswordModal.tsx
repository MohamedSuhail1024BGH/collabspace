"use client";

import { useState, useEffect, useRef, useTransition, useCallback } from "react";
import { requestPasswordResetOtpAction, resetPasswordWithOtpAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  X,
  RotateCw,
  ArrowLeft,
} from "lucide-react";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  onSuccess: (email: string) => void;
}

export function ForgotPasswordModal({
  isOpen,
  onClose,
  initialEmail = "",
  onSuccess,
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [isPending, startTransition] = useTransition();

  const emailInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Sync initial email when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail);
      setStep("email");
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      setTimeout(() => emailInputRef.current?.focus(), 50);
    }
  }, [isOpen, initialEmail]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Escape key to dismiss
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isPending) {
        onClose();
      }
    },
    [isOpen, isPending, onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleRequestCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError("Please enter your registered email address.");
      return;
    }

    startTransition(async () => {
      const res = await requestPasswordResetOtpAction({ email: trimmedEmail });
      if (!res.success) {
        setError(res.error ?? "Failed to send verification code.");
        return;
      }

      setStep("code");
      setCooldown(60);
      setTimeout(() => codeInputRef.current?.focus(), 50);
    });
  };

  const handleResendCode = () => {
    if (cooldown > 0 || isPending) return;
    setError(null);

    startTransition(async () => {
      const res = await requestPasswordResetOtpAction({ email: email.trim().toLowerCase() });
      if (!res.success) {
        setError(res.error ?? "Failed to resend code.");
        return;
      }
      setCooldown(60);
    });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedCode = code.trim();
    if (!trimmedCode || trimmedCode.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify both fields.");
      return;
    }

    startTransition(async () => {
      const res = await resetPasswordWithOtpAction({
        email: email.trim().toLowerCase(),
        code: trimmedCode,
        newPassword,
      });

      if (!res.success) {
        setError(res.error ?? "Failed to reset password.");
        return;
      }

      onSuccess(email.trim().toLowerCase());
      onClose();
    });
  };

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgot-password-title"
        aria-describedby="forgot-password-desc"
        className="relative w-full max-w-md rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-2xl text-foreground animate-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Close recovery dialog"
        >
          <X className="size-4" aria-hidden="true" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5 pr-8">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <KeyRound className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="forgot-password-title" className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              {step === "email" ? "Recover Your Account" : "Enter Verification Code"}
            </h2>
            <p id="forgot-password-desc" className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {step === "email"
                ? "Enter your registered email address to receive account recovery instructions."
                : `We sent a recovery email to ${email}. You can click the recovery link in your email or enter your code below along with your new password.`}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2 animate-in fade-in"
          >
            <AlertCircle className="size-4 shrink-0 mt-0.5 text-destructive" aria-hidden="true" />
            <span className="font-medium">{error}</span>
          </div>
        )}


        {/* ── Step 1: Request OTP by Email ── */}
        {step === "email" && (
          <form onSubmit={handleRequestCode} className="mt-5 space-y-4" noValidate>
            <Field>
              <FieldLabel htmlFor="recovery-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email address
              </FieldLabel>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  ref={emailInputRef}
                  id="recovery-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="pl-9 text-sm h-10 rounded-xl"
                  disabled={isPending}
                />
              </div>
            </Field>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
                className="w-full sm:w-auto h-10 px-4 text-xs font-medium rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="w-full sm:w-auto h-10 px-5 text-xs sm:text-sm font-semibold rounded-xl shadow-xs"
              >
                {isPending ? "Sending code..." : "Send Verification Code"}
              </Button>
            </div>
          </form>
        )}

        {/* ── Step 2: Enter OTP & New Password ── */}
        {step === "code" && (
          <form onSubmit={handleResetPassword} className="mt-5 space-y-4" noValidate>
            <Field>
              <FieldLabel htmlFor="recovery-code" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>6-Digit Verification Code</span>
                <span className="text-[11px] font-normal lowercase font-mono text-muted-foreground/80">
                  expires in 10 mins
                </span>
              </FieldLabel>
              <Input
                ref={codeInputRef}
                id="recovery-code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="text-center font-mono text-lg tracking-[0.3em] font-bold h-11 rounded-xl"
                disabled={isPending}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="recovery-new-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                New Password
              </FieldLabel>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="recovery-new-password"
                  name="newPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="pl-9 pr-10 text-sm h-10 rounded-xl"
                  disabled={isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="recovery-confirm-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Confirm New Password
              </FieldLabel>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="recovery-confirm-password"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="pl-9 pr-10 text-sm h-10 rounded-xl"
                  disabled={isPending}
                />
              </div>
            </Field>

            {/* Resend & Back controls */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setStep("email")}
                disabled={isPending}
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground font-medium"
              >
                <ArrowLeft className="size-3.5" />
                Change email
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={cooldown > 0 || isPending}
                className={`inline-flex items-center gap-1 font-medium ${
                  cooldown > 0
                    ? "text-muted-foreground/60 cursor-not-allowed"
                    : "text-primary hover:underline cursor-pointer"
                }`}
              >
                <RotateCw className={`size-3.5 ${isPending ? "animate-spin" : ""}`} />
                {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
              </button>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
                className="w-full sm:w-auto h-10 px-4 text-xs font-medium rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || code.length !== 6}
                className="w-full sm:w-auto h-10 px-5 text-xs sm:text-sm font-semibold rounded-xl shadow-xs"
              >
                {isPending ? "Updating password..." : "Set New Password"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
