-- Phase: exercise library curation persistence (prefill, LLM, clusters, pruning, generator eligibility).
-- Rollback (manual): DROP INDEX IF EXISTS ...; ALTER TABLE public.exercises DROP COLUMN IF EXISTS curation_review_notes; ... (drop all curation_* columns).

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS curation_primary_role text,
  ADD COLUMN IF NOT EXISTS curation_equipment_class text,
  ADD COLUMN IF NOT EXISTS curation_complexity text,
  ADD COLUMN IF NOT EXISTS curation_keep_category text,
  ADD COLUMN IF NOT EXISTS curation_generator_eligibility_state text,
  ADD COLUMN IF NOT EXISTS curation_canonical_exercise_id text,
  ADD COLUMN IF NOT EXISTS curation_cluster_id text,
  ADD COLUMN IF NOT EXISTS curation_sport_transfer_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS curation_movement_patterns text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS curation_llm_confidence numeric,
  ADD COLUMN IF NOT EXISTS curation_pruning_recommendation text,
  ADD COLUMN IF NOT EXISTS curation_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS curation_is_canonical boolean,
  ADD COLUMN IF NOT EXISTS curation_merge_target_exercise_id text,
  ADD COLUMN IF NOT EXISTS curation_review_notes jsonb,
  ADD COLUMN IF NOT EXISTS curation_reason_codes text[] DEFAULT '{}';

COMMENT ON COLUMN public.exercises.curation_generator_eligibility_state IS
  'Phase 6: eligible_core | eligible_niche | excluded_merged | excluded_removed | excluded_review | excluded_unknown';
COMMENT ON COLUMN public.exercises.curation_pruning_recommendation IS
  'Phase 5: keep_core | keep_niche | merge_into_canonical | remove_niche_or_low_value | review';

CREATE INDEX IF NOT EXISTS idx_exercises_curation_eligibility
  ON public.exercises (curation_generator_eligibility_state)
  WHERE curation_generator_eligibility_state IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exercises_curation_keep_category
  ON public.exercises (curation_keep_category)
  WHERE curation_keep_category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exercises_curation_primary_role
  ON public.exercises (curation_primary_role)
  WHERE curation_primary_role IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exercises_curation_equipment_class
  ON public.exercises (curation_equipment_class)
  WHERE curation_equipment_class IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exercises_curation_cluster_id
  ON public.exercises (curation_cluster_id)
  WHERE curation_cluster_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exercises_curation_updated_at
  ON public.exercises (curation_updated_at DESC)
  WHERE curation_updated_at IS NOT NULL;
