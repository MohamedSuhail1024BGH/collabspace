import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Lock, Eye, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how CollabSpace collects, uses, protects, and handles your personal information and collaborative workspace data.",
};

export default function PrivacyPolicyPage() {
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
              <Shield className="size-3.5" aria-hidden="true" />
              <span>Transparency &amp; Trust</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Privacy Policy
            </h1>
            <p className="mt-2 text-xs font-mono text-muted-foreground">
              Effective Date: {lastUpdated} · Version 2.4
            </p>
          </div>

          <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
            <section className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Eye className="size-5 text-primary" aria-hidden="true" />
                1. Information We Collect
              </h2>
              <p>
                CollabSpace (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) collects only information that is strictly necessary to provide a collaborative project workspace.
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong className="text-foreground">Account Information:</strong> Your full name, email address, chosen @username handle, and encrypted credentials.
                </li>
                <li>
                  <strong className="text-foreground">Workspace Data:</strong> Projects, tasks, sprint dates, team assignments, channel discussions, and uploaded media attachments.
                </li>
                <li>
                  <strong className="text-foreground">Technical Log Data:</strong> Device browser user-agent, IP address (truncated for anonymity), session timestamps, and performance telemetry to detect latency anomalies.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <FileText className="size-5 text-primary" aria-hidden="true" />
                2. How We Use Your Information
              </h2>
              <p>
                We process your information solely for legitimate business operations:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Operating, maintaining, and enhancing real-time synchronization between team members.</li>
                <li>Authenticating sessions and securing multi-tenant workspace isolation.</li>
                <li>Sending essential transactional notifications (password resets, invitation links).</li>
                <li>Preventing malicious misuse, brute-force attempts, and unauthorized API probing.</li>
              </ul>
              <p className="font-semibold text-foreground">
                We do not sell, rent, or trade your personal data to third-party advertisers.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Lock className="size-5 text-primary" aria-hidden="true" />
                3. Security &amp; Data Protection
              </h2>
              <p>
                We adhere to international security standards (OWASP Top 10 guidelines):
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>All network transit is encrypted using modern TLS (v1.3 preferred).</li>
                <li>Passwords are hashed using salted cryptographic algorithms (bcrypt/Argon2).</li>
                <li>Tenant data isolation enforces strict workspace boundary authorization checks on all database queries.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                4. Your Rights (GDPR &amp; CCPA)
              </h2>
              <p>
                Depending on your location, you hold the following rights regarding your data:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="text-foreground">Access &amp; Portability:</strong> You may request an export of your personal information and authored workspace data.</li>
                <li><strong className="text-foreground">Correction:</strong> You can edit your name, username, and profile picture in account settings.</li>
                <li><strong className="text-foreground">Erasure:</strong> You can permanently delete your account and associated memberships at any time.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                5. Contact Us
              </h2>
              <p>
                If you have questions about this Privacy Policy or wish to exercise your data rights, please reach out to our Data Protection Officer:
              </p>
              <div className="p-4 rounded-xl bg-card border border-border/80 font-mono text-xs text-foreground space-y-1">
                <p>Email: <a href="mailto:privacy@collabspace.app" className="text-primary hover:underline">privacy@collabspace.app</a></p>
                <p>Support: <Link href="/contact" className="text-primary hover:underline">collabspace.app/contact</Link></p>
              </div>
            </section>
          </div>
        </article>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-muted-foreground">
          <p>© {new Date().getFullYear()} CollabSpace Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:underline">
              Terms of Service
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
