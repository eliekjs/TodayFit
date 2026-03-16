-- Exercise role: enrich and normalize (NSCA/ACSM session structure).
-- See docs/research/exercise-role-audit-2025.md and lib/ontology/vocabularies.ts (EXERCISE_ROLES).

-- ============== 1) Power / Olympic derivatives: main_compound when used as primary work ==============
UPDATE public.exercises
SET exercise_role = 'main_compound'
WHERE slug IN (
  'thruster','squat_clean','hang_clean','power_snatch','push_press','push_jerk','split_jerk','squat_jerk',
  'clean_and_press','kb_clean','db_snatch','snatch_grip_high_pull'
)
  AND is_active = true;

-- ============== 2) Conditioning: ensure ergs and cardio have role conditioning ==============
UPDATE public.exercises
SET exercise_role = 'conditioning'
WHERE slug IN (
  'rower','rower_steady','rower_intervals_30_30','row_calorie_burn',
  'assault_bike','assault_bike_steady','zone2_bike','zone2_treadmill','zone2_rower','zone2_stair_climber',
  'ski_erg','ski_erg_intervals','ski_erg_steady',
  'treadmill_run','treadmill_intervals','incline_treadmill_walk','stair_climber_steady','elliptical_steady',
  'sled_drag','battle_rope_waves','battle_ropes','jump_squat_light','burpee_box_jump','devils_press',
  'double_unders','air_bike_sprint','jump_rope','burpee','mountain_climber','bear_crawl','rower_intervals'
)
  AND is_active = true
  AND (exercise_role IS NULL OR exercise_role NOT IN ('conditioning'));

-- ============== 3) Prep: activation / movement prep (not already set) ==============
UPDATE public.exercises
SET exercise_role = 'prep'
WHERE is_active = true
  AND (exercise_role IS NULL OR exercise_role = '')
  AND slug IN (
    'ytw','cuban_press','banded_walk','windmill','inchworm',
    'worlds_greatest_stretch','quadruped_rockback','open_books','thread_the_needle','hip_90_90','frog_stretch'
  );

-- ============== 4) Accessory (not isolation): face pull, band work, renegade row ==============
-- Face pull, seal row, renegade row: multi-joint / scapular, accessory
UPDATE public.exercises
SET exercise_role = 'accessory'
WHERE slug IN ('face_pull','face_pull_band','band_pullapart','band_pull_apart','seal_row','renegade_row','inverted_row','ring_row')
  AND is_active = true
  AND (exercise_role IS NULL OR exercise_role = '' OR exercise_role = 'isolation');

-- ============== 5) Finisher: core finishers ==============
UPDATE public.exercises
SET exercise_role = 'finisher'
WHERE slug IN ('plank','side_plank','hollow_hold','arch_hold','dead_bug_weighted','stability_ball_rollout','plank_to_push_up','reverse_plank')
  AND is_active = true;

-- ============== 6) Normalize invalid exercise_role to allowed slug ==============
UPDATE public.exercises SET exercise_role = CASE
  WHEN exercise_role NOT IN ('warmup','prep','main_compound','accessory','isolation','finisher','cooldown','stretch','mobility','breathing','conditioning') THEN
    CASE
      WHEN modalities && ARRAY['mobility','recovery'] THEN 'mobility'
      WHEN modalities && ARRAY['conditioning'] OR primary_movement_family = 'conditioning' THEN 'conditioning'
      WHEN stretch_targets IS NOT NULL AND array_length(stretch_targets, 1) > 0 THEN 'stretch'
      WHEN movement_pattern IN ('squat','hinge','push','pull') AND array_length(primary_muscles, 1) >= 2 THEN 'main_compound'
      WHEN movement_pattern IN ('push','pull') THEN 'accessory'
      WHEN movement_pattern IN ('squat','hinge','locomotion') THEN 'accessory'
      ELSE 'main_compound'
    END
  ELSE exercise_role
END
WHERE is_active = true
  AND exercise_role IS NOT NULL
  AND exercise_role != ''
  AND exercise_role NOT IN ('warmup','prep','main_compound','accessory','isolation','finisher','cooldown','stretch','mobility','breathing','conditioning');
