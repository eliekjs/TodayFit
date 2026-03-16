-- Exercise descriptions audit: normalize and backfill (display-ready text).
-- See docs/research/exercise-descriptions-audit.md.
-- Column already exists (20250301000002). Normalize trim/empty; backfill NULL with derived stub.

-- ============== 1) Normalize: trim and set empty to NULL ==============
UPDATE public.exercises
SET description = NULL
WHERE description IS NOT NULL AND TRIM(description) = '';

UPDATE public.exercises
SET description = TRIM(description)
WHERE description IS NOT NULL AND description != TRIM(description);

-- ============== 2) Backfill: derived one-liner where description IS NULL ==============
-- Stub format: "[Name] is a [family] exercise. [Targets muscles.] Equipment: [list or bodyweight]."
UPDATE public.exercises e
SET description = (
  e.name
  || ' is a '
  || CASE e.primary_movement_family
      WHEN 'upper_push' THEN 'upper-body push'
      WHEN 'upper_pull' THEN 'upper-body pull'
      WHEN 'lower_body' THEN 'lower-body'
      WHEN 'core' THEN 'core'
      WHEN 'mobility' THEN 'mobility'
      WHEN 'conditioning' THEN 'conditioning'
      ELSE 'compound'
    END
  || ' exercise.'
  || CASE WHEN array_length(e.primary_muscles, 1) > 0
      THEN ' Targets ' || array_to_string(e.primary_muscles, ', ') || '.'
      ELSE ''
    END
  || ' Equipment: '
  || CASE WHEN array_length(e.equipment, 1) > 0
      THEN array_to_string(e.equipment, ', ')
      ELSE 'bodyweight'
    END
  || '.'
)
WHERE e.is_active = true
  AND e.description IS NULL;

COMMENT ON COLUMN public.exercises.description IS 'User-facing exercise description. Optional. Prefer 1–3 sentences from ExRx/NSCA; stub may be derived from name, movement family, muscles, equipment until curated.';
