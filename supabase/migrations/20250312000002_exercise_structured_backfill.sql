-- Backfill exercise structured columns from existing data and research-backed defaults.
-- primary_movement_family, joint_stress_tags, contraindication_tags, exercise_role, pairing_category, etc.

-- 1) primary_movement_family from movement_pattern + primary_muscles + modalities
UPDATE public.exercises e
SET primary_movement_family = CASE
  WHEN 'mobility' = ANY(e.modalities) OR 'recovery' = ANY(e.modalities) THEN 'mobility'
  WHEN 'conditioning' = ANY(e.modalities) AND e.movement_pattern = 'locomotion' THEN 'conditioning'
  WHEN e.movement_pattern = 'push' AND (e.primary_muscles @> ARRAY['push'] OR e.primary_muscles && ARRAY['chest','triceps','shoulders']) THEN 'upper_push'
  WHEN e.movement_pattern = 'pull' AND (e.primary_muscles @> ARRAY['pull'] OR e.primary_muscles && ARRAY['back','biceps','lats']) THEN 'upper_pull'
  WHEN e.movement_pattern IN ('squat','hinge','locomotion') AND (e.primary_muscles && ARRAY['legs','quads','glutes','hamstrings']) THEN 'lower_body'
  WHEN e.movement_pattern IN ('squat','hinge','locomotion') AND e.primary_muscles @> ARRAY['core'] AND NOT (e.primary_muscles && ARRAY['legs','quads','glutes','hamstrings']) THEN 'core'
  WHEN e.movement_pattern = 'carry' AND e.primary_muscles && ARRAY['core'] THEN 'core'
  WHEN e.movement_pattern = 'rotate' OR e.primary_muscles @> ARRAY['core'] THEN 'core'
  WHEN e.movement_pattern IN ('squat','hinge') THEN 'lower_body'
  WHEN e.movement_pattern = 'push' THEN 'upper_push'
  WHEN e.movement_pattern = 'pull' THEN 'upper_pull'
  ELSE 'lower_body'
END
WHERE e.is_active = true;

-- 2) movement_patterns (finer detail)
UPDATE public.exercises SET movement_patterns = array_append(COALESCE(movement_patterns, '{}'), 'horizontal_push')
WHERE movement_pattern = 'push' AND (slug LIKE '%bench%' OR slug LIKE '%press%' OR slug LIKE '%push_up%' OR slug LIKE '%fly%' OR slug IN ('floor_press','pin_press','chest_press_machine','pec_deck','db_bench','incline_db_press','decline_bench','incline_bench_barbell','close_grip_bench','diamond_push_up','decline_push_up','close_grip_push_up'));

UPDATE public.exercises SET movement_patterns = array_append(COALESCE(movement_patterns, '{}'), 'vertical_push')
WHERE movement_pattern = 'push' AND (slug LIKE '%ohp%' OR slug LIKE '%overhead%' OR slug LIKE '%shoulder_press%' OR slug IN ('oh_press','db_shoulder_press','arnold_press','lateral_raise','front_raise','pike_push_up','seated_ohp','z_press','push_press','push_jerk','split_jerk','squat_jerk','bottoms_up_press','cuban_press','kneeling_landmine_press'));

UPDATE public.exercises SET movement_patterns = array_append(COALESCE(movement_patterns, '{}'), 'horizontal_pull')
WHERE movement_pattern = 'pull' AND (slug LIKE '%row%' OR slug IN ('barbell_row','cable_row','db_row','trx_row','landmine_row','seal_row','chest_supported_row','cable_row_wide','reverse_fly','face_pull','face_pull_band','inverted_row','ring_row','renegade_row'));

UPDATE public.exercises SET movement_patterns = array_append(COALESCE(movement_patterns, '{}'), 'vertical_pull')
WHERE movement_pattern = 'pull' AND (slug IN ('pullup','chinup','lat_pulldown','pull_down_straight_arm','reverse_grip_pulldown','lat_pulldown_single_arm','pull_up_commando','toes_to_bar'));

UPDATE public.exercises SET movement_patterns = array_append(COALESCE(movement_patterns, '{}'), 'lunge')
WHERE movement_pattern IN ('squat','locomotion') AND (slug LIKE '%lunge%' OR slug LIKE '%split%' OR slug IN ('stepup','step_back_lunge','deficit_reverse_lunge','lateral_lunge','goblet_lateral_lunge','curtsy_lunge','jump_lunge'));

