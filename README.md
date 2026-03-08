# TodayFit

A fitness app for building and executing workouts, with sport-specific prep and adaptive planning. One codebase for iOS, Android, and web.

## Features

- **Build My Workout** — Create a day or a week of workouts using **session-focused filters**: duration, goal, equipment, energy, injuries, body focus. Same generation logic whether you’re building one day or a full week.
- **Adaptive / Sports Prep** — Create a day or a week of workouts using **sport- and plan-focused filters**: sports, training goals, gym days, sport days, events, phase. Same generation logic; the difference is the type of filters, not daily vs weekly.
- **Manual planning** — Plan individual days or weeks and generate workouts per session (from either mode).
- **History & saved** — Log completed workouts and save favorites.
- **Backend** — Supabase (Postgres + Auth). Catalog data works without sign-in; sign in to persist profiles, plans, and history.

## Tech stack

| Layer      | Choices |
|-----------|---------|
| **App**   | React Native (Expo SDK 54), TypeScript (strict), Expo Router (file-based routing), React 19 |
| **UI**    | React Native Reanimated, Gesture Handler (e.g. reorderable lists) |
| **Backend** | Supabase (Postgres, Auth). Client uses anon key only; RLS for security. No separate API server. |
| **Data**  | SQL migrations in `supabase/migrations/` (schema + seeds, idempotent where possible) |

**Project layout**

- `app/` — Screens and routes (Expo Router); `(tabs)/` = bottom tabs.
- `lib/` — DB client, repositories, types, theme, date utils, generation helpers.
- `services/` — Workout builder, sport-prep planner.
- `logic/` — Workout generation (rules, daily generator).
- `data/` — Static/canonical data (sport sub-focus, gym profiles, tag taxonomy).
- `components/` — Shared UI. `context/` — Auth and app state. `hooks/` — Theme, color scheme.

## Prerequisites

- Node.js (LTS)
- npm (or yarn/pnpm)
- A [Supabase](https://supabase.com) project (for full app; optional for local UI only)

## Installation

```bash
git clone <repo-url>
cd todayfit
npm install
```

## Configuration

Create a `.env` (see `.env.example`). Do not commit `.env` or any service_role key.

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your project’s anon (public) key |

Without these, the app runs with in-memory state only; sign-in and persistence require a configured Supabase project.

## Database (Supabase)

The app uses Supabase for sports catalog, exercises & tags, gym profiles, workouts, user preferences, goals, and weekly plans. Apply migrations in order (Supabase Dashboard **SQL Editor** or CLI):

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Migration files live in `supabase/migrations/`. Key groups:

- **Sport mode** — `20250301000000`–`20250301000001`: sports, qualities, user sport profiles.
- **App entities** — `20250301000002`–`20250301000003`: exercises, tags, gym_profiles, workouts, user_preferences.
- **Sport prep / goals** — `20250301000004`–`20250301000008`: goals, demand profiles, sport tag profiles, starter exercises.
- **Catalog read** — `20250302000000`: anon read for sports, exercises, goals (app works without sign-in).

Seeds are idempotent (upserts by slug). See **MIGRATION.md** for the full list and verification checklist.

## Running the app

```bash
npx expo start
```

Then choose iOS simulator, Android emulator, or web. For a development build, see [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/).

## Auth

When no user is signed in, the app uses in-memory state (no persistence). Sign in with Supabase Auth to save gym profiles, preferences, workout history, and weekly plans. The client uses only the **anon** key.

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run android` | Start with Android |
| `npm run ios` | Start with iOS |
| `npm run web` | Start for web |
| `npm run lint` | Run ESLint |
| `npm run test:generator` | Run workout generator seed test |

## Docs

- **MIGRATION.md** — Migration order, entity list, verification checklist.
- **docs/** — Development plans (e.g. sport prep, sub-focus).

## License

Private.
