import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { StatusNoticeDialog } from "./StatusNoticeDialog";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  CheckSquare,
  FolderKanban,
  Hash,
  Lock,
  Users,
  Zap,
} from "lucide-react";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#tech", label: "Tech" },
  { href: "#status", label: "Status" },
];

const features = [
  {
    icon: FolderKanban,
    title: "Projects & boards",
    description:
      "Organize work into projects with Kanban boards, priorities, assignees, and live progress tracking.",
  },
  {
    icon: CheckSquare,
    title: "Tasks that stay in sync",
    description:
      "Create, assign, and filter tasks with statuses, due dates, bulk actions, and full-text search.",
  },
  {
    icon: Calendar,
    title: "Shared schedules",
    description:
      "Coordinate milestones, events, and deadlines on a team calendar that stays tied to your projects.",
  },
  {
    icon: Hash,
    title: "Real-time chat",
    description:
      "Workspace and direct-message conversations stream live over Server-Sent Events — no refresh, no polling lag.",
  },
  {
    icon: BarChart3,
    title: "Reports & insight",
    description:
      "Sprint velocity, team workload, and activity trends with charts for every workspace you belong to.",
  },
  {
    icon: Users,
    title: "Multi-tenant workspaces",
    description:
      "Invite teammates, manage role-based access, and switch between workspaces with fully isolated data.",
  },
];

const steps = [
  {
    number: "1",
    title: "Create an account",
    description:
      "Sign up in seconds with your email — no credit card, no sales call, no waitlist.",
  },
  {
    number: "2",
    title: "Set up your workspace",
    description:
      "Name your workspace, create your first project, and invite teammates with role-based permissions.",
  },
  {
    number: "3",
    title: "Plan, track, and ship",
    description:
      "Run work on boards, keep dates on the calendar, talk in real-time chat, and review progress in reports.",
  },
];

const stack = [
  "Next.js 16 (App Router)",
  "React 19 Server Components",
  "TypeScript",
  "Tailwind CSS v4",
  "Radix UI",
  "Drizzle ORM",
  "PostgreSQL",
  "Server-Sent Events",
  "Vitest",
  "Playwright",
];

const workingItems = [
  "Email/password authentication with sessions and rate limiting",
  "Multi-tenant workspaces with role-based access control",
  "Projects, Kanban task boards, and workspace-wide search",
  "Calendar events, reports, and an activity feed",
  "Real-time chat with presence over Server-Sent Events",
  "Keyboard-first navigation (⌘K palette and G-then jump chords)",
];

