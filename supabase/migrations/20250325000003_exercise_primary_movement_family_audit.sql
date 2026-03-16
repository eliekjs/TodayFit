-- Primary movement family audit: set primary_movement_family for all exercises (ontology-aligned).
-- See docs/research/exercise-primary-movement-family-audit.md and lib/ontology/vocabularies.ts (MOVEMENT_FAMILIES).

-- ============== 1) Backfill primary_movement_family where NULL or empty ==============
-- Derive from modalities, movement_pattern, primary_muscles (canonical slugs after muscles audit).

UPDATE public.exercises e
SET primary_movement_family = CASE
  -- Mobility / recovery first
  WHEN e.modalities && ARRAY['mobility','recovery'] THEN 'mobility'
  -- Conditioning: cardio / work capacity (locomotion + conditioning modality, or cardio equipment)
  WHEN e.modalities && ARRAY['conditioning'] AND (e.movement_pattern = 'locomotion' OR e.movement_patterns && ARRAY['locomotion']) THEN 'conditioning'
  WHEN e.slug IN ('rower','assault_bike','ski_erg','zone2_bike','zone2_treadmill','zone2_rower','zone2_stair_climber','jump_rope','burpee','mountain_climber','bear_crawl','battle_ropes','battle_rope_waves') THEN 'conditioning'
  -- Upper push: movement_pattern push + chest/triceps/shoulders
  WHEN e.movement_pattern = 'push' AND (e.primary_muscles && ARRAY['chest','triceps','shoulders']) THEN 'upper_push'
  WHEN e.movement_pattern = 'push' THEN 'upper_push'
  -- Upper pull: movement_pattern pull + lats/biceps/upper_back/back
  WHEN e.movement_pattern = 'pull' AND (e.primary_muscles && ARRAY['lats','biceps','upper_back','back']) THEN 'upper_pull'
  WHEN e.movement_pattern = 'pull' THEN 'upper_pull'
  -- Lower body: squat, hinge, locomotion with legs/quads/glutes/hamstrings
  WHEN e.movement_pattern IN ('squat','hinge') AND (e.primary_muscles && ARRAY['legs','quads','glutes','hamstrings','calves']) THEN 'lower_body'
  WHEN e.movement_pattern = 'locomotion' AND (e.primary_muscles && ARRAY['legs','quads','glutes','hamstrings']) THEN 'lower_body'
  WHEN e.movement_pattern IN ('squat','hinge','locomotion') THEN 'lower_body'
  -- Carry: core-dominant → core; legs involved → lower_body
  WHEN e.movement_pattern = 'carry' AND e.primary_muscles @> ARRAY['core'] AND NOT (e.primary_muscles && ARRAY['legs','quads','glutes','hamstrings']) THEN 'core'
  WHEN e.movement_pattern = 'carry' THEN 'lower_body'
  -- Rotate / core: core-dominant, rotation, anti-rotation, thoracic mobility
  WHEN e.movement_pattern = 'rotate' THEN 'core'
  WHEN e.movement_patterns && ARRAY['rotation','anti_rotation','thoracic_mobility'] THEN 'core'
  WHEN e.primary_muscles @> ARRAY['core'] AND NOT (e.primary_muscles && ARRAY['legs','quads','glutes','hamstrings','chest','triceps','shoulders','lats','biceps','upper_back','back']) THEN 'core'
  -- Fallback by movement_pattern
  WHEN e.movement_pattern = 'push' THEN 'upper_push'
  WHEN e.movement_pattern = 'pull' THEN 'upper_pull'
  WHEN e.movement_pattern IN ('squat','hinge','locomotion') THEN 'lower_body'
  WHEN e.movement_pattern = 'carry' THEN 'lower_body'
  WHEN e.movement_pattern = 'rotate' THEN 'core'
  ELSE 'lower_body'
END
WHERE e.is_active = true
  AND (e.primary_movement_family IS NULL OR e.primary_movement_family = '');

-- ============== 2) Override hybrids: set primary + optional secondary_movement_families ==============
-- Thruster, clean and press, etc.: primary lower_body, secondary upper_push
UPDATE public.exercises
SET primary_movement_family = 'lower_body',
    secondary_movement_families = ARRAY['upper_push']
WHERE slug IN ('thruster','clean_and_press','push_press','push_jerk')
  AND is_active = true;

-- Sled push: lower body + push (legs dominant)
UPDATE public.exercises
SET primary_movement_family = 'lower_body',
    secondary_movement_families = COALESCE(secondary_movement_families, '{}')
WHERE slug = 'sled_push' AND is_active = true;

-- Rower / ski erg / assault bike as conditioning (ensure not overwritten by locomotion+legs)
UPDATE public.exercises
SET primary_movement_family = 'conditioning'
WHERE slug IN ('rower','assault_bike','ski_erg','zone2_bike','zone2_treadmill','zone2_rower','zone2_stair_climber')
  AND is_active = true;

-- Wrist curl, forearm: upper_pull (arm)
UPDATE public.exercises
SET primary_movement_family = 'upper_pull'
WHERE slug IN ('wrist_curl')
  AND is_active = true;

-- ============== 3) Normalize invalid primary_movement_family to allowed slug ==============
UPDATE public.exercises
SET primary_movement_family = CASE
  WHEN primary_movement_family NOT IN ('upper_push','upper_pull','lower_body','core','mobility','conditioning') THEN
    CASE
      WHEN modalities && ARRAY['mobility','recovery'] THEN 'mobility'
      WHEN modalities && ARRAY['conditioning'] AND (movement_pattern = 'locomotion' OR movement_patterns && ARRAY['locomotion']) THEN 'conditioning'
      WHEN movement_pattern = 'push' THEN 'upper_push'
      WHEN movement_pattern = 'pull' THEN 'upper_pull'
      WHEN movement_pattern IN ('squat','hinge','locomotion','carry') THEN 'lower_body'
      WHEN movement_pattern = 'rotate' THEN 'core'
      ELSE 'lower_body'
    END
  ELSE primary_movement_family
END
WHERE is_active = true
  AND primary_movement_family IS NOT NULL
  AND primary_movement_family != ''
  AND primary_movement_family NOT IN ('upper_push','upper_pull','lower_body','core','mobility','conditioning');
