-- Exercise rep ranges audit: normalize and backfill (prescription blending).
-- See docs/research/exercise-rep-ranges-audit.md and docs/REP_RANGE_AND_SUPERSET_DURATION.md.
-- When both min and max are set, generator blends with goal range (getEffectiveRepRange).

-- ============== 1) Normalize invalid rep ranges ==============
-- Both must be set together; min <= max; 0 <= min,max <= 100. Else clear both.

-- Clear when only one is set (inconsistent)
UPDATE public.exercises
SET rep_range_min = NULL, rep_range_max = NULL
WHERE is_active = true
  AND ((rep_range_min IS NULL) <> (rep_range_max IS NULL));

-- Clear when min > max
UPDATE public.exercises
SET rep_range_min = NULL, rep_range_max = NULL
WHERE is_active = true
  AND rep_range_min IS NOT NULL AND rep_range_max IS NOT NULL
  AND rep_range_min > rep_range_max;

-- Clear when out of range (0-100)
UPDATE public.exercises
SET rep_range_min = NULL, rep_range_max = NULL
WHERE is_active = true
  AND (rep_range_min IS NOT NULL AND (rep_range_min < 0 OR rep_range_min > 100)
    OR rep_range_max IS NOT NULL AND (rep_range_max < 0 OR rep_range_max > 100));

-- ============== 2) Backfill: calves (15-25) ==============
UPDATE public.exercises
SET rep_range_min = 15, rep_range_max = 25
WHERE is_active = true
  AND rep_range_min IS NULL
  AND (slug IN ('calf_raise', 'seated_calf_raise', 'standing_calf_raise', 'donkey_calf_raise', 'single_leg_calf_raise')
    OR name ILIKE '%calf%raise%' OR name ILIKE '%calf raise%');

-- ============== 3) Backfill: isolation (10-20) ==============
UPDATE public.exercises
SET rep_range_min = 10, rep_range_max = 20
WHERE is_active = true
  AND rep_range_min IS NULL
  AND exercise_role = 'isolation';

-- ============== 4) Backfill: high-rep by slug (12-20) for known isolation/small-muscle ==============
UPDATE public.exercises
SET rep_range_min = 12, rep_range_max = 20
WHERE is_active = true
  AND rep_range_min IS NULL
  AND slug IN (
    'lateral_raise', 'front_raise', 'face_pull', 'reverse_fly', 'concentration_curl', 'tricep_pushdown',
    'leg_curl', 'leg_extension', 'db_fly', 'cable_fly', 'pec_deck', 'cable_crossover', 'skull_crusher',
    'overhead_tricep_extension', 'lying_tricep_extension', 'db_tricep_kickback', 'hammer_curl',
    'preacher_curl', 'spider_curl', 'cable_curl', 'hip_abduction', 'hip_adduction', 'prone_y_raise',
    'incline_cable_fly', 'cable_tricep_extension', 'reverse_curl'
  );

-- ============== 5) Do NOT set for mobility / conditioning (leave null so goal/block drives) ==============
-- Optional: clear rep ranges for mobility/conditioning if they were ever set
UPDATE public.exercises
SET rep_range_min = NULL, rep_range_max = NULL
WHERE is_active = true
  AND (exercise_role IN ('mobility', 'conditioning', 'cooldown', 'stretch', 'breathing')
    OR primary_movement_family = 'mobility' OR primary_movement_family = 'conditioning')
  AND (rep_range_min IS NOT NULL OR rep_range_max IS NOT NULL);

COMMENT ON COLUMN public.exercises.rep_range_min IS 'Exercise-specific rep floor; when set with rep_range_max, generator blends with goal for prescription (e.g. calves 15-25, isolation 10-20).';
COMMENT ON COLUMN public.exercises.rep_range_max IS 'Exercise-specific rep ceiling; when set with rep_range_min, generator blends with goal for prescription.';
