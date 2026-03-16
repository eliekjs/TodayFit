-- Primary/secondary muscles: ExRx-style canonical slugs. Replace 'push'/'pull' with actual muscles; apply overrides.
-- See docs/research/exercise-muscles-exrx-canonical-audit.md.

-- ============== 1) Bulk: replace 'push' with chest, triceps, shoulders ==============
UPDATE public.exercises
SET primary_muscles = (
  SELECT ARRAY(SELECT DISTINCT unnest(
    (array_remove(primary_muscles, 'push') || ARRAY['chest','triceps','shoulders'])
  ))
)
WHERE 'push' = ANY(primary_muscles);

UPDATE public.exercises
SET secondary_muscles = (
  SELECT ARRAY(SELECT DISTINCT unnest(
    (COALESCE(array_remove(secondary_muscles, 'push'), '{}') || ARRAY['chest','triceps','shoulders'])
  ))
)
WHERE secondary_muscles IS NOT NULL AND 'push' = ANY(secondary_muscles);

-- ============== 2) Bulk: replace 'pull' with lats, biceps, upper_back ==============
UPDATE public.exercises
SET primary_muscles = (
  SELECT ARRAY(SELECT DISTINCT unnest(
    (array_remove(primary_muscles, 'pull') || ARRAY['lats','biceps','upper_back'])
  ))
)
WHERE 'pull' = ANY(primary_muscles);

UPDATE public.exercises
SET secondary_muscles = (
  SELECT ARRAY(SELECT DISTINCT unnest(
    (COALESCE(array_remove(secondary_muscles, 'pull'), '{}') || ARRAY['lats','biceps','upper_back'])
  ))
)
WHERE secondary_muscles IS NOT NULL AND 'pull' = ANY(secondary_muscles);

-- ============== 3) ExRx-style overrides: primary vs secondary by exercise ==============

-- Horizontal push: chest primary; triceps, shoulders secondary
UPDATE public.exercises SET primary_muscles = ARRAY['chest'], secondary_muscles = ARRAY['triceps','shoulders']
WHERE slug IN ('bench_press_barbell','db_bench','incline_db_press','decline_bench','push_up','close_grip_push_up','diamond_push_up','decline_push_up','chest_press_machine','floor_press','dumbbell_floor_press','pin_press','trx_chest_press','band_chest_press');

UPDATE public.exercises SET primary_muscles = ARRAY['chest'], secondary_muscles = ARRAY['triceps','shoulders']
WHERE slug IN ('cable_crossover','incline_cable_fly','db_fly','cable_fly','pec_deck');

-- Dips: chest/shoulders/triceps
UPDATE public.exercises SET primary_muscles = ARRAY['chest','triceps'], secondary_muscles = ARRAY['shoulders']
WHERE slug IN ('dips','dip_assisted','tricep_dip_bench');

-- Vertical push: shoulders primary; triceps, core secondary
UPDATE public.exercises SET primary_muscles = ARRAY['shoulders'], secondary_muscles = ARRAY['triceps','core']
WHERE slug IN ('oh_press','db_shoulder_press','seated_dumbbell_ohp','arnold_press','seated_ohp','z_press','push_press','pike_push_up','bottoms_up_kb_press','band_ohp','overhead_carry');

UPDATE public.exercises SET primary_muscles = ARRAY['shoulders'], secondary_muscles = ARRAY['triceps','core']
WHERE slug IN ('landmine_press_one_arm','half_kneeling_landmine_press','kneeling_landmine_press','bottoms_up_press');

-- Tricep isolation: triceps primary
UPDATE public.exercises SET primary_muscles = ARRAY['triceps'], secondary_muscles = ARRAY[]::text[]
WHERE slug IN ('tricep_pushdown','overhead_tricep_extension','cable_tricep_extension','db_tricep_kickback','skull_crusher','lying_tricep_extension');

