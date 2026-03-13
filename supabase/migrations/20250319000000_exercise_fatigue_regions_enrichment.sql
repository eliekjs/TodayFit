-- Exercise DB enrichment: fatigue_regions (single category).
-- Normalize to canonical slugs only (docs/EXERCISE_ONTOLOGY_DESIGN.md C.12; lib/ontology/vocabularies.ts FATIGUE_REGIONS).
-- No new columns; backfill and normalize existing fatigue_regions for superset and fatigue-aware generation.
--
-- Canonical: quads, glutes, hamstrings, pecs, triceps, shoulders, lats, biceps, forearms, grip, core, calves.

-- 1) Normalize non-canonical values in existing fatigue_regions.
--    legs -> quads+glutes (squat/lunge) or glutes+hamstrings (hinge); chest -> pecs; back -> lats.
UPDATE public.exercises e
SET fatigue_regions = (
  SELECT COALESCE(array_agg(DISTINCT r ORDER BY r), '{}')
  FROM (
    SELECT unnest(
      CASE
        WHEN mem = 'legs' AND e.movement_pattern = 'hinge' THEN ARRAY['glutes','hamstrings']
        WHEN mem = 'legs' THEN ARRAY['quads','glutes']
        WHEN mem = 'chest' THEN ARRAY['pecs']
        WHEN mem = 'back' THEN ARRAY['lats']
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
  AND e.fatigue_regions && ARRAY['legs','chest','back'];

-- 2) Backfill: NULL or empty fatigue_regions where pairing_category is set.
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

-- 3) Backfill: NULL or empty where primary_movement_family is set but pairing_category is null.
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
  AND e.pairing_category IS NULL
  AND e.primary_movement_family IS NOT NULL;

-- 4) Grip-heavy: ensure forearms and grip in fatigue_regions when pairing_category = grip.
UPDATE public.exercises e
SET fatigue_regions = (
  SELECT array_agg(DISTINCT r ORDER BY r)
  FROM (
    SELECT unnest(COALESCE(e.fatigue_regions, '{}') || ARRAY['forearms','grip'])
  ) AS t(r)
  WHERE r <> ''
)
WHERE e.is_active = true
  AND e.pairing_category = 'grip'
  AND (e.fatigue_regions IS NULL OR NOT (e.fatigue_regions && ARRAY['forearms','grip']));

COMMENT ON COLUMN public.exercises.fatigue_regions IS 'Canonical slugs only: quads, glutes, hamstrings, pecs, triceps, shoulders, lats, biceps, forearms, grip, core, calves. Used for superset pairing and fatigue awareness.';