-- 3) joint_stress_tags (match INJURY_AVOID_TAGS; critical for injury filtering). Dedupe with array_agg(DISTINCT).
UPDATE public.exercises e SET joint_stress_tags = (SELECT array_agg(DISTINCT u) FROM unnest(array_cat(COALESCE(e.joint_stress_tags, '{}'), ARRAY['shoulder_overhead'])) u)
WHERE e.slug IN ('oh_press','db_shoulder_press','arnold_press','seated_ohp','z_press','push_press','push_jerk','split_jerk','squat_jerk','pike_push_up','overhead_carry','bottoms_up_press');

UPDATE public.exercises e SET joint_stress_tags = (SELECT array_agg(DISTINCT u) FROM unnest(array_cat(COALESCE(e.joint_stress_tags, '{}'), ARRAY['shoulder_extension','grip_hanging'])) u)
WHERE e.slug IN ('pullup','chinup','dips','toes_to_bar','hanging_leg_raise','l_sit');

UPDATE public.exercises e SET joint_stress_tags = (SELECT array_agg(DISTINCT u) FROM unnest(array_cat(COALESCE(e.joint_stress_tags, '{}'), ARRAY['knee_flexion'])) u)
WHERE e.slug IN ('barbell_back_squat','front_squat','split_squat','bulgarian_split_squat','stepup','leg_extension','leg_press_machine','hack_squat','sissy_squat','jump_squat','lateral_lunge','goblet_lateral_lunge','curtsy_lunge','step_back_lunge','deficit_reverse_lunge','wall_sit','lateral_box_step');

UPDATE public.exercises e SET joint_stress_tags = (SELECT array_agg(DISTINCT u) FROM unnest(array_cat(COALESCE(e.joint_stress_tags, '{}'), ARRAY['deep_knee_flexion'])) u)
WHERE e.slug IN ('barbell_back_squat','front_squat','split_squat','bulgarian_split_squat','sissy_squat','cossack_squat','jump_squat');

UPDATE public.exercises e SET joint_stress_tags = (SELECT array_agg(DISTINCT u) FROM unnest(array_cat(COALESCE(e.joint_stress_tags, '{}'), ARRAY['lumbar_shear','spinal_axial_load'])) u)
WHERE e.slug IN ('barbell_deadlift','barbell_rdl','barbell_back_squat','good_morning','rack_pull','sumo_deadlift','stiff_leg_deadlift','zercher_squat');

UPDATE public.exercises e SET joint_stress_tags = (SELECT array_agg(DISTINCT u) FROM unnest(array_cat(COALESCE(e.joint_stress_tags, '{}'), ARRAY['lumbar_shear'])) u)
WHERE e.slug IN ('rdl_dumbbell','kb_swing','hip_thrust','back_extension','reverse_hyper','ghr','single_leg_rdl');

UPDATE public.exercises e SET joint_stress_tags = (SELECT array_agg(DISTINCT u) FROM unnest(array_cat(COALESCE(e.joint_stress_tags, '{}'), ARRAY['elbow_stress'])) u)
WHERE e.slug IN ('skull_crusher','overhead_tricep_extension','lying_tricep_extension','close_grip_bench','preacher_curl','reverse_curl');

UPDATE public.exercises e SET joint_stress_tags = (SELECT array_agg(DISTINCT u) FROM unnest(array_cat(COALESCE(e.joint_stress_tags, '{}'), ARRAY['wrist_stress'])) u)
WHERE e.slug IN ('barbell_curl','wrist_curl','bench_press_barbell','push_up','dips');

UPDATE public.exercises e SET joint_stress_tags = (SELECT array_agg(DISTINCT u) FROM unnest(array_cat(COALESCE(e.joint_stress_tags, '{}'), ARRAY['shoulder_extension'])) u)
WHERE e.slug IN ('bench_press_barbell','db_bench','incline_db_press','decline_bench','dips','push_up','cable_fly','db_fly');

-- 4) contraindication_tags from exercise_contraindications
UPDATE public.exercises e
SET contraindication_tags = (
  SELECT COALESCE(array_agg(DISTINCT c.contraindication), '{}')
  FROM public.exercise_contraindications c
  WHERE c.exercise_id = e.id
)
WHERE e.is_active = true AND EXISTS (SELECT 1 FROM public.exercise_contraindications c WHERE c.exercise_id = e.id);

