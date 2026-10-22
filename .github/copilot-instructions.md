# BillSplit Pro Copilot Instructions

## Project

- Build BillSplit Pro as a shared household expense-splitting application.
- Follow the current Next.js App Router, React, TypeScript, and Tailwind CSS
  stack. Read the installed Next.js documentation in
  `node_modules/next/dist/docs/` before changing Next.js APIs or conventions.
- Supabase Auth and PostgreSQL with Row Level Security provide authentication
  and group-scoped persistence. Group invitations must be accepted by the
  invited email account; never bypass membership checks or use a service-role
  key in client-facing code.
- The initial currency is LKR. Do not implement real payment processing.

## Architecture and implementation

- Keep route-specific pages and layouts in `src/app/`; put reusable UI in
  `src/components/` and framework-independent domain logic and validation in
  `src/lib/`. Group and member demo data is modeled in `src/lib/groups.ts`.
- Keep Server Components by default. Use `"use client"` only where browser
  interaction or client-side state requires it.
- Keep financial calculations independent of React and represent money as
  integer minor units. Define deterministic allocation and rounding behavior
  and cover it with unit tests.
- Validate untrusted input at application boundaries. Surface actionable
  errors; do not silently swallow failures or report failed saves as success.
- Use explicit TypeScript types and guards. Avoid unsafe casts and unnecessary
  dependencies.
- Build accessible interfaces with semantic elements, associated form labels,
  keyboard support, and responsive layouts.

## Quality and security

- Add or update focused Vitest tests for changed domain logic and important UI
  behavior.
- Before completing a change, run the relevant checks: `npm run lint`,
  `npx tsc --noEmit`, `npm test`, and `npm run build` when appropriate.
- Treat database Row Level Security and server-side authorization as required
  for future user data. Client-side checks are not authorization.
- Never expose or commit secrets, `.env.local`, or Supabase service-role keys.
- Preserve unrelated user changes and inspect the diff before committing.
