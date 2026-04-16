# PoolPlay

Tournament planning and management for collegiate club volleyball: teams, registrations, pools, brackets, scheduling, and live scores.

## Tech Stack

- **Framework**: Next.js 15 (App Router) with TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle ORM
- **Auth**: Supabase Auth
- **Realtime**: Supabase Realtime (live scoring)
- **Hosting**: Vercel (free tier)
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier)

### Setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Copy `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
```

3. Push the database schema to Supabase:

```bash
npm run db:push
```

4. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **Auth** -- Email/password signup and login via Supabase Auth
- **Teams** -- Create teams, manage rosters, assign jersey numbers
- **Tournaments** -- Full lifecycle management (draft, registration, in-progress, completed)
- **Divisions** -- Configure divisions with pool-to-bracket, single elimination, or double elimination formats
- **Registration** -- Teams register for tournaments; organizers approve registrations
- **Pool Play** -- Auto-generate pools with university-aware distribution and round-robin matches
- **Brackets** -- Auto-generate single/double elimination brackets with proper seeding
- **Scheduling** -- Auto-schedule matches across courts with configurable time slots
- **Live Scoring** -- Real-time score entry with Supabase Realtime push to all viewers
- **Responsive** -- Mobile-friendly design with sidebar navigation and sheet menu

## Project Structure

```
src/
  app/
    (auth)/          -- Login, signup, auth callback
    (dashboard)/     -- Authenticated app shell
      dashboard/     -- Home dashboard
      tournaments/   -- Tournament CRUD + detail + brackets + scoring
      teams/         -- Team management + roster
      schedule/      -- Global schedule view
  components/
    ui/              -- shadcn/ui primitives
    layout/          -- Sidebar, header, mobile nav, user menu
  lib/
    db/              -- Drizzle schema, client, migrations
    supabase/        -- Supabase browser + server clients, middleware
    utils/           -- Pool, bracket, scheduling algorithms
    validators/      -- Zod schemas
  types/             -- Shared TypeScript types
```

## Database Commands

```bash
npm run db:generate  # Generate migration files
npm run db:migrate   # Run migrations
npm run db:push      # Push schema directly (dev)
npm run db:studio    # Open Drizzle Studio
```
