<p align="center">
  <a href="https://collabspace-ten.vercel.app">
    <img src="./public/icon.svg" alt="CollabSpace logo" width=72 height=72>
  </a>

  <h3 align="center">CollabSpace</h3>

  <p align="center">
    A modern collaborative workspace for product teams — organize projects, track tasks, coordinate schedules, chat in real time, and ship faster together.
    <br>
    <a href="https://github.com/MohamedSuhail1024BGH/collabspace/issues/new">Report bug</a>
    ·
    <a href="https://github.com/MohamedSuhail1024BGH/collabspace/issues/new?labels=feature">Request feature</a>
  </p>
</p>

## Table of contents

- [Quick start](#quick-start)
- [Status](#status)
- [What's included](#whats-included)
- [Bugs and feature requests](#bugs-and-feature-requests)
- [Creators](#creators)
- [Thanks](#thanks)


## Quick start

CollabSpace is a full-stack workspace dashboard: server-driven pages and Server Actions on the front, a multi-tenant PostgreSQL schema on the back, with real-time messaging over SSE. Everything runs locally against your own database, so you can be developing in under five minutes.

- **Install and configure** — clone the repo, run `npm install`, then copy the documented env template and fill in your Supabase credentials: `DATABASE_URL` (pooler connection, port 6543) and `DATABASE_DIRECT_URL` (direct connection, used by migrations)

  ```bash
  git clone https://github.com/MohamedSuhail1024BGH/collabspace.git
  cd collabspace
  npm install
  cp .env.example .env.local   # then edit .env.local with your Supabase URLs
  ```

- **Create the schema and seed demo data** — Drizzle Kit pushes `lib/db/schema.ts` to Postgres, then the seeder creates demo users, workspaces, projects, and tasks (credentials are printed by `npm run db:seed`):

  ```bash
  npm run db:push
  npm run db:seed
  ```

- **Run it** — the app starts on [http://localhost:3000](http://localhost:3000); sign in with a seeded account or create your own at `/signup`:

  ```bash
  npm run dev
  ```

Handy scripts: `npm run db:studio` (browse data), `npm run db:clean` (wipe seeded data), `npm test` (unit suite), `npm run test:e2e` (Playwright, reseeds first), `npm run typecheck`, `npm run lint`.

## Status

| Check | Result |
| --- | --- |
| Typecheck (`tsc --noEmit`) | ✅ passing (exit 0) |
| Unit tests (Vitest + PGlite, 6 files) | ✅ **99/99 passing** (exit 0) |
| E2E tests (Playwright, 14 specs / 32 tests) | 🟡 runnable via `npm run test:e2e` |
| Production build (`next build`) | ✅ passing |
| Lint (ESLint 9, `eslint-config-next`) | ✅ passing (0 errors, 28 warnings) |
| Production deploy | ✅ live at [collabspace-test.vercel.app](https://collabspace-test.vercel.app) — Vercel, region pinned to Mumbai (`bom1`) to match the `ap-south-1` Supabase database |
| Database | Supabase Postgres via Drizzle ORM, 2 migrations applied |
| Known gaps | `LICENSE` and `CONTRIBUTING.md` not yet added; no custom domain |

## What's included

The repository ships the complete application source — no generated or vendored code beyond `node_modules`:

```text
collabspace/
├── app/
│   ├── api/
│   │   ├── health/            # Liveness endpoint
│   │   └── messages/events/   # SSE stream for real-time chat
│   ├── actions-*.ts           # Server Actions (auth, tasks, projects, messages, …)
│   ├── login/ signup/ start/  # Auth + workspace onboarding
│   ├── projects/ tasks/       # Work tracking
│   ├── calendar/ messages/    # Scheduling + real-time chat
│   ├── reports/ settings/     # Analytics + workspace admin
│   ├── preferences/ contact/  # User preferences, contact form
│   ├── privacy/ terms/        # Legal pages
│   └── page.tsx               # Dashboard overview
├── components/
│   ├── auth/ contact/ start/  # Feature-level clients
│   ├── dashboard/             # 40+ dashboard components (charts, boards, chat)
│   └── ui/                    # Radix-based design system primitives
├── lib/
│   ├── auth/                  # Passwords, rate limiter, tenant + DM validation
│   ├── db/
│   │   ├── schema.ts          # Drizzle schema (14 tables)
│   │   ├── migrations/        # Versioned SQL migrations
│   │   └── seed.ts seed-test.ts
│   ├── events/                # In-process message bus + presence
│   └── id.ts analytics.ts
├── tests/
│   ├── unit/                  # Vitest: auth, tenant isolation, lifecycle, IDs
│   └── e2e/                   # Playwright: flows, shortcuts, mobile, tenancy
├── scripts/                   # DB migration utilities
├── public/                    # Icons and static assets
├── drizzle.config.ts          # Drizzle Kit config
├── playwright.config.ts       # E2E config
├── vitest.config.mts          # Unit config
└── vercel.json                # Deploy region (bom1)
```

**Under the hood:** Next.js 16 (App Router, React 19 Server Components), TypeScript, Tailwind CSS v4 + Radix UI, Drizzle ORM over Supabase Postgres, SSE for live messages, and first-class keyboard navigation (`⌘K` command palette, `G then …` jump chords).

## Bugs and feature requests

Have a bug or a feature request? Please first read the [issue guidelines](https://github.com/MohamedSuhail1024BGH/collabspace/issues) and search for existing and closed issues. If your problem or idea is not addressed yet, [please open a new issue](https://github.com/MohamedSuhail1024BGH/collabspace/issues/new).

When filing a bug, include your browser, Node version, the exact reproduction steps, and any console output — a minimal reproduction is the fastest path to a fix.

## Creators

**Mohamed Suhail**

- <https://github.com/MohamedSuhail1024BGH>

## Thanks

Built on the shoulders of giants: [Next.js](https://nextjs.org) for the app framework, [Drizzle ORM](https://orm.drizzle.team) and [Supabase](https://supabase.com) for the database layer, [Radix UI](https://www.radix-ui.com) and [Tailwind CSS](https://tailwindcss.com) for the design system, [Playwright](https://playwright.dev) and [Vitest](https://vitest.dev) for the test harness, and [Vercel](https://vercel.com) for hosting.

Enjoy ❤️
