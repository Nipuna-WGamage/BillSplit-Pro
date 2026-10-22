# BillSplit Pro

BillSplit Pro is a shared household expense-splitting application for friends,
roommates, families, and other groups. The initial currency is LKR. The project
is being developed in milestones; features such as groups, expense tracking,
balance calculations, and settlements will be added incrementally.

## Technology

- Next.js App Router and React
- TypeScript
- Tailwind CSS
- ESLint
- Vitest and React Testing Library
- Planned backend: Supabase Auth and PostgreSQL with Row Level Security

The current application is the initial scaffold. It does not yet include
authentication, persistent data, or financial calculations.

## Getting started

Use Node.js 20.9 or later and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Architecture

The web application uses the Next.js App Router in `src/app/`. Route pages and
layouts compose the interface; reusable UI belongs in `src/components/` as it
is introduced. Keep domain logic, input validation, and financial calculations
in framework-independent modules under `src/lib/`, with tests alongside or
under a `__tests__/` directory.

Future backend work will add Supabase migrations and server-side access
boundaries. PostgreSQL Row Level Security is required for authorization;
frontend checks alone are not an access-control boundary. Financial values
must use integer minor units, with rounding and allocation behavior covered by
unit tests.

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
- `src/components/` — reusable UI components as they are introduced
- `src/lib/` — framework-independent domain logic and validation as they are
  introduced
- `public/` — static assets
- `next.config.ts` — Next.js configuration
- `vitest.config.mts` — Vitest and jsdom configuration

## Environment

No environment variables are required for the initial scaffold. Backend
configuration will be documented when Supabase is introduced.

## Deployment

Production deployment is planned for Vercel after the web MVP is ready.
