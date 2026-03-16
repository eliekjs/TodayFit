-- Exercise fatigue_regions audit: normalize to canonical slugs and backfill where null/empty.
-- See docs/research/exercise-fatigue-regions-audit.md and lib/ontology/vocabularies.ts (FATIGUE_REGIONS).
-- Canonical: quads, glutes, hamstrings, pecs, triceps, shoulders, lats, biceps, forearms, grip, core, calves.

-- ============== 1) Normalize existing fatigue_regions: only canonical slugs ==============
-- Map legs->quads+glutes (or glutes+hamstrings if hinge), chest->pecs, back->lats; drop any other non-canonical.
UPDATE public.exercises e
SET fatigue_regions = (
  SELECT COALESCE(array_agg(DISTINCT r ORDER BY r), '{}')
  FROM (
    SELECT unnest(
      CASE
        WHEN mem IN ('legs','leg') AND e.movement_pattern = 'hinge' THEN ARRAY['glutes','hamstrings']
        WHEN mem IN ('legs','leg') THEN ARRAY['quads','glutes']
        WHEN mem IN ('chest','pecs') THEN ARRAY['pecs']
        WHEN mem IN ('back','lats') THEN ARRAY['lats']
        WHEN mem IN ('quads','glutes','hamstrings','pecs','triceps','shoulders','lats','biceps','forearms','grip','core','calves') THEN ARRAY[mem]
        ELSE ARRAY[]::text[]
      END
    ) AS r
    FROM unnest(COALESCE(e.fatigue_regions, '{}')) AS mem
  ) sub
  WHERE r <> ''
)
WHERE e.is_active = true
  AND e.fatigue_regions IS NOT NULL
  AND array_length(e.fatigue_regions, 1) > 0
  AND (
    e.fatigue_regions && ARRAY['legs','leg','chest','back']
    OR EXISTS (
      SELECT 1 FROM unnest(e.fatigue_regions) AS u
      WHERE u NOT IN ('quads','glutes','hamstrings','pecs','triceps','shoulders','lats','biceps','forearms','grip','core','calves')
    )
  );

-- ============== 2) Backfill: NULL or empty from pairing_category ==============
UPDATE public.exercises e
SET fatigue_regions = CASE e.pairing_category
  WHEN 'chest' THEN ARRAY['pecs','triceps']::text[]
  WHEN 'shoulders' THEN ARRAY['shoulders','triceps']::text[]
  WHEN 'triceps' THEN ARRAY['triceps','pecs']::text[]
  WHEN 'back' THEN ARRAY['lats','biceps']::text[]
  WHEN 'biceps' THEN ARRAY['biceps','lats']::text[]
  WHEN 'quads' THEN CASE WHEN e.movement_pattern = 'hinge' THEN ARRAY['glutes','hamstrings','core']::text[] ELSE ARRAY['quads','core']::text[] END
  WHEN 'posterior_chain' THEN ARRAY['hamstrings','glutes','core']::text[]
  WHEN 'core' THEN ARRAY['core']::text[]
  WHEN 'grip' THEN ARRAY['forearms','grip','core']::text[]
  WHEN 'mobility' THEN ARRAY[]::text[]
  ELSE COALESCE(e.fatigue_regions, '{}')
END
WHERE e.is_active = true
  AND (e.fatigue_regions IS NULL OR array_length(e.fatigue_regions, 1) IS NULL OR array_length(e.fatigue_regions, 1) = 0)
  AND e.pairing_category IS NOT NULL;

-- ============== 3) Backfill: NULL or empty from primary_movement_family (pairing_category null) ==============
UPDATE public.exercises e
SET fatigue_regions = CASE e.primary_movement_family
  WHEN 'upper_push' THEN ARRAY['pecs','triceps','shoulders']::text[]
  WHEN 'upper_pull' THEN ARRAY['lats','biceps']::text[]
  WHEN 'lower_body' THEN CASE WHEN e.movement_pattern = 'hinge' THEN ARRAY['hamstrings','glutes','core']::text[] ELSE ARRAY['quads','glutes','core']::text[] END
  WHEN 'core' THEN ARRAY['core']::text[]
  WHEN 'mobility' THEN ARRAY[]::text[]
  WHEN 'conditioning' THEN ARRAY['quads','core']::text[]
  ELSE COALESCE(e.fatigue_regions, '{}')