-- Close-grip bench: triceps emphasis, chest secondary
UPDATE public.exercises SET primary_muscles = ARRAY['triceps','chest'], secondary_muscles = ARRAY['shoulders']
WHERE slug = 'close_grip_bench';

-- Lateral/front raise: shoulders primary
UPDATE public.exercises SET primary_muscles = ARRAY['shoulders'], secondary_muscles = ARRAY[]::text[]
WHERE slug IN ('lateral_raise','front_raise','cuban_press','wall_slide');

-- Vertical pull: lats primary; biceps, upper_back secondary
UPDATE public.exercises SET primary_muscles = ARRAY['lats'], secondary_muscles = ARRAY['biceps','upper_back']
WHERE slug IN ('pullup','chinup','lat_pulldown','pull_down_straight_arm','reverse_grip_pulldown','wide_grip_pulldown','underhand_pulldown','lat_pulldown_single_arm','ring_pull_up','weighted_pull_up','neutral_pull_up','australian_pull_up','pull_up_commando');

-- Horizontal pull / rows: upper_back, lats primary; biceps, core secondary
UPDATE public.exercises SET primary_muscles = ARRAY['upper_back','lats'], secondary_muscles = ARRAY['biceps','core']
WHERE slug IN ('cable_row','barbell_row','db_row','trx_row','pendlay_row','yates_row','t_bar_row','inverted_row','inverted_row_feet_elevated','ring_row','chest_supported_row','seal_row','cable_row_wide','landmine_row','renegade_row');

-- Face pull / band pull-apart: upper_back, shoulders (rear delt)
UPDATE public.exercises SET primary_muscles = ARRAY['upper_back','shoulders'], secondary_muscles = ARRAY[]::text[]
WHERE slug IN ('face_pull','face_pull_band','band_pullapart','band_pull_apart','reverse_fly','reverse_pec_deck','prone_y_raise','ytw');

-- Shrug: upper_back (traps)
UPDATE public.exercises SET primary_muscles = ARRAY['upper_back'], secondary_muscles = ARRAY[]::text[]
WHERE slug IN ('shrug','db_shrug','cable_shrug');

-- Bicep isolation: biceps primary (forearms optional)
UPDATE public.exercises SET primary_muscles = ARRAY['biceps'], secondary_muscles = ARRAY['forearms']
WHERE slug IN ('barbell_curl','db_curl','hammer_curl','preacher_curl','concentration_curl','spider_curl','cable_curl');

UPDATE public.exercises SET primary_muscles = ARRAY['biceps'], secondary_muscles = ARRAY[]::text[]
WHERE slug IN ('reverse_curl');

-- Wrist: forearms
UPDATE public.exercises SET primary_muscles = ARRAY['forearms'], secondary_muscles = ARRAY[]::text[]
WHERE slug IN ('wrist_curl');

-- Upright row: shoulders + upper_back
UPDATE public.exercises SET primary_muscles = ARRAY['shoulders','upper_back'], secondary_muscles = ARRAY['biceps']
WHERE slug = 'upright_row';

-- Squat pattern: quads, glutes primary; hamstrings, core secondary
UPDATE public.exercises SET primary_muscles = ARRAY['quads','glutes'], secondary_muscles = ARRAY['hamstrings','core']
WHERE slug IN ('barbell_back_squat','front_squat','goblet_squat','box_squat','pause_squat','leg_press_machine','hack_squat','safety_bar_squat','heels_elevated_squat','pause_front_squat');

UPDATE public.exercises SET primary_muscles = ARRAY['quads','glutes'], secondary_muscles = ARRAY['hamstrings','core']
WHERE slug IN ('split_squat','bulgarian_split_squat','stepup','walking_lunge','goblet_split_squat','front_rack_lunge','lateral_step_up','lateral_lunge_shift');

UPDATE public.exercises SET primary_muscles = ARRAY['quads'], secondary_muscles = ARRAY['glutes']
WHERE slug IN ('leg_extension');

