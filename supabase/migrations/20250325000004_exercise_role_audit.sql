-- Exercise role audit: set exercise_role for all exercises (ontology-aligned block placement).
-- See docs/research/exercise-role-audit.md and lib/ontology/vocabularies.ts (EXERCISE_ROLES).

-- ============== 1) Backfill exercise_role where NULL ==============
-- Order: most specific first (breathing, stretch, cooldown, prep) → conditioning → main_compound → isolation → accessory → mobility → finisher → warmup → default.

-- Breathing
UPDATE public.exercises SET exercise_role = 'breathing'
WHERE is_active = true AND (exercise_role IS NULL OR exercise_role = '')
  AND (slug LIKE '%breathing%' OR slug = 'breathing_diaphragmatic' OR slug = 'breathing_cooldown');

-- Stretch: has stretch_targets or slug indicates static stretch (before mobility so stretch wins)
UPDATE public.exercises SET exercise_role = 'stretch'
WHERE is_active = true AND (exercise_role IS NULL OR exercise_role = '')
  AND (stretch_targets IS NOT NULL AND array_length(stretch_targets, 1) > 0);

UPDATE public.exercises SET exercise_role = 'stretch'
WHERE is_active = true AND (exercise_role IS NULL OR exercise_role = '')
  AND (slug LIKE '%stretch%' OR slug IN ('childs_pose','figure_four_stretch','reclined_figure_four','seated_forward_fold','supine_twist'));

-- Cooldown (legacy): common cooldown stretches
UPDATE public.exercises SET exercise_role = 'cooldown'
WHERE is_active = true AND (exercise_role IS NULL OR exercise_role = '')
  AND slug IN ('cat_camel','cat_cow','t_spine_rotation','hip_90_90','frog_stretch','thread_the_needle','thread_needle','worlds_greatest_stretch','standing_hamstring_stretch','standing_quad_stretch','calf_stretch_wall','hip_flexor_stretch','chest_stretch_doorway','pec_stretch_wall','lat_stretch_kneeling','triceps_stretch_overhead','shoulder_cross_body_stretch');

-- Prep: activation-style (glute bridge hold, dead bug prep, bird dog prep, hip circles, band pull-apart, scapular slides, etc.)
UPDATE public.exercises SET exercise_role = 'prep'
WHERE is_active = true AND (exercise_role IS NULL OR exercise_role = '')
  AND slug IN ('glute_bridge_hold','dead_bug_prep','bird_dog_prep','hip_circles','band_pull_apart','band_pullapart','scapular_slides','band_shoulder_dislocation','lateral_lunge_shift','open_books','quadruped_rock','prone_extension','wall_slide','arm_circles','leg_swings_front','leg_swings_side','ankle_circles','wrist_circles');

-- Conditioning
UPDATE public.exercises SET exercise_role = 'conditioning'
WHERE is_active = true AND (exercise_role IS NULL OR exercise_role = '')
  AND (primary_movement_family = 'conditioning' OR (modalities && ARRAY['conditioning'] AND movement_pattern = 'locomotion'));

-- Mobility: modalities mobility/recovery (not already stretch/cooldown/prep)
UPDATE public.exercises SET exercise_role = 'mobility'
WHERE is_active = true AND (exercise_role IS NULL OR exercise_role = '')
  AND (modalities && ARRAY['mobility','recovery']);

-- Main compound: primary compound lifts (multi-joint, anchor exercises)
UPDATE public.exercises SET exercise_role = 'main_compound'
WHERE is_active = true AND (exercise_role IS NULL OR exercise_role = '')
  AND slug IN (
    'barbell_back_squat','front_squat','barbell_deadlift','barbell_rdl','trap_bar_deadlift','bench_press_barbell','oh_press','pullup','chinup','lat_pulldown','barbell_row','incline_bench_barbell','hip_thrust','goblet_squat','rdl_dumbbell','db_bench','db_row','cable_row','push_up','dips',
    'incline_db_press','decline_bench','bulgarian_split_squat','split_squat','leg_press_machine','good_morning','back_extension','single_leg_rdl','kb_swing','glute_bridge','t_bar_row','pendlay_row','yates_row','inverted_row','inverted_row_feet_elevated','trx_row','weighted_pull_up','neutral_pull_up'
  );

-- Isolation: single-joint
UPDATE public.exercises SET exercise_role = 'isolation'
WHERE is_active = true AND (exercise_role IS NULL OR exercise_role = '')
  AND slug IN (
    'db_fly','cable_fly','pec_deck','cable_crossover','incline_cable_fly',
    'leg_extension','leg_curl','lateral_raise','front_raise','tricep_pushdown','overhead_tricep_extension','cable_tricep_extension','db_tricep_kickback','skull_crusher','lying_tricep_extension',
    'barbell_curl','db_curl','hammer_curl','preacher_curl','concentration_curl','spider_curl','cable_curl','reverse_curl',
    'calf_raise','seated_calf_raise','hip_abduction','hip_adduction','wrist_curl','reverse_fly','prone_y_raise'
  );