-- 5) exercise_role
UPDATE public.exercises SET exercise_role = 'mobility'
WHERE modalities && ARRAY['mobility','recovery'] OR slug IN ('cat_camel','t_spine_rotation','worlds_greatest_stretch','hip_90_90','frog_stretch','thread_the_needle','quadruped_rockback','breathing_diaphragmatic','inchworm','ytw','face_pull_band','cuban_press','wall_slide','banded_walk','windmill');

UPDATE public.exercises SET exercise_role = 'conditioning'
WHERE modalities @> ARRAY['conditioning'] AND movement_pattern = 'locomotion' AND exercise_role IS NULL;

UPDATE public.exercises SET exercise_role = 'main_compound'
WHERE movement_pattern IN ('squat','hinge','push','pull') AND array_length(primary_muscles, 1) >= 2
  AND slug IN ('barbell_back_squat','front_squat','barbell_deadlift','barbell_rdl','trap_bar_deadlift','bench_press_barbell','oh_press','pullup','lat_pulldown','barbell_row','incline_bench_barbell','hip_thrust','goblet_squat','rdl_dumbbell','db_bench','db_row','cable_row','push_up','dips')
  AND exercise_role IS NULL;

UPDATE public.exercises SET exercise_role = 'accessory'
WHERE (movement_pattern IN ('push','pull') AND primary_muscles && ARRAY['triceps','biceps','chest','back'])
   OR slug LIKE '%curl%' OR slug LIKE '%extension%' OR slug LIKE '%raise%' OR slug LIKE '%fly%'
   OR slug IN ('tricep_pushdown','skull_crusher','lateral_raise','front_raise','reverse_fly','leg_curl','leg_extension','calf_raise','hip_abduction','hip_adduction')
   AND exercise_role IS NULL;

UPDATE public.exercises SET exercise_role = 'isolation'
WHERE slug IN ('db_fly','cable_fly','pec_deck','leg_extension','leg_curl','lateral_raise','front_raise','tricep_pushdown','overhead_tricep_extension','barbell_curl','db_curl','hammer_curl','preacher_curl','concentration_curl','spider_curl')
   AND exercise_role IS NULL;

UPDATE public.exercises SET exercise_role = 'cooldown'
WHERE exercise_role = 'mobility' AND slug IN ('cat_camel','t_spine_rotation','hip_90_90','frog_stretch','thread_the_needle','breathing_diaphragmatic','worlds_greatest_stretch');

UPDATE public.exercises SET exercise_role = COALESCE(exercise_role, 'main_compound')
WHERE exercise_role IS NULL AND is_active = true;

-- 6) pairing_category (for superset logic)
UPDATE public.exercises SET pairing_category = 'chest'
WHERE primary_movement_family = 'upper_push' AND primary_muscles && ARRAY['chest','push'] AND (slug LIKE '%bench%' OR slug LIKE '%fly%' OR slug LIKE '%press%' AND slug NOT LIKE '%ohp%' AND slug NOT LIKE '%shoulder%');

UPDATE public.exercises SET pairing_category = 'shoulders'
WHERE primary_movement_family = 'upper_push' AND (slug LIKE '%raise%' OR slug LIKE '%ohp%' OR slug LIKE '%shoulder_press%' OR slug IN ('arnold_press','pike_push_up','upright_row','cuban_press'));

UPDATE public.exercises SET pairing_category = 'triceps'
WHERE primary_movement_family = 'upper_push' AND (slug LIKE '%tricep%' OR slug LIKE '%pushdown%' OR slug IN ('close_grip_bench','skull_crusher','dips','overhead_tricep_extension','lying_tricep_extension'));

UPDATE public.exercises SET pairing_category = 'back'
WHERE primary_movement_family = 'upper_pull' AND (slug LIKE '%row%' OR slug LIKE '%pulldown%' OR slug LIKE '%pull%' OR slug IN ('shrug','reverse_fly'));

UPDATE public.exercises SET pairing_category = 'biceps'
WHERE primary_movement_family = 'upper_pull' AND (slug LIKE '%curl%');

