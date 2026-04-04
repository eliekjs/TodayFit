-- Durable experience tiers for generator filtering and scoring.
-- Values: 'beginner' | 'intermediate' | 'advanced' (subset allowed per row).
-- Null/empty = infer at runtime until backfill.

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS workout_levels text[] DEFAULT NULL;

COMMENT ON COLUMN public.exercises.workout_levels IS
  'Ordered experience tiers (beginner, intermediate, advanced). NULL = inference from ontology/tags in app.';

CREATE INDEX IF NOT EXISTS idx_exercises_workout_levels
  ON public.exercises USING GIN(workout_levels)
  WHERE workout_levels IS NOT NULL AND array_length(workout_levels, 1) > 0;
