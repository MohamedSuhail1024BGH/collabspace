import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Home, HelpCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Thank You",
  description:
    "Thank you for contacting CollabSpace. We have received your submission and are here to help your team succeed.",
};

export default function ThankYouPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 text-center bg-background text-foreground">
      {/* Brand Logo */}
      <div className="mb-6">
        <Logo size={48} className="mx-auto shadow-md" aria-hidden="true" />
      </div>

      {/* Success Badge */}
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-xs animate-in zoom-in duration-200">
        <CheckCircle2 className="size-8" aria-hidden="true" />
      </div>

      {/* Primary Heading */}
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
        Thank You!
      </h1>

      {/* Descriptive Text */}
      <p className="mt-2.5 max-w-md text-sm sm:text-base text-muted-foreground leading-relaxed">
        Your request has been received. Our team typically replies within 24 business hours. If you already have an account, you can jump back into your workspace.
      </p>

      {/* Next Steps Container */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-sm">
        <Button asChild size="default" className="w-full sm:w-auto gap-2 min-w-[160px] h-10 rounded-full">
          <Link href="/">
            <Home className="size-4" aria-hidden="true" />
            <span>Go to Dashboard</span>
          </Link>
        </Button>

        <Button
          asChild
          variant="outline"
          size="default"
          className="w-full sm:w-auto gap-2 min-w-[160px] h-10 rounded-full"
        >
          <Link href="/contact">
            <HelpCircle className="size-4" aria-hidden="true" />
            <span>Support Center</span>
          </Link>
        </Button>
      </div>

      {/* Helpful links */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-muted-foreground">
        <Link href="/privacy" className="hover:underline">
          Privacy Policy
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/terms" className="hover:underline">
          Terms of Service
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/login" className="text-primary hover:underline font-semibold flex items-center gap-1">
          <span>Sign In</span>
          <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      </div>
    </main>
  );
}
