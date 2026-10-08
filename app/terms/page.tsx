import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Scale, CheckCircle2, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Read the terms, conditions, and acceptable use policies governing access to and use of CollabSpace services.",
};

export default function TermsPage() {
  const lastUpdated = "October 5, 2026";

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo size={28} className="shadow-xs" />
            <span className="text-sm font-bold tracking-tight text-foreground font-mono group-hover:text-primary transition-colors">
              CollabSpace
            </span>
          </Link>

          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs">
            <Link href="/">
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              <span>Back to App</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
        <article className="prose prose-zinc dark:prose-invert max-w-none">
          <div className="mb-10 pb-6 border-b border-border/70">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono font-medium mb-3">
              <Scale className="size-3.5" aria-hidden="true" />
              <span>Legal Agreement</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Terms &amp; Conditions
            </h1>
            <p className="mt-2 text-xs font-mono text-muted-foreground">
              Last Revised: {lastUpdated} · Version 1.9
            </p>
          </div>

          <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
            <section className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
                1. Acceptance of Terms
              </h2>
              <p>
                By creating an account, accessing, or using CollabSpace (the &quot;Platform&quot; or &quot;Service&quot;), you agree to be bound by these Terms &amp; Conditions and our Privacy Policy. If you do not agree to these terms, do not access or use the Service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                2. User Accounts &amp; Security
              </h2>
              <p>
                To utilize the Service, you must register for an account using accurate, truthful information. You are solely responsible for maintaining the confidentiality of your authentication credentials and for all activities that occur under your account.
              </p>
              <p>
                You agree to notify CollabSpace immediately upon becoming aware of any unauthorized access or breach of security.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-500" aria-hidden="true" />
                3. Acceptable Use Policy
              </h2>
              <p>When using CollabSpace, you agree that you will not:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Attempt to bypass tenant authorization boundaries, rate limiters, or authentication mechanisms.</li>
                <li>Upload malware, trojans, or malicious attachments.</li>
                <li>Engage in abusive, harassing, defamatory, or unlawful communication within workspace message channels.</li>
                <li>Scrape, reverse-engineer, or decompile any part of the platform without written authorization.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                4. Workspace Ownership &amp; Intellectual Property
              </h2>
              <p>
                You retain full ownership of all data, tasks, notes, documents, and media that you upload or create in your workspaces (&quot;User Content&quot;). CollabSpace claims no ownership rights over your proprietary intellectual property.
              </p>
              <p>
                CollabSpace and its associated logos, designs, typography, and source code are the exclusive intellectual property of CollabSpace Inc.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                5. Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by applicable law, CollabSpace shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                6. Questions &amp; Inquiries
              </h2>
              <p>
                For questions regarding these Terms &amp; Conditions, please contact our legal team:
              </p>
              <div className="p-4 rounded-xl bg-card border border-border/80 font-mono text-xs text-foreground space-y-1">
                <p>Email: <a href="mailto:legal@collabspace.app" className="text-primary hover:underline">legal@collabspace.app</a></p>
                <p>Contact Center: <Link href="/contact" className="text-primary hover:underline">collabspace.app/contact</Link></p>
              </div>
            </section>
          </div>
        </article>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-muted-foreground">
          <p>© {new Date().getFullYear()} CollabSpace Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
            <Link href="/contact" className="hover:underline">
              Contact Us
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
