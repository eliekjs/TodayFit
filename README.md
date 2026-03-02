# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Supabase (all app data)

The app uses [Supabase](https://supabase.com) (Postgres + Supabase Auth) as the single backend for:

- **Sport Mode**: sports catalog, sport qualities, user sport profiles, sport events
- **Core app**: exercises & tags, gym profiles & equipment, workouts (generated + history + saved), user preferences & presets, user goals

See **MIGRATION.md** for the migration plan, entity list, and verification checklist.

### Setup

1. Create a Supabase project at [supabase.com](https://supabase.com) and get your project URL and **anon (public)** key.
2. Add to your environment (e.g. `.env` — see `.env.example`; **do not commit** `.env` or any **service_role** key):
   - `EXPO_PUBLIC_SUPABASE_URL` — your Supabase project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` — your project’s anon/public key

### Running migrations

Apply schema and seeds in order (Supabase Dashboard **SQL Editor** or CLI):

| Order | File | Description |
|-------|------|-------------|
| 1 | `supabase/migrations/20250301000000_sport_mode_schema.sql` | Sport Mode tables, RLS, triggers |
| 2 | `supabase/migrations/20250301000001_sport_mode_seed.sql` | Sports, qualities, sport_quality_map |
| 3 | `supabase/migrations/20250301000002_app_entities_schema.sql` | Exercises, tags, gym_profiles, workouts, user_preferences, etc. + RLS |
| 4 | `supabase/migrations/20250301000003_app_entities_seed.sql` | Exercise tags, exercises, exercise_tag_map, exercise_contraindications |
| 5 | `supabase/migrations/20250301000004_sport_prep_plans_schema.sql` | Goals, goal_demand_profile, user_training_plans, weekly_plan_instances, weekly_plan_days |
| 6 | `supabase/migrations/20250301000005_sport_prep_plans_seed.sql` | Goals + goal_demand_profile seed |
| 7 | `supabase/migrations/20250301000006_sports_extended_schema.sql` | Adds description, popularity_tier to sports |
| 8 | `supabase/migrations/20250301000007_sports_canonical_seed.sql` | Canonical sports list for Sports Prep |
| 9 | `supabase/migrations/20250301000008_sports_tags_and_starter_exercises.sql` | sport_tag_profile, exercise_tag_taxonomy, starter_exercises, goal_exercise_relevance |

**Option B — Supabase CLI**

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

After migrations 00–08 are applied, sign in and use **Generate Week Plan** on the Adaptive setup screen to verify the week view.

Seeds are **idempotent** (upserts by slug / composite key). Re-run them safely if needed.

### Auth

When no user is signed in, the app keeps using in-memory state (no persistence). Sign in with Supabase Auth to persist gym profiles, preferences, workout history, and saved workouts. The client uses only the **anon** key; never use or commit the **service_role** key in the app or repo.

### One-time migration scripts

If you need to migrate from another backend (e.g. Firebase), add one-off scripts under `/tools`. Use service credentials only in local env (not committed). See MIGRATION.md.

### Verification

- **Sport Mode**: Profile tab → **Sport DB (Dev)** (dev-only) to load sports/qualities and test profile save/RLS.
- **Full checklist**: MIGRATION.md § Verification checklist.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
