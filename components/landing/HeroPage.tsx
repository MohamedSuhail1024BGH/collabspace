"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import {
  Star,
  ArrowRight,
  Kanban,
  MessageSquare,
  BarChart2,
  Calendar,
  Menu,
  X,
} from "lucide-react";

export function HeroPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#121212] text-[#ededed] font-sans antialiased selection:bg-[#3ecf8e]/30 selection:text-white overflow-x-clip">
      {/* ── Top Navigation Bar (Supabase Inspired) ── */}
      <header className="sticky top-0 z-50 border-b border-[#262626] bg-[#121212]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Brand Logo & Navigation */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ecf8e] rounded-lg"
              aria-label="CollabSpace Home"
            >
              {/* Emerald Green Supabase-inspired Logo Badge */}
              <div className="flex items-center justify-center size-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] group-hover:border-[#3ecf8e]/50 transition-colors shadow-xs">
                <Logo size={22} className="shrink-0" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white font-mono lowercase">
                collab<span className="text-[#3ecf8e]">space</span>
              </span>
            </Link>

          </div>

          {/* Right: Actions & CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            {/* GitHub Stars pill */}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1a1a1a] border border-[#2e2e2e] hover:border-[#404040] text-xs font-mono text-[#a1a1a1] hover:text-white transition-colors"
            >
              <Star className="size-3.5 text-[#e5e5e5] fill-[#e5e5e5]" />
              <span>114.8K</span>
            </a>

            <Link
              href="/login"
              className="px-3 py-1.5 rounded-md text-xs font-medium text-[#d4d4d4] hover:text-white hover:bg-[#1f1f1f] transition-colors"
            >
              Sign In
            </Link>

            <Link
              href="/signup"
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#3ecf8e] text-[#000000] hover:bg-[#34d399] transition-all shadow-xs"
            >
              Start your workspace
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex sm:hidden items-center gap-2">
            <Link
              href="/signup"
              className="px-3 py-1.5 rounded-md text-xs font-semibold bg-[#3ecf8e] text-black hover:bg-[#34d399]"
            >
              Start
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#a1a1a1] hover:text-white hover:bg-[#1a1a1a]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-[#262626] bg-[#121212] px-4 py-4 space-y-3">
            <div className="flex flex-col gap-2 text-sm text-[#a1a1a1]">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-[#1a1a1a] text-white font-medium"
              >
                Sign In to Workspace
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg bg-[#3ecf8e] text-black font-semibold text-center"
              >
                Start your workspace free
              </Link>
              <Link
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-[#1a1a1a]"
              >
                Contact &amp; Support
              </Link>
              <Link
                href="/privacy"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-[#1a1a1a]"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-[#1a1a1a]"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Main Hero Section (1:1 Supabase Staggered Layout) ── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 lg:pt-32 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* Left Column: Supabase Headline & Buttons */}
          <div>
            <h1 className="text-4xl sm:text-6xl xl:text-[4.25rem] font-extrabold tracking-tight text-white leading-[1.08]">
              Build in a sprint <br />
              <span className="text-[#3ecf8e]">Scale to millions</span>
            </h1>

            {/* CTA Buttons */}
            <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-[#3ecf8e] hover:bg-[#34d399] text-black font-semibold text-xs sm:text-sm transition-all shadow-sm active:scale-98"
              >
                Start your workspace
              </Link>

              <Link
                href="/contact"
                className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-[#171717] hover:bg-[#202020] border border-[#2a2a2a] text-[#ededed] font-medium text-xs sm:text-sm transition-colors"
              >
                Request a demo
              </Link>
            </div>
          </div>

          {/* Right Column: Supabase Descriptive Copy */}
          <div className="lg:pt-3">
            <p className="text-base sm:text-lg text-[#a1a1a1] leading-relaxed max-w-xl">
              Start your project with a dedicated workspace. Add Real-time Chat,
              Sprint Task Boards, Workload Analytics, Milestone Calendars, and
              Vector embeddings.
            </p>
          </div>
        </div>

        {/* ── Collaborative Workspace Spotlight ── */}
        <section className="mt-28 pt-16 border-t border-[#262626]">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[#3ecf8e] font-semibold">
              The Workspace Engine
            </h2>
            <h3 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              Every tool in sync, out of the box
            </h3>
            <p className="mt-3 text-sm text-[#a1a1a1] leading-relaxed">
              Designed from first principles to keep cross-functional product teams shipping in lockstep.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl border border-[#262626] bg-[#171717] space-y-2">
              <Kanban className="size-5 text-[#3ecf8e]" />
              <h4 className="text-sm font-bold text-white">Sprint Boards</h4>
              <p className="text-xs text-[#a1a1a1]">Kanban lists, priority tags, and issue filters built for velocity.</p>
            </div>

            <div className="p-5 rounded-xl border border-[#262626] bg-[#171717] space-y-2">
              <MessageSquare className="size-5 text-[#3ecf8e]" />
              <h4 className="text-sm font-bold text-white">Contextual Chat</h4>
              <p className="text-xs text-[#a1a1a1]">Real-time message streams embedded directly beside projects.</p>
            </div>

            <div className="p-5 rounded-xl border border-[#262626] bg-[#171717] space-y-2">
              <BarChart2 className="size-5 text-[#3ecf8e]" />
              <h4 className="text-sm font-bold text-white">Workload Insights</h4>
              <p className="text-xs text-[#a1a1a1]">Contribution tracking, team capacity, and automated completion stats.</p>
            </div>

            <div className="p-5 rounded-xl border border-[#262626] bg-[#171717] space-y-2">
              <Calendar className="size-5 text-[#3ecf8e]" />
              <h4 className="text-sm font-bold text-white">Team Calendar</h4>
              <p className="text-xs text-[#a1a1a1]">Milestones, release target dates, and team agenda planning.</p>
            </div>
          </div>
        </section>

        {/* ── Pre-Footer Callout Banner ── */}
        <section className="mt-28 rounded-2xl border border-[#262626] bg-gradient-to-b from-[#181818] to-[#121212] p-8 sm:p-14 text-center">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            Build your next breakthrough with CollabSpace
          </h2>
          <p className="mt-3 text-sm text-[#a1a1a1] max-w-xl mx-auto">
            Experience the modern collaborative workspace built for high-tempo engineering and product squads.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="w-full sm:w-auto h-11 px-6 rounded-md bg-[#3ecf8e] hover:bg-[#34d399] text-black font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <span>Start your workspace</span>
              <ArrowRight className="size-4" />
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto h-11 px-6 rounded-md bg-[#1f1f1f] hover:bg-[#282828] border border-[#2e2e2e] text-white font-medium text-xs sm:text-sm flex items-center justify-center transition-colors"
            >
              Sign In
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#262626] bg-[#0d0d0d] py-8 px-4 sm:px-6 lg:px-8 text-xs text-[#737373]">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-mono text-white font-bold">
              <Logo size={20} />
              <span>collabspace</span>
            </div>
            <span className="text-[#404040] hidden sm:inline">|</span>
            <p className="text-[11px] font-mono text-[#525252]">
              © {new Date().getFullYear()} CollabSpace Inc.
            </p>
          </div>

          <div className="flex items-center gap-5 text-xs text-[#a1a1a1]">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link href="/contact" className="hover:text-white transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