UPDATE public.exercises SET pairing_category = 'quads'
WHERE primary_movement_family = 'lower_body' AND (slug LIKE '%squat%' OR slug LIKE '%lunge%' OR slug IN ('leg_extension','leg_press_machine','hack_squat'));

UPDATE public.exercises SET pairing_category = 'posterior_chain'
WHERE primary_movement_family = 'lower_body' AND (slug LIKE '%deadlift%' OR slug LIKE '%rdl%' OR slug LIKE '%hinge%' OR slug IN ('hip_thrust','glute_bridge','back_extension','leg_curl','kb_swing','good_morning','reverse_hyper','ghr','kickback'));

UPDATE public.exercises SET pairing_category = 'core'
WHERE primary_movement_family = 'core' OR slug IN ('plank','dead_bug','pallof_hold','side_plank','hollow_hold','arch_hold','ab_wheel','russian_twist','v_up','bicycle_crunch');

UPDATE public.exercises SET pairing_category = 'mobility'
WHERE primary_movement_family = 'mobility';

UPDATE public.exercises SET pairing_category = COALESCE(pairing_category, CASE primary_movement_family
  WHEN 'upper_push' THEN 'chest'
  WHEN 'upper_pull' THEN 'back'
  WHEN 'lower_body' THEN 'quads'
  WHEN 'core' THEN 'core'
  WHEN 'mobility' THEN 'mobility'
  WHEN 'conditioning' THEN NULL
  ELSE NULL
END)
WHERE pairing_category IS NULL AND is_active = true;

-- 7) unilateral
UPDATE public.exercises SET unilateral = true
WHERE slug LIKE '%single%' OR slug LIKE '%split%' OR slug LIKE '%bulgarian%' OR slug LIKE '%one_arm%' OR slug LIKE '%single_arm%' OR slug LIKE '%single-leg%'
   OR slug IN ('db_row','split_squat','bulgarian_split_squat','single_leg_rdl','single_arm_carry','lat_pulldown_single_arm','concentration_curl','single_arm_swing','renegade_row');

-- 8) fatigue_regions (from primary_muscles; map push->pecs, pull->lats for clarity)
UPDATE public.exercises e
SET fatigue_regions = (
  SELECT COALESCE(array_agg(DISTINCT CASE m
    WHEN 'push' THEN 'pecs'
    WHEN 'pull' THEN 'lats'
    ELSE m
  END), '{}')
  FROM unnest(e.primary_muscles) m
  WHERE m IN ('quads','glutes','hamstrings','legs','chest','push','triceps','back','pull','biceps','lats','core','shoulders')
)
WHERE e.is_active = true AND array_length(e.primary_muscles, 1) > 0;

-- 9) stretch_targets / mobility_targets for mobility exercises
UPDATE public.exercises SET stretch_targets = ARRAY['thoracic_spine'], mobility_targets = ARRAY['thoracic_spine']
WHERE slug IN ('cat_camel','t_spine_rotation','thread_the_needle','quadruped_rockback','worlds_greatest_stretch');

UPDATE public.exercises SET stretch_targets = ARRAY['hip_flexors','glutes'], mobility_targets = ARRAY['hip_mobility']
WHERE slug IN ('hip_90_90','frog_stretch','cossack_squat','banded_walk','windmill');

UPDATE public.exercises SET stretch_targets = ARRAY['hamstrings']
WHERE slug IN ('inchworm','single_leg_rdl');

UPDATE public.exercises SET stretch_targets = ARRAY['shoulders'], mobility_targets = ARRAY['shoulders']
WHERE slug IN ('ytw','face_pull_band','cuban_press','wall_slide','band_pullapart','face_pull');

UPDATE public.exercises SET stretch_targets = ARRAY['lats','pecs']
WHERE slug IN ('pullup','lat_pulldown');

UPDATE public.exercises SET mobility_targets = array_cat(COALESCE(mobility_targets, '{}'), ARRAY['thoracic_spine'])
WHERE slug IN ('breathing_diaphragmatic');

-- 10) secondary_movement_families for combined exercises
UPDATE public.exercises SET secondary_movement_families = ARRAY['lower_body']
WHERE slug IN ('thruster','push_press','clean_and_press','db_snatch','squat_clean','hang_clean','power_snatch','push_jerk','split_jerk','squat_jerk');

UPDATE public.exercises SET secondary_movement_families = ARRAY['upper_push']
WHERE slug = 'thruster';
