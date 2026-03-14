-- Exercise ontology enrichment: aliases, swap candidates, demand/relevance levels.
-- Values for *_relevance and *_demand: 'none' | 'low' | 'medium' | 'high'.
-- Aligned with logic/workoutGeneration/types.ts and lib/db/generatorExerciseAdapter.ts.

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS aliases text[] DEFAULT '{}';

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS swap_candidates text[] DEFAULT '{}';

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS warmup_relevance text;

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS cooldown_relevance text;

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS stability_demand text;

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS grip_demand text;

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS impact_level text;

COMMENT ON COLUMN public.exercises.aliases IS 'Alternate names / search aliases (e.g. OHP, overhead press).';
COMMENT ON COLUMN public.exercises.swap_candidates IS 'Exercise slugs that are good substitutes in the same slot.';
COMMENT ON COLUMN public.exercises.warmup_relevance IS 'Suitability as warm-up: none | low | medium | high.';
COMMENT ON COLUMN public.exercises.cooldown_relevance IS 'Suitability as cooldown/stretch: none | low | medium | high.';
COMMENT ON COLUMN public.exercises.stability_demand IS 'Balance/stability demand: none | low | medium | high.';
COMMENT ON COLUMN public.exercises.grip_demand IS 'Grip/forearm demand: none | low | medium | high.';
COMMENT ON COLUMN public.exercises.impact_level IS 'Joint impact level (e.g. plyometric): none | low | medium | high.';

CREATE INDEX IF NOT EXISTS idx_exercises_warmup_relevance
  ON public.exercises(warmup_relevance) WHERE warmup_relevance IS NOT NULL AND warmup_relevance != 'none';

CREATE INDEX IF NOT EXISTS idx_exercises_cooldown_relevance
  ON public.exercises(cooldown_relevance) WHERE cooldown_relevance IS NOT NULL AND cooldown_relevance != 'none';

CREATE INDEX IF NOT EXISTS idx_exercises_impact_level
  ON public.exercises(impact_level) WHERE impact_level IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exercises_aliases
  ON public.exercises USING GIN(aliases) WHERE aliases <> '{}';
