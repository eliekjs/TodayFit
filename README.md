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

## Sport Mode (Supabase)

The app uses [Supabase](https://supabase.com) (Postgres) for the Sport Mode data layer: sports catalog, sport qualities, user sport profiles, and sport events.

### Setup

1. Create a Supabase project at [supabase.com](https://supabase.com) and get your project URL and anon (public) key.
2. Add to your environment (e.g. `.env` or Expo config):
   - `EXPO_PUBLIC_SUPABASE_URL` — your Supabase project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` — your project’s anon/public key

### Running migrations

Apply the schema and seed using one of these options:

**Option A — Supabase Dashboard**

1. In the Supabase project, open **SQL Editor**.
2. Run the contents of `supabase/migrations/20250301000000_sport_mode_schema.sql` (creates tables, indexes, RLS, triggers).
3. Run the contents of `supabase/migrations/20250301000001_sport_mode_seed.sql` (idempotent seed for sports, qualities, and `sport_quality_map`).

**Option B — Supabase CLI**

From the project root:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

If your migrations are already in `supabase/migrations/`, `db push` runs them in order. To run the seed separately (e.g. after reset), run the seed SQL file in the Dashboard SQL Editor as in Option A.

### Seed

The seed is **idempotent**: it uses `ON CONFLICT (slug) DO UPDATE` for `sports` and `sport_qualities`, and `ON CONFLICT (sport_id, quality_id) DO UPDATE` for `sport_quality_map`. You can run it multiple times without duplicating data.

### Verification

In development, open the **Profile** tab and tap **Sport DB (Dev)** to open the dev-only verification screen. It lets you:

- Load sports and qualities (confirms catalog + RLS read access).
- Save a test user sport profile and read it back (confirms write + read).
- Check RLS (confirms you cannot read another user’s profile when signed in).

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
