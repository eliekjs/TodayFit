-- Primary movement family: enrich secondary_movement_families and fix hybrids (NSCA/ACSM-style).
-- See docs/research/primary-movement-family-audit-2025.md.

-- ============== 1) Hybrids: set primary + secondary_movement_families (order: primary first, secondaries) ==============
-- DB snatch: lower body + upper push (shoulder)
UPDATE public.exercises
SET primary_movement_family = 'lower_body',
    secondary_movement_families = ARRAY['upper_push']
WHERE slug = 'db_snatch' AND is_active = true;

-- Split jerk, squat jerk: upper push primary (press), lower body secondary (leg drive)
UPDATE public.exercises
SET primary_movement_family = 'upper_push',
    secondary_movement_families = ARRAY['lower_body']
WHERE slug IN ('split_jerk','squat_jerk') AND is_active = true;

-- Push press, push jerk: keep lower_body + upper_push; ensure secondary set
UPDATE public.exercises
SET primary_movement_family = 'lower_body',
    secondary_movement_families = ARRAY['upper_push']
WHERE slug IN ('push_press','push_jerk') AND is_active = true;

-- Devil's press: hinge + press → lower_body + upper_push
UPDATE public.exercises
SET primary_movement_family = 'lower_body',
    secondary_movement_families = ARRAY['upper_push']
WHERE slug = 'devils_press' AND is_active = true;

-- Power snatch, squat clean, hang clean: lower body + upper pull (receive/catch)
UPDATE public.exercises
SET primary_movement_family = 'lower_body',
    secondary_movement_families = ARRAY['upper_pull']
WHERE slug IN ('power_snatch','squat_clean','hang_clean') AND is_active = true;

-- Clean and press, KB clean: lower + pull + push
UPDATE public.exercises
SET primary_movement_family = 'lower_body',
    secondary_movement_families = ARRAY['upper_pull','upper_push']
WHERE slug IN ('clean_and_press','kb_clean') AND is_active = true;

-- ============== 2) Rows: add secondary core (bracing) where heavy ==============
UPDATE public.exercises
SET secondary_movement_families = COALESCE(secondary_movement_families, '{}') || ARRAY['core']
WHERE slug IN ('barbell_row','pendlay_row','t_bar_row','yates_row','cable_row')
  AND is_active = true
  AND NOT (COALESCE(secondary_movement_families, '{}') @> ARRAY['core']);

-- ============== 3) Core + grip/lat: hanging leg raise, toes to bar ==============
UPDATE public.exercises
SET primary_movement_family = 'core',
    secondary_movement_families = ARRAY['upper_pull']
WHERE slug IN ('hanging_leg_raise','toes_to_bar') AND is_active = true;

-- ============== 4) Conditioning: ensure explicit conditioning family ==============
UPDATE public.exercises
SET primary_movement_family = 'conditioning'
WHERE slug IN (
  'rower_steady','rower_intervals_30_30','row_calorie_burn','assault_bike_steady',
  'ski_erg_intervals','ski_erg_steady','treadmill_run','treadmill_intervals',
  'incline_treadmill_walk','stair_climber_steady','elliptical_steady','sled_drag',
  'battle_rope_waves','jump_squat_light','burpee_box_jump','double_unders',
  'air_bike_sprint','mountain_climber','bear_crawl','jump_rope','burpee'
)
  AND is_active = true
  AND (primary_movement_family IS NULL OR primary_movement_family NOT IN ('conditioning'));

-- ============== 5) Normalize invalid primary_movement_family ==============
UPDATE public.exercises
SET primary_movement_family = CASE
  WHEN primary_movement_family NOT IN ('upper_push','upper_pull','lower_body','core','mobility','conditioning') THEN
    CASE
      WHEN modalities && ARRAY['mobility','recovery'] THEN 'mobility'
      WHEN modalities && ARRAY['conditioning'] OR slug IN ('rower','assault_bike','ski_erg','zone2_bike','zone2_treadmill','zone2_rower','zone2_stair_climber') THEN 'conditioning'
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