-- Hinge: glutes, hamstrings primary; quads, core, upper_back secondary
UPDATE public.exercises SET primary_muscles = ARRAY['glutes','hamstrings'], secondary_muscles = ARRAY['quads','core','upper_back']
WHERE slug IN ('barbell_deadlift','barbell_rdl','trap_bar_deadlift','rdl_dumbbell','good_morning','deficit_deadlift','snatch_grip_deadlift','rack_pull');

UPDATE public.exercises SET primary_muscles = ARRAY['glutes','hamstrings'], secondary_muscles = ARRAY['core']
WHERE slug IN ('hip_thrust','glute_bridge','single_leg_hip_thrust','back_extension','back_extension_45','back_extension_reverse_hyper','single_leg_rdl','kb_swing','kb_deadlift','kb_sumo_deadlift');

UPDATE public.exercises SET primary_muscles = ARRAY['hamstrings'], secondary_muscles = ARRAY['glutes']
WHERE slug IN ('leg_curl','nordic_curl','stability_ball_hamstring_curl');

-- Calves
UPDATE public.exercises SET primary_muscles = ARRAY['calves'], secondary_muscles = ARRAY[]::text[]
WHERE slug IN ('calf_raise','seated_calf_raise');

-- Hip abduction/adduction: glutes / adductors (we use legs for simplicity or add later)
UPDATE public.exercises SET primary_muscles = ARRAY['glutes'], secondary_muscles = ARRAY[]::text[]
WHERE slug = 'hip_abduction';

UPDATE public.exercises SET primary_muscles = ARRAY['legs'], secondary_muscles = ARRAY[]::text[]
WHERE slug = 'hip_adduction';

-- Belt squat, v-squat, pistol, shrimp: quads/glutes
UPDATE public.exercises SET primary_muscles = ARRAY['quads','glutes'], secondary_muscles = ARRAY['hamstrings','core']
WHERE slug IN ('belt_squat','v_squat','pistol_squat','shrimp_squat');

-- Carry: core primary; legs/shoulders as secondary by variant
UPDATE public.exercises SET primary_muscles = ARRAY['core'], secondary_muscles = ARRAY['legs']
WHERE slug IN ('farmer_carry','suitcase_carry');

UPDATE public.exercises SET primary_muscles = ARRAY['core','shoulders'], secondary_muscles = ARRAY[]::text[]
WHERE slug = 'waiters_carry';

-- Clean/snatch/high pull: full body — keep legs, lats, core; add shoulders for press component where relevant
UPDATE public.exercises SET primary_muscles = ARRAY['legs','upper_back','core'], secondary_muscles = ARRAY['shoulders']
WHERE slug IN ('squat_clean','hang_clean','snatch_grip_high_pull','kb_clean','clean_and_press');

UPDATE public.exercises SET primary_muscles = ARRAY['legs','shoulders','core'], secondary_muscles = ARRAY['lats']
WHERE slug IN ('db_snatch','thruster');

-- Rower / ski erg / assault bike: conditioning — keep legs, core; rower/ski add back/lats
UPDATE public.exercises SET primary_muscles = ARRAY['legs','core'], secondary_muscles = ARRAY['lats','upper_back']
WHERE slug IN ('rower','ski_erg','assault_bike');

-- Ab wheel, plank, dead bug, pallof, etc.: core
UPDATE public.exercises SET primary_muscles = ARRAY['core'], secondary_muscles = ARRAY[]::text[]
WHERE slug IN ('ab_wheel','plank','dead_bug','bird_dog','russian_twist','hanging_leg_raise','pallof_hold','dead_bug_weighted','reverse_plank','stability_ball_rollout','plank_to_push_up');

UPDATE public.exercises SET primary_muscles = ARRAY['core'], secondary_muscles = ARRAY['legs']
WHERE slug = 'toes_to_bar';

UPDATE public.exercises SET primary_muscles = ARRAY['core','shoulders'], secondary_muscles = ARRAY[]::text[]
WHERE slug = 'l_sit';
