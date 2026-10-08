import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

export const metadata: Metadata = {
  title: "Page Not Found — CollabSpace",
  description:
    "The page you're looking for doesn't exist or has been moved. Return to your CollabSpace dashboard.",
};

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 text-center">
      {/* Brand identity */}
      <div className="mb-6 sm:mb-8">
        <Logo size={56} className="mx-auto" aria-hidden="true" />
      </div>

      {/* Error code — decorative, visually prominent */}
      <p
        className="text-7xl sm:text-8xl lg:text-9xl font-extrabold tracking-tighter text-foreground/10 select-none leading-none"
        aria-hidden="true"
      >
        404
      </p>

      {/* Heading — the actual accessible heading */}
      <h1 className="mt-4 text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
        Page not found
      </h1>

      {/* Helpful description (§32 — explain what's empty, why, and what to do) */}
      <p className="mt-2 max-w-md text-sm sm:text-base text-muted-foreground leading-relaxed">
        The page you&apos;re looking for doesn&apos;t exist or may have been
        moved. Check the URL or navigate back to your workspace.
      </p>

      {/* Action buttons — primary + secondary (§21 — action-oriented labels) */}
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <Button asChild size="default" className="gap-2 min-w-[180px]">
          <Link href="/">
            <Home className="size-4" aria-hidden="true" />
            Go to Dashboard
          </Link>
        </Button>

        <Button
          asChild
          variant="outline"
          size="default"
          className="gap-2 min-w-[180px]"
        >
          <Link href="/login">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Sign in
          </Link>
        </Button>
      </div>

      {/* Helpful Quick Links */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-muted-foreground">
        <span>Need assistance?</span>
        <Link href="/contact" className="text-primary hover:underline font-semibold">
          Contact Support
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/privacy" className="hover:underline">
          Privacy Policy
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/terms" className="hover:underline">
          Terms of Service
        </Link>
      </div>

      {/* Subtle footer hint */}
      <p className="mt-8 text-xs text-muted-foreground/60">
        CollabSpace · Work together, in context.
      </p>
    </main>
  );
}