const gapItems = [
  "No security audit or penetration testing — known vulnerabilities may exist",
  "Not production-ready; do not run it as a real service",
  "Some features are incomplete, experimental, or subject to change",
  "Data is for evaluation only and may be reset without notice",
  "Automated tests cover core logic; many UI flows remain untested",
  "No LICENSE or CONTRIBUTING.md yet, and no custom domain",
];

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-mono font-medium text-primary">
        {eyebrow}
      </span>
      <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      <StatusNoticeDialog />

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <Logo size={28} className="shadow-xs" />
            <span className="font-mono text-sm font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
              CollabSpace
            </span>
          </Link>

          <nav aria-label="Section navigation" className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="pill-outline" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button variant="pill" size="sm" asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden border-b border-border/70">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(128,131,255,0.16),transparent_60%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
          />

          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs font-mono text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
              v0.1.0 · Public preview
            </span>

            <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Work together,
              <br />
              in context.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              CollabSpace is a collaborative workspace for product teams —
              organize projects, track tasks, coordinate schedules, chat in real
              time, and ship faster together, all from one fast,
              keyboard-friendly dashboard.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button variant="pill" size="lg" asChild className="h-11 px-6 text-sm">
                <Link href="/signup">
                  Get started free
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button variant="pill-outline" size="lg" asChild className="h-11 px-6 text-sm">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>

            <p className="mt-6 flex items-start gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              <span>
                Heads up: this project is currently{" "}
                <strong className="font-semibold text-foreground">
                  insecure and incomplete
                </strong>
                . It is a preview for evaluation only.{" "}
                <a href="#status" className="font-medium text-primary underline-offset-4 hover:underline">
                  Read the full status
                </a>{" "}
                before signing up.
              </span>
            </p>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="scroll-mt-20 border-b border-border/70 py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="// Features"
              title="Everything a product team needs to ship"
              description="One workspace replaces the scatter of trackers, docs, calendars, and chat windows your team juggling today."
            />

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:border-primary/40"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <feature.icon className="size-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how-it-works" className="scroll-mt-20 border-b border-border/70 py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="// How it works"
              title="From signup to shipping in three steps"
              description="CollabSpace is designed to be useful in the first five minutes — no configuration marathon required."
            />

            <ol className="mt-10 grid gap-4 sm:grid-cols-3">
              {steps.map((step) => (
                <li
                  key={step.number}
                  className="relative rounded-2xl border border-border/70 bg-card p-5"
                >
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {step.number}
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Tech stack ── */}
        <section id="tech" className="scroll-mt-20 border-b border-border/70 py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="// Tech"
              title="Built on a modern, proven stack"
              description="Server-driven pages and Server Actions on the front, a multi-tenant PostgreSQL schema on the back, and real-time messaging over SSE. The whole stack is documented in the README."
            />

            <ul className="mt-8 flex flex-wrap gap-2">
              {stack.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-border/80 bg-card px-3.5 py-1.5 font-mono text-xs text-muted-foreground"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Project status ── */}
        <section id="status" className="scroll-mt-20 border-b border-border/70 py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="// Project status"
              title="Insecure, incomplete — and honest about it"
              description="CollabSpace is a work in progress shared publicly for feedback. Here is exactly where it stands today."
            />

            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
                <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <CheckCircle2 className="size-4.5 shrink-0 text-primary" aria-hidden="true" />
                  What works today
                </h3>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {workingItems.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary/70" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 sm:p-6">
                <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <AlertTriangle className="size-4.5 shrink-0 text-destructive" aria-hidden="true" />
                  Known gaps and risks
                </h3>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {gapItems.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive/80" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mt-6 flex items-start gap-2 rounded-xl border border-border/70 bg-card p-4 text-sm text-muted-foreground leading-relaxed">
              <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span>
                Because the project has not been security reviewed, use strong
                unique passwords you do not reuse anywhere else — or better,
                sign up with a throwaway account while it is in preview.
              </span>
            </p>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-8 text-center sm:p-12">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(128,131,255,0.14),transparent_65%)]"
              />
              <div className="relative">
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  Ready to take a look?
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Create a workspace, invite your team, and see how it feels to
                  run a project in one place. Remember: it is a preview — treat
                  it as a demo, not a home for real data.
                </p>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                  <Button variant="pill" size="lg" asChild className="h-11 px-6 text-sm">
                    <Link href="/signup">
                      Create your account
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button variant="pill-outline" size="lg" asChild className="h-11 px-6 text-sm">
                    <Link href="/login">I already have one</Link>
                  </Button>
                </div>
                <p className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Zap className="size-3.5 text-primary" aria-hidden="true" />
                  Free while in preview · No credit card required
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/70 bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-sm">
              <Link href="/" className="group inline-flex items-center gap-2.5">
                <Logo size={28} className="shadow-xs" />
                <span className="font-mono text-sm font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                  CollabSpace
                </span>
              </Link>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                A modern collaborative workspace for product teams — organize
                projects, track tasks, coordinate schedules, and chat in real
                time.
              </p>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground/80">
                Preview release · Insecure &amp; incomplete · Not for production
                use
              </p>
            </div>

            <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm sm:gap-x-16">
              <a href="#features" className="text-muted-foreground transition-colors hover:text-foreground">
                Features
              </a>
              <a href="#status" className="text-muted-foreground transition-colors hover:text-foreground">
                Project status
              </a>
              <a href="#how-it-works" className="text-muted-foreground transition-colors hover:text-foreground">
                How it works
              </a>
              <Link href="/login" className="text-muted-foreground transition-colors hover:text-foreground">
                Sign in
              </Link>
              <a href="#tech" className="text-muted-foreground transition-colors hover:text-foreground">
                Tech stack
              </a>
              <Link href="/signup" className="text-muted-foreground transition-colors hover:text-foreground">
                Get started
              </Link>
              <Link href="/privacy" className="text-muted-foreground transition-colors hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms" className="text-muted-foreground transition-colors hover:text-foreground">
                Terms
              </Link>
              <Link href="/contact" className="text-muted-foreground transition-colors hover:text-foreground">
                Contact
              </Link>
            </nav>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-border/70 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} CollabSpace. Built by Mohamed Suhail.</span>
            <span className="font-mono">WORK TOGETHER, IN CONTEXT</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