END
WHERE e.is_active = true
  AND (e.fatigue_regions IS NULL OR array_length(e.fatigue_regions, 1) IS NULL OR array_length(e.fatigue_regions, 1) = 0)
  AND e.primary_movement_family IS NOT NULL;

-- ============== 4) Backfill: NULL or empty from primary_muscles (map to canonical fatigue regions) ==============
UPDATE public.exercises e
SET fatigue_regions = (
  SELECT COALESCE(array_agg(DISTINCT r ORDER BY r), '{}')
  FROM (
    SELECT CASE m
      WHEN 'push' THEN 'pecs'
      WHEN 'pull' THEN 'lats'
      WHEN 'chest' THEN 'pecs'
      WHEN 'pecs' THEN 'pecs'
      WHEN 'triceps' THEN 'triceps'
      WHEN 'shoulders' THEN 'shoulders'
      WHEN 'back' THEN 'lats'
      WHEN 'lats' THEN 'lats'
      WHEN 'biceps' THEN 'biceps'
      WHEN 'quads' THEN 'quads'
      WHEN 'glutes' THEN 'glutes'
      WHEN 'hamstrings' THEN 'hamstrings'
      WHEN 'calves' THEN 'calves'
      WHEN 'core' THEN 'core'
      WHEN 'forearms' THEN 'grip'
      WHEN 'legs' THEN CASE WHEN e.movement_pattern = 'hinge' THEN 'glutes' ELSE 'quads' END
      ELSE NULL
    END AS r
    FROM unnest(COALESCE(e.primary_muscles, '{}')) AS m
  ) sub
  WHERE r IS NOT NULL
)
WHERE e.is_active = true
  AND (e.fatigue_regions IS NULL OR array_length(e.fatigue_regions, 1) IS NULL OR array_length(e.fatigue_regions, 1) = 0)
  AND e.primary_muscles IS NOT NULL
  AND array_length(e.primary_muscles, 1) > 0;

-- When primary_muscles gave only one region (e.g. legs->quads), add glutes/core for lower_body hinge or quads/core for squat
UPDATE public.exercises e
SET fatigue_regions = (
  SELECT array_agg(DISTINCT r ORDER BY r)
  FROM (
    SELECT unnest(e.fatigue_regions) AS r
    UNION
    SELECT unnest(
      CASE
        WHEN e.primary_movement_family = 'lower_body' AND e.movement_pattern = 'hinge' AND NOT (e.fatigue_regions && ARRAY['glutes','hamstrings']) THEN ARRAY['glutes','hamstrings','core']::text[]
        WHEN e.primary_movement_family = 'lower_body' AND NOT (e.fatigue_regions && ARRAY['quads','glutes']) THEN ARRAY['quads','core']::text[]
        ELSE ARRAY[]::text[]
      END
    ) AS r
  ) sub
  WHERE r <> ''
)
WHERE e.is_active = true
  AND e.primary_movement_family = 'lower_body'
  AND e.fatigue_regions IS NOT NULL
  AND array_length(e.fatigue_regions, 1) > 0
  AND array_length(e.fatigue_regions, 1) < 3
  AND (e.movement_pattern = 'hinge' OR e.movement_pattern = 'squat' OR e.movement_pattern = 'lunge');

-- ============== 5) Grip-heavy: ensure forearms and grip when pairing_category = grip ==============
UPDATE public.exercises e
SET fatigue_regions = (
  SELECT array_agg(DISTINCT r ORDER BY r)
  FROM (SELECT unnest(COALESCE(e.fatigue_regions, '{}') || ARRAY['forearms','grip']) AS r) t
  WHERE r <> ''
)
WHERE e.is_active = true
  AND e.pairing_category = 'grip'
  AND (e.fatigue_regions IS NULL OR NOT (e.fatigue_regions && ARRAY['forearms','grip']));

COMMENT ON COLUMN public.exercises.fatigue_regions IS 'Canonical slugs only: quads, glutes, hamstrings, pecs, triceps, shoulders, lats, biceps, forearms, grip, core, calves. Used for superset pairing and fatigue awareness.';
