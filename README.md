# BillSplit Pro

BillSplit Pro is a shared household expense-splitting application for friends,
roommates, families, and other groups. The initial currency is LKR. The project
is being developed in milestones; features such as groups, expense tracking,
balance calculations, and payment tracking are being added incrementally.

## Technology

- Next.js App Router and React
- TypeScript
- Tailwind CSS
- ESLint
- Vitest and React Testing Library
- Planned backend: Supabase Auth and PostgreSQL with Row Level Security

The application supports Supabase email/password authentication and saves each
signed-in user's workspace to PostgreSQL. Without Supabase configuration, it
opens in a clearly marked demo mode whose changes reset on refresh. Expense
shares are split equally among selected participants, with remainder minor
units assigned in stable member-ID order. Unsettled expense balances show how
much each member owes or is owed. Recorded payments update those balances and
can be undone; payment records do not transfer money.

## Getting started

Use Node.js 20.9 or later and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Supabase setup

1. Create a Supabase project and copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   and `NEXT_PUBLIC_SITE_URL` from your project and deployment.
3. Apply `supabase/migrations/20261022000000_create_user_workspaces.sql` in the
   Supabase SQL Editor.
4. In Supabase Auth URL configuration, set the Site URL to your application
   origin and add `<site-url>/auth/callback` as a redirect URL. For local
   development, use `http://localhost:3000` and
   `http://localhost:3000/auth/callback`.
5. Restart the development server, create an account at `/signup`, and sign in.

The application uses the publishable key with the signed-in user's session;
never add a service-role key to the application. PostgreSQL Row Level Security
restricts workspace rows to their owning account. The current persistence model
stores a user's workspace as one validated JSON document, so groups and their
members are private to that account and aren't shared with other accounts yet.
When Supabase isn't configured, the app stays in demo mode instead of attempting
network writes.

## Architecture

The web application uses the Next.js App Router in `src/app/`. Route pages and
layouts compose the interface; reusable UI belongs in `src/components/`.
Framework-independent group and expense types, validation, minor-unit amount
parsing, equal allocation, balance calculations, and settlement validation live
in `src/lib/`. Financial calculations should remain separate from React. Tests
live alongside the code they cover.

Authentication uses Supabase SSR cookie sessions refreshed by the Next.js
Proxy. Workspace reads and writes use the publishable key and are protected by
database Row Level Security; frontend checks alone are not an access-control
boundary. Financial values use integer minor units, with rounding and
allocation behavior covered by unit tests.

## Development conventions

- Keep TypeScript strict and prefer explicit domain types over unsafe casts.
- Use Server Components by default; add `"use client"` only for interactive
  components that need browser state or event handlers.
- Validate untrusted input at the boundary and return or display actionable
  errors instead of silently substituting successful-looking defaults.
- Keep money calculations independent from React and use integer minor units.
- Add focused unit tests for domain rules and component tests for important
  user-visible behavior.
- Never commit `.env.local`, credentials, or service-role keys.

See [.github/copilot-instructions.md](.github/copilot-instructions.md) for
instructions applied to Copilot in this repository.

## Quality checks

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Use `npm run test:watch` while developing tests.

## Project structure

- `src/app/` — App Router routes, layouts, and global styles
- `src/components/groups/` — demo group state and group management screens
- `src/lib/` — framework-independent group and expense types, demo data, and
  validation
- `public/` — static assets
- `next.config.ts` — Next.js configuration
- `vitest.config.mts` — Vitest and jsdom configuration

## Environment

Supabase environment variables are optional for demo mode and required for
authentication and persistent workspaces. Use `.env.example` as the template;
`.env.local` is ignored by Git.

## Deployment

Production deployment is planned for Vercel after the web MVP is ready.
