# Home Hub

A private household command center for shared daily life. Built with Next.js, Tailwind CSS, Supabase/PostgreSQL, Supabase Auth, and Vercel.

## Features

- Supabase Auth
- Household membership and owner-managed settings
- Dashboard with live summaries
- Shared groceries
- Shared tasks
- Money tracking
- Recipes and meal planning
- Home assets and maintenance reminders
- Shared notes
- Global Quick Add for task, grocery, expense, or note
- Desktop sidebar and mobile bottom navigation

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Add your Supabase values to `.env.local`:

```txt
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-or-secret-key
```

Start the app:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Supabase Setup

Create a Supabase project, then run the SQL files in this order from the Supabase SQL Editor:

```txt
supabase/migrations/0001_initial_schema.sql
supabase/migrations/0002_auto_household_for_new_users.sql
supabase/migrations/0003_allow_household_creator_select.sql
supabase/migrations/0004_create_household_rpc.sql
supabase/migrations/0005_household_member_management.sql
```

Supabase Auth settings:

- Enable Email auth.
- For local development, add `http://localhost:3000` to allowed redirect URLs.
- For production, add your Vercel production URL after deployment.

## Vercel Deployment

1. Push this repo to GitHub.
2. In Vercel, create a new project from the GitHub repo.
3. Add these environment variables in Vercel Project Settings:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

4. Deploy.
5. Copy the Vercel production URL.
6. In Supabase Auth settings, add the Vercel URL to allowed redirect URLs.
7. Test signup, login, and one write action such as adding a grocery item.

## Useful Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Project Structure

```txt
src/
  app/
    (auth)/
      login/
      signup/
    (app)/
      dashboard/
      groceries/
      home/
      meals/
      money/
      notes/
      settings/
      tasks/
  components/
  lib/
    supabase/
  types/
supabase/
  migrations/
```

## Deployment Checklist

- `npm run lint` passes.
- `npm run build` passes.
- `.env.local` exists locally and is not committed.
- Vercel has all required environment variables.
- Supabase migrations have all been run.
- Supabase Auth redirect URLs include local and production URLs.
- First owner account can sign up.
- Owner can add a household member after that member signs up.
