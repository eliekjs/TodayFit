-- Pilot / v1 exercise catalog hygiene (idempotent).
-- Full near-dupe trim + unlabeled classification is applied by:
--   npx tsx scripts/pilotCatalog/applyPilotExerciseScope.ts --apply
-- This migration only deactivates rows already marked excluded so they never
-- download into the client catalog.

UPDATE public.exercises
SET
  is_active = false,
  updated_at = now()
WHERE curation_generator_eligibility_state IN (
  'excluded_merged',
  'excluded_removed',
  'excluded_review',
  'excluded_unknown'
)
AND is_active IS TRUE;

COMMENT ON COLUMN public.exercises.curation_generator_eligibility_state IS
  'Generator pool cohort: eligible_core | eligible_niche | eligible_phase2 | excluded_merged | excluded_removed | excluded_review | excluded_unknown. Pilot uses eligible_core only.';
