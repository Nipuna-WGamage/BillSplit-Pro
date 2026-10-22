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

## Quality checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

There is no test runner configured yet; testing will be introduced in a later
milestone.

## Project structure

- `src/app/` — App Router pages, layout, and global styles
- `public/` — static assets
- `next.config.ts` — Next.js configuration

## Environment

No environment variables are required for the initial scaffold. Backend
configuration will be documented when Supabase is introduced.

## Deployment

Production deployment is planned for Vercel after the web MVP is ready.
