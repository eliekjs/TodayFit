# Single exercise source: database

The app uses **Supabase as the single source of truth** for the exercise catalog. There is no static fallback pool at runtime.

## Runtime behavior

- **Workout generation** (`generateWorkoutAsync`) loads the exercise pool from Supabase via `listExercisesForGenerator()`. Supabase must be configured (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`). If the catalog is empty or filters match nothing, generation throws a clear error.
- **Sync generator** (`generateWorkout`) does not use a default pool; callers must pass an explicit `exercisesInput` (e.g. tests or scripts that load from DB first).

## Adding or updating exercises

1. **Edit the canonical source**  
   Add or update exercises in the repo:
   - Built-in / calisthenics: `data/exercises.ts` (`EXERCISES_BUILTIN` or the merged list).
   - OTA: `data/otaMovements.ts` (or the ingest script that writes it).
   - Functional fitness: `data/exercisesFunctionalFitness.ts`.

2. **Sync to the database**  
   Run the seed script so Supabase has the same set:

   ```bash
   EXPO_PUBLIC_SUPABASE_URL=... EXPO_PUBLIC_SUPABASE_ANON_KEY=... npx ts-node scripts/seedExercisesToDb.ts
   ```
   (Or use `npx tsx` if your project uses it.)

   If your RLS policies do not allow anon inserts, use the service role key:

   ```bash
   EXPO_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx ts-node scripts/seedExercisesToDb.ts
   ```

3. **Optional: run audits**  
   Scripts like `scripts/auditExerciseTagMatchability.ts` can run against the static `EXERCISES` array (for CI or offline checks) or you can add a path that uses `listExercises()` against a configured DB.

## Why one source

- **Single source of truth** — No drift between “static pool” and “DB pool”; the generator always sees the same catalog.
- **Clear failure mode** — If Supabase is missing or the catalog isn’t seeded, the app fails with a clear message instead of silently using a different set.
- **Tag enrichment** — Goal tags, normalized attribute tags, and derived tags (muscles, movement pattern) are applied at read time in `mapDbExerciseToGeneratorExercise` and `exerciseDefinitionToGeneratorExercise`; the DB can store a minimal set and the adapters expand it for the generator.

## Related

- Generator: `lib/generator.ts` (`generateWorkoutAsync`, `generateWorkout`).
- DB listing: `lib/db/exerciseRepository.ts` (`listExercisesForGenerator`, `listExercises`).
- Seed script: `scripts/seedExercisesToDb.ts`.
