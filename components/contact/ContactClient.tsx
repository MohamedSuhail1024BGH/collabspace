"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Mail,
  ShieldCheck,
  Building,
  Clock,
  ArrowLeft,
  Send,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export function ContactClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("support");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError("Please fill out all required fields.");
      return;
    }

    startTransition(async () => {
      // Simulate submission delay
      await new Promise((r) => setTimeout(r, 600));
      router.push("/thank-you");
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
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
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono font-medium mb-3">
            <HelpCircle className="size-3.5" aria-hidden="true" />
            <span>Support &amp; Inquiries</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Get in touch with us
          </h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
            Have questions about your workspace, need enterprise onboarding support, or want to report a security issue? Our team is here to assist.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-14 items-start">
          {/* Left Column: Real Contact Channels */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">Direct Communication Channels</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Reach our specialized teams directly for fast resolution.
              </p>
            </div>

            <div className="space-y-4">
              {/* Support */}
              <div className="p-4 rounded-2xl bg-card border border-border/70 flex items-start gap-3.5 shadow-xs">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <Mail className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">General &amp; Technical Support</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Assistance with workspace accounts, permissions, and feature troubleshooting.</p>
                  <a
                    href="mailto:support@collabspace.app"
                    className="inline-block mt-2 text-xs font-mono text-primary hover:underline font-medium"
                  >
                    support@collabspace.app
                  </a>
                </div>
              </div>

              {/* Security */}
              <div className="p-4 rounded-2xl bg-card border border-border/70 flex items-start gap-3.5 shadow-xs">
                <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <ShieldCheck className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Security &amp; Vulnerability Disclosure</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Encrypted PGP communications for responsible disclosure and compliance audits.</p>
                  <a
                    href="mailto:security@collabspace.app"
                    className="inline-block mt-2 text-xs font-mono text-emerald-500 hover:underline font-medium"
                  >
                    security@collabspace.app
                  </a>
                </div>
              </div>

              {/* Headquarters & Hours */}
              <div className="p-4 rounded-2xl bg-card border border-border/70 flex items-start gap-3.5 shadow-xs">
                <div className="size-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0 border border-border">
                  <Building className="size-5" aria-hidden="true" />
                </div>
                <div className="text-xs space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">Headquarters</h3>
                  <p className="text-muted-foreground">CollabSpace Inc.</p>
                  <p className="text-muted-foreground">548 Market St, Suite 32000</p>
                  <p className="text-muted-foreground">San Francisco, CA 94104, United States</p>
                  <div className="flex items-center gap-1.5 pt-1 text-muted-foreground/80 font-mono text-[11px]">
                    <Clock className="size-3.5" aria-hidden="true" />
                    <span>Mon–Fri, 9:00 AM – 6:00 PM EST</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Message Form */}
          <Card className="border-border/70 shadow-xl">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-lg font-bold text-foreground mb-1">Send a Message</h2>
              <p className="text-xs text-muted-foreground mb-6">
                Fill in the details below and we&apos;ll get back to you shortly.
              </p>

              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="mb-5 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive flex items-start gap-2 animate-in fade-in"
                >
                  <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="contact-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Your Name
                    </FieldLabel>
                    <Input
                      id="contact-name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Morgan"
                      className="text-xs sm:text-sm h-10 rounded-xl"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="contact-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Work Email
                    </FieldLabel>
                    <Input
                      id="contact-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@company.com"
                      className="text-xs sm:text-sm h-10 rounded-xl"
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="contact-topic" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Inquiry Category
                    </FieldLabel>
                    <select
                      id="contact-topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full h-10 rounded-xl border border-border bg-card px-3 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="support">Technical Support</option>
                      <option value="sales">Sales &amp; Enterprise Pricing</option>
                      <option value="security">Security Vulnerability</option>
                      <option value="feedback">Product Feedback</option>
                    </select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="contact-subject" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Subject
                    </FieldLabel>
                    <Input
                      id="contact-subject"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief topic summary"
                      className="text-xs sm:text-sm h-10 rounded-xl"
                    />
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="contact-message" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Message Details
                  </FieldLabel>
                  <Textarea
                    id="contact-message"
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide details on how we can help..."
                    className="text-xs sm:text-sm rounded-xl resize-none"
                  />
                </Field>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-11 text-xs sm:text-sm font-semibold rounded-full gap-2 shadow-xs cursor-pointer mt-2"
                >
                  <Send className="size-4" aria-hidden="true" />
                  <span>{isPending ? "Sending message..." : "Send Message"}</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
