-- Fatigue regions: evidence-based enrichment (hybrid compounds, calf-dominant).
-- See docs/research/fatigue-regions-audit-2025.md. Builds on 20250325000006 and 20250331000000.

-- ============== 1) Hybrid compounds: thruster, devils press, wall ball ==============
-- ExRx/NSCA: lower-body drive (quads/glutes) + upper push (shoulders/triceps) + core.
UPDATE public.exercises
SET fatigue_regions = ARRAY['quads', 'glutes', 'shoulders', 'triceps', 'core']::text[]
WHERE is_active = true
  AND slug IN ('thruster', 'devils_press', 'wall_ball');

-- ============== 2) Calf-dominant: ensure calves in fatigue_regions ==============
UPDATE public.exercises e
SET fatigue_regions = (
  SELECT COALESCE(array_agg(DISTINCT r ORDER BY r), '{}')::text[]
  FROM (SELECT unnest(COALESCE(e.fatigue_regions, '{}') || ARRAY['calves']) AS r) sub
  WHERE r <> ''
)
WHERE e.is_active = true
  AND (e.fatigue_regions IS NULL OR NOT (e.fatigue_regions @> ARRAY['calves']))
  AND (
    e.slug IN ('calf_raise', 'seated_calf_raise', 'standing_calf_raise', 'donkey_calf_raise', 'single_leg_calf_raise')
    OR e.name ILIKE '%calf%raise%'
    OR (e.primary_muscles IS NOT NULL AND e.primary_muscles @> ARRAY['calves'])
  );

-- ============== 3) Jump/run conditioning: quads, core, calves when missing ==============
UPDATE public.exercises e
SET fatigue_regions = (
  SELECT COALESCE(array_agg(DISTINCT r ORDER BY r), '{}')::text[]
  FROM (SELECT unnest(COALESCE(e.fatigue_regions, '{}') || ARRAY['quads', 'core', 'calves']) AS r) sub
  WHERE r <> ''
)
WHERE e.is_active = true
  AND (e.fatigue_regions IS NULL OR array_length(e.fatigue_regions, 1) IS NULL OR array_length(e.fatigue_regions, 1) < 2)
  AND (e.slug IN ('jump_rope', 'running', 'sprint', 'bounding', 'lateral_bound', 'skater_jump', 'tuck_jump', 'broad_jump', 'jump_squat', 'jump_lunge'));

COMMENT ON COLUMN public.exercises.fatigue_regions IS 'Canonical slugs only: quads, glutes, hamstrings, pecs, triceps, shoulders, lats, biceps, forearms, grip, core, calves. Used for superset pairing and fatigue awareness. See docs/research/fatigue-regions-audit-2025.md.';
