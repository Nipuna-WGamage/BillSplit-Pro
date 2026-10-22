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
- Backend: Supabase Auth and PostgreSQL with Row Level Security

The application supports Supabase email/password authentication, email
invitations, and group-scoped PostgreSQL persistence. Group owners can invite
other accounts, which must authenticate with the invited email and accept the
invitation before accessing group data. Without Supabase configuration, the
application opens in a clearly marked demo mode whose changes reset on refresh.
Expense shares are split equally among selected participants, with remainder
minor units assigned in stable member-ID order. Unsettled expense balances show
how much each member owes or is owed. Recorded payments update those balances
and can be undone; payment records do not transfer money.

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
3. Apply all SQL migrations in timestamp order using the Supabase SQL Editor:
   `supabase/migrations/20261022000000_create_user_workspaces.sql`, then
   `supabase/migrations/20261022150000_add_group_sharing_and_invitations.sql`,
   then
   `supabase/migrations/20261022170000_add_normalized_database_schema.sql`.
   The second migration copies existing personal workspace groups into the
   shared-group schema. The third creates profile and normalized group,
   membership, expense, split, and settlement tables and backfills them from
   existing group documents.
4. In Supabase Auth URL configuration, set the Site URL to your application
   origin. Allow `http://localhost:3000/**` for local development and
   `<site-url>/auth/callback**` for the deployed app.
5. Configure email delivery. Update the **Confirm signup** template link to
   `<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Confirm email</a>`
   and the **Magic Link** template to use the same URL with
   `type=magiclink`. This sends the one-time token to the callback for
   server-side verification and preserves the requested invitation destination.
6. Restart the development server, create an account at `/signup`, and sign in.

The application uses the publishable key with the signed-in user's session;
never add a service-role key to the application. PostgreSQL Row Level Security
restricts each group to its accepted members. The existing `shared_groups`
table remains the application write interface, with `groups`, `group_people`,
`expenses`, `expense_splits`, and `settlements` maintained transactionally as
normalized relational records. `group_members` maps authenticated accounts to
their group member IDs. Profile rows are created from Auth users, and each user
can read and update only their own profile. Normalized group records are
read-only to clients; current writes continue through the authorized group
write function, and each group’s JSON document remains validated. Updates are
broadcast through Supabase Realtime; version checks reject stale writes instead
of silently overwriting another member's changes. Invitation acceptance
verifies that the signed-in account email matches the invitation. When Supabase
isn't configured, the app stays in demo mode instead of attempting network
writes.

## Architecture

The web application uses the Next.js App Router in `src/app/`. Route pages and
layouts compose the interface; reusable UI belongs in `src/components/`.
Framework-independent group and expense types, validation, minor-unit amount
parsing, equal allocation, balance calculations, and settlement validation live
in `src/lib/`. Financial calculations should remain separate from React. Tests
live alongside the code they cover.

Authentication uses Supabase SSR cookie sessions refreshed by the Next.js
Proxy. Group reads use member-based Row Level Security, and group writes use
database functions that authorize membership changes and financial-history
constraints. Invitation creation and acceptance are database-authorized and
never use a service-role key. Frontend checks alone are not an access-control
boundary. Financial values use integer minor units, with rounding and allocation
behavior covered by unit tests.

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
authentication, group sharing, and persistence. Use `.env.example` as the
template; `.env.local` is ignored by Git.

## Deployment

Production deployment is planned for Vercel after the web MVP is ready.