-- Accessory: secondary compounds, rows, split squats, step-up, etc.
UPDATE public.exercises SET exercise_role = 'accessory'
WHERE is_active = true AND (exercise_role IS NULL OR exercise_role = '')
  AND (
    slug LIKE '%row%' OR slug LIKE '%curl%' OR slug LIKE '%extension%' OR slug LIKE '%raise%' OR slug LIKE '%fly%'
    OR slug IN ('stepup','walking_lunge','step_back_lunge','lateral_lunge','goblet_split_squat','hack_squat','box_squat','pause_squat','safety_bar_squat','pistol_squat','shrimp_squat','deficit_deadlift','snatch_grip_deadlift','back_extension_45','nordic_curl','single_leg_hip_thrust','stability_ball_hamstring_curl','dumbbell_floor_press','landmine_press_one_arm','bottoms_up_kb_press','seated_dumbbell_ohp','half_kneeling_landmine_press','trx_chest_press','dip_assisted','tricep_dip_bench','close_grip_push_up','australian_pull_up','ring_pull_up','wide_grip_pulldown','underhand_pulldown','pull_down_straight_arm','inverted_row','chest_supported_row','seal_row','landmine_row','renegade_row','db_shrug','cable_shrug','close_grip_bench','floor_press','pin_press','pallof_hold','dead_bug','bird_dog','ab_wheel','hanging_leg_raise','russian_twist','suitcase_carry','waiters_carry')
  );

-- Finisher: core finisher, burnout
UPDATE public.exercises SET exercise_role = 'finisher'
WHERE is_active = true AND (exercise_role IS NULL OR exercise_role = '')
  AND slug IN ('plank','side_plank','hollow_hold','arch_hold','reverse_plank','plank_to_push_up','dead_bug_weighted','stability_ball_rollout');

-- Warmup-only: light cardio / activation only
UPDATE public.exercises SET exercise_role = 'warmup'
WHERE is_active = true AND (exercise_role IS NULL OR exercise_role = '')
  AND slug IN ('jump_rope');

-- Mobility (remaining from modalities mobility/recovery that weren’t set to prep/stretch/cooldown)
UPDATE public.exercises SET exercise_role = 'mobility'
WHERE is_active = true AND (exercise_role IS NULL OR exercise_role = '')
  AND (primary_movement_family = 'mobility' OR modalities && ARRAY['mobility','recovery']);

-- Default: main_compound for remaining strength-style (squat, hinge, push, pull with 2+ muscles)
UPDATE public.exercises SET exercise_role = 'main_compound'
WHERE is_active = true AND (exercise_role IS NULL OR exercise_role = '')
  AND movement_pattern IN ('squat','hinge','push','pull')
  AND array_length(primary_muscles, 1) >= 2;

-- Default: accessory for remaining push/pull
UPDATE public.exercises SET exercise_role = 'accessory'
WHERE is_active = true AND (exercise_role IS NULL OR exercise_role = '')
  AND movement_pattern IN ('push','pull');

-- Default: lower body remaining
UPDATE public.exercises SET exercise_role = 'accessory'
WHERE is_active = true AND (exercise_role IS NULL OR exercise_role = '')
  AND movement_pattern IN ('squat','hinge','locomotion')
  AND primary_movement_family = 'lower_body';

-- Core-only remaining → finisher or accessory
UPDATE public.exercises SET exercise_role = 'finisher'
WHERE is_active = true AND (exercise_role IS NULL OR exercise_role = '')
  AND primary_movement_family = 'core';

-- Carry → accessory
UPDATE public.exercises SET exercise_role = 'accessory'
WHERE is_active = true AND (exercise_role IS NULL OR exercise_role = '')
  AND movement_pattern = 'carry';

-- Final default
UPDATE public.exercises SET exercise_role = 'main_compound'
WHERE is_active = true AND (exercise_role IS NULL OR exercise_role = '');

-- ============== 2) Normalize invalid exercise_role to allowed slug ==============
-- Allowed: warmup, prep, main_compound, accessory, isolation, finisher, cooldown, stretch, mobility, breathing, conditioning
UPDATE public.exercises SET exercise_role = CASE
  WHEN exercise_role NOT IN ('warmup','prep','main_compound','accessory','isolation','finisher','cooldown','stretch','mobility','breathing','conditioning') THEN
    CASE
      WHEN modalities && ARRAY['mobility','recovery'] THEN 'mobility'
      WHEN modalities && ARRAY['conditioning'] AND (movement_pattern = 'locomotion' OR primary_movement_family = 'conditioning') THEN 'conditioning'
      WHEN stretch_targets IS NOT NULL AND array_length(stretch_targets, 1) > 0 THEN 'stretch'
      WHEN movement_pattern IN ('squat','hinge','push','pull') AND array_length(primary_muscles, 1) >= 2 THEN 'main_compound'
      WHEN movement_pattern IN ('push','pull') THEN 'accessory'
      ELSE 'main_compound'
    END
  ELSE exercise_role
END
WHERE is_active = true
  AND exercise_role IS NOT NULL
  AND exercise_role != ''
  AND exercise_role NOT IN ('warmup','prep','main_compound','accessory','isolation','finisher','cooldown','stretch','mobility','breathing','conditioning');
