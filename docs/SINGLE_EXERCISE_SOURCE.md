# Single exercise source: database (production)

In **production**, the seeded **Supabase** catalog is the source of truth for workout generation.

## Runtime behavior (`generateWorkoutAsync`)

1. **Supabase configured and seeded** — If the number of **active** rows in `public.exercises` is at least the policy minimum (default **50**, see `lib/exerciseCatalogPolicy.ts`), the generator uses **only** the DB pool from `listExercisesForGenerator()`. Static TypeScript catalogs are **not** merged or loaded, which keeps the bundle fast once the DB is authoritative.

2. **Supabase missing, empty, or below threshold** — The app merges whatever the DB returns (if any) with the lazy-loaded static catalogs (`data/exercises.ts` builtin + functional fitness + OTA) so local development and partially seeded projects still work.

3. **Override** — Set `EXPO_PUBLIC_MIN_DB_EXERCISES_FOR_SOURCE_OF_TRUTH` to an integer ≥ 1 to change the threshold (e.g. stricter production gates).

4. **Errors** — If the pool is empty after loading (e.g. injury filters exclude every exercise, or nothing is seeded), generation throws a clear error.

- **Sync generator** (`generateWorkout`) does not use a default pool; callers must pass an explicit `exercisesInput` (e.g. tests or scripts).

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

## Why database-first in production

- **Single source of truth** — Seeded Supabase rows drive generation; no drift with a second full catalog in memory.
- **Performance** — Below-threshold or offline builds still merge static data; above the threshold, large static modules are not loaded at generation time.
- **Clear failure mode** — Empty pool after load surfaces an explicit error (seed catalog or relax filters).
- **Tag enrichment** — Goal tags, normalized attribute tags, and derived tags are applied at read time in `mapDbExerciseToGeneratorExercise` and `exerciseDefinitionToGeneratorExercise`.

## Related

- Policy: `lib/exerciseCatalogPolicy.ts` (threshold for DB-as-source-of-truth).
- Generator: `lib/generator.ts` (`loadMergedExercisePoolForGenerator`, `generateWorkoutAsync`).
- DB: `lib/db/exerciseRepository.ts` (`countActiveCatalogExercises`, `listExercisesForGenerator`, `listExercises`).
- Seed script: `scripts/seedExercisesToDb.ts`.
