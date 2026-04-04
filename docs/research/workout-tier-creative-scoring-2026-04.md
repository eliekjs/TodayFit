# Workout tier and creative selection (2026-04)

## Problem

Beginner / intermediate / advanced preferences barely changed exercise mix because most movements inherited all three tier tags and scoring ignored `user_level` and creative mode (creative only hard-excluded when off).

## Approach

- **Inference** (`lib/workoutLevel.ts`): `inferWorkoutLevelsFromExtendedSource` combines explicit `workout_levels`, name heuristics (e.g. pistol/snatch → advanced-only), and a complexity score from `difficulty`, demand fields, unilateral, modality, equipment, tags. Outputs `["beginner","intermediate"]`, all three, `["intermediate","advanced"]`, or `["advanced"]` — not a single default of all three.
- **Adapters**: Static and DB paths pass full ontology context into inference; optional DB `workout_levels` column parsed via `parseWorkoutLevelsFromDb`.
- **Scoring**: `computeWorkoutLevelPreferenceScore` and `computeCreativeSelectionBonus` in `scoreExercise` with session `WeakMap` context for regression/progression graph (`attachWorkoutLevelScoringContext`).
- **Filters**: Beginners additionally excluded when `workout_level_tags` omit `beginner` or `difficulty >= 5` (`isHardBlockedForBeginnerTier`).

## Evidence / classification

Heuristic tiering and preference scoring are **context-dependent programming rules** (not meta-analytic strength evidence). Complex lifts remain gated by existing `isComplexSkillLiftForNonAdvanced`.

## Risks / rollback

- Some catalog rows may move up a tier bucket and shrink beginner-visible pool; rollback by reverting `lib/workoutLevel.ts` inference thresholds or adapter wiring.
- Validation: `npx tsx scripts/compareWorkoutTiers.ts`, `npx tsx lib/workoutLevel.inference.test.ts`, `npx tsx logic/workoutGeneration/workout-level-filter.test.ts`.

## Data & ops (phase 2)

- **Migration:** `supabase/migrations/20260404120000_exercises_workout_levels.sql` adds nullable `workout_levels text[]`.
- **Backfill:** `npm run backfill:workout-levels -- --dry-run` (default) or `--apply`; `--force` overwrites non-empty DB values. Prefer `SUPABASE_SERVICE_ROLE_KEY` for writes under RLS.
- **Audit:** `npm run audit:workout-levels` (JSON distributions + suspicious rows).
- **Explainability:** `WORKOUT_LEVEL_DEBUG=1` populates `exercise.workout_levels_meta` in adapters; scorer exposes `tier_preference_components` / `creative_bonus_components` when `include_scoring_breakdown` is true.
