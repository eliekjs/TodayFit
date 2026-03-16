-- Exercise descriptions: evidence-aligned stub wording (ExRx primary movers).
-- See docs/research/descriptions-audit-2025.md. Builds on 20250325000007 and 20250331000000.

-- ============== 1) Normalize: trim and empty to NULL ==============
UPDATE public.exercises
SET description = NULL
WHERE description IS NOT NULL AND TRIM(description) = '';

UPDATE public.exercises
SET description = TRIM(description)
WHERE description IS NOT NULL AND description != TRIM(description);

-- ============== 2) Wording: "Targets" -> "Primarily targets" for stub-style descriptions (ExRx alignment) ==============
UPDATE public.exercises e
SET description = REPLACE(e.description, ' Targets ', ' Primarily targets ')
WHERE e.is_active = true
  AND e.description IS NOT NULL
  AND e.description LIKE '% exercise. Targets % Equipment:%'
  AND e.primary_muscles IS NOT NULL
  AND array_length(e.primary_muscles, 1) > 0;

-- ============== 3) Backfill NULL with evidence-aligned stub ("Primarily targets" when primary_muscles present) ==============
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
      THEN ' Primarily targets ' || array_to_string(e.primary_muscles, ', ') || '.'
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

COMMENT ON COLUMN public.exercises.description IS 'User-facing exercise description. Optional. Prefer 1–3 sentences from ExRx/NSCA; stub may be derived (name, movement family, primarily targets, equipment). See docs/research/descriptions-audit-2025.md.';
