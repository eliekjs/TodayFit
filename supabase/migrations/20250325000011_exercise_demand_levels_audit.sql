-- Exercise demand levels audit: normalize and backfill warmup_relevance, cooldown_relevance,
-- stability_demand, grip_demand, impact_level. Allowed: none | low | medium | high.
-- See docs/research/exercise-demand-levels-audit.md and lib/ontology/vocabularies.ts (DEMAND_LEVELS).

-- ============== 1) Normalize: only canonical values (lowercase), else NULL ==============
UPDATE public.exercises SET warmup_relevance = CASE
  WHEN lower(trim(warmup_relevance)) IN ('none','low','medium','high') THEN lower(trim(warmup_relevance))
  ELSE NULL END
WHERE warmup_relevance IS NOT NULL;

UPDATE public.exercises SET cooldown_relevance = CASE
  WHEN lower(trim(cooldown_relevance)) IN ('none','low','medium','high') THEN lower(trim(cooldown_relevance))
  ELSE NULL END
WHERE cooldown_relevance IS NOT NULL;

UPDATE public.exercises SET stability_demand = CASE
  WHEN lower(trim(stability_demand)) IN ('none','low','medium','high') THEN lower(trim(stability_demand))
  ELSE NULL END
WHERE stability_demand IS NOT NULL;

UPDATE public.exercises SET grip_demand = CASE
  WHEN lower(trim(grip_demand)) IN ('none','low','medium','high') THEN lower(trim(grip_demand))
  ELSE NULL END
WHERE grip_demand IS NOT NULL;

UPDATE public.exercises SET impact_level = CASE
  WHEN lower(trim(impact_level)) IN ('none','low','medium','high') THEN lower(trim(impact_level))
  ELSE NULL END
WHERE impact_level IS NOT NULL;

-- ============== 2) Backfill: warmup_relevance ==============
UPDATE public.exercises SET warmup_relevance = 'high'
WHERE is_active = true AND (warmup_relevance IS NULL OR warmup_relevance = '')
  AND slug IN (
    'cat_camel', 'cat_cow', 't_spine_rotation', 'worlds_greatest_stretch', 'hip_90_90', 'frog_stretch', 'thread_the_needle', 'thread_needle',
    'quadruped_rockback', 'inchworm', 'ytw', 'face_pull_band', 'cuban_press', 'wall_slide', 'banded_walk', 'windmill',
    'band_pullapart', 'band_pull_apart', 'breathing_diaphragmatic', 'dead_bug', 'bird_dog', 'glute_bridge_hold', 'hip_circles', 'scapular_slides'
  );

UPDATE public.exercises SET warmup_relevance = 'medium'
WHERE is_active = true AND (warmup_relevance IS NULL OR warmup_relevance = '')
  AND (exercise_role IN ('mobility', 'prep') OR modalities && ARRAY['mobility','recovery']);

UPDATE public.exercises SET warmup_relevance = 'low'
WHERE is_active = true AND (warmup_relevance IS NULL OR warmup_relevance = '')
  AND exercise_role IN ('cooldown', 'stretch');

-- ============== 3) Backfill: cooldown_relevance ==============
UPDATE public.exercises SET cooldown_relevance = 'high'
WHERE is_active = true AND (cooldown_relevance IS NULL OR cooldown_relevance = '')
  AND (stretch_targets IS NOT NULL AND array_length(stretch_targets, 1) > 0);

UPDATE public.exercises SET cooldown_relevance = 'high'
WHERE is_active = true AND (cooldown_relevance IS NULL OR cooldown_relevance = '')
  AND slug IN (
    'standing_hamstring_stretch', 'figure_four_stretch', 'standing_quad_stretch', 'calf_stretch_wall',
    'hip_flexor_stretch', 'chest_stretch_doorway', 'pec_stretch_wall', 'lat_stretch_kneeling', 'childs_pose',
    'cat_camel', 'cat_cow', 't_spine_rotation', 'hip_90_90', 'frog_stretch', 'thread_the_needle', 'thread_needle',
    'worlds_greatest_stretch', 'breathing_diaphragmatic', 'supine_twist', 'reclined_figure_four', 'seated_forward_fold'
  );

UPDATE public.exercises SET cooldown_relevance = 'medium'
WHERE is_active = true AND (cooldown_relevance IS NULL OR cooldown_relevance = '')
  AND exercise_role IN ('mobility', 'cooldown', 'stretch');

-- ============== 4) Backfill: stability_demand ==============
UPDATE public.exercises SET stability_demand = 'high'
WHERE is_active = true AND (stability_demand IS NULL OR stability_demand = '')
  AND (unilateral = true AND slug IN ('pistol_squat', 'shrimp_squat', 'single_leg_rdl', 'single_leg_hip_thrust', 'bulgarian_split_squat')
    OR slug IN ('pistol_squat', 'shrimp_squat', 'single_leg_rdl', 'single_leg_hip_thrust', 'bulgarian_split_squat', 'stability_ball_hamstring_curl', 'bottoms_up_kb_press', 'bottoms_up_press'));

UPDATE public.exercises SET stability_demand = 'medium'
WHERE is_active = true AND (stability_demand IS NULL OR stability_demand = '')
  AND (unilateral = true OR slug LIKE '%single_arm%' OR slug LIKE '%one_arm%' OR slug IN ('db_row', 'renegade_row', 'suitcase_carry', 'waiter_carry', 'split_squat', 'walking_lunge'));

UPDATE public.exercises SET stability_demand = 'low'
WHERE is_active = true AND (stability_demand IS NULL OR stability_demand = '')
  AND (slug IN ('leg_extension', 'leg_curl', 'leg_press_machine', 'hack_squat', 'pec_deck', 'chest_press_machine', 'lat_pulldown', 'cable_row', 'seated_calf_raise', 'hip_abduction', 'hip_adduction', 'back_extension_45')
    OR (equipment && ARRAY['machine'] AND movement_pattern IN ('squat', 'hinge', 'push', 'pull')));

-- ============== 5) Backfill: grip_demand ==============
UPDATE public.exercises SET grip_demand = 'high'
WHERE is_active = true AND (grip_demand IS NULL OR grip_demand = '')
  AND (pairing_category = 'grip'
    OR slug IN (
      'pullup', 'chinup', 'weighted_pull_up', 'neutral_pull_up', 'ring_pull_up', 'australian_pull_up',
      'barbell_deadlift', 'barbell_rdl', 'trap_bar_deadlift', 'sumo_deadlift', 'deficit_deadlift', 'snatch_grip_deadlift',
      'farmer_carry', 'suitcase_carry', 'waiter_carry', 'overhead_carry', 'toes_to_bar', 'hanging_leg_raise', 'l_sit',
      'barbell_row', 'pendlay_row', 'yates_row', 't_bar_row', 'db_row', 'renegade_row', 'inverted_row', 'inverted_row_feet_elevated',
      'shrug', 'db_shrug', 'rack_pull', 'kb_swing', 'single_arm_swing'
    ));

UPDATE public.exercises SET grip_demand = 'medium'
WHERE is_active = true AND (grip_demand IS NULL OR grip_demand = '')
  AND (slug IN ('bench_press_barbell', 'oh_press', 'front_squat', 'barbell_back_squat', 'good_morning', 'stiff_leg_deadlift', 'rdl_dumbbell', 'barbell_curl', 'preacher_curl', 'wrist_curl', 'reverse_curl')
    OR (movement_pattern IN ('push', 'pull', 'hinge') AND equipment && ARRAY['barbell']));

-- ============== 6) Backfill: impact_level ==============
UPDATE public.exercises SET impact_level = 'high'
WHERE is_active = true AND (impact_level IS NULL OR impact_level = '')
  AND slug IN (
    'jump_squat', 'box_jump', 'burpee', 'jump_rope', 'jump_lunge', 'mountain_climber',
    'zone2_treadmill', 'running', 'sprint', 'bounding', 'lateral_bound', 'skater_jump', 'tuck_jump', 'broad_jump'
  );

UPDATE public.exercises SET impact_level = 'medium'
WHERE is_active = true AND (impact_level IS NULL OR impact_level = '')
  AND (slug IN ('stepup', 'walking_lunge', 'assault_bike', 'ski_erg') OR modalities @> ARRAY['conditioning']);

UPDATE public.exercises SET impact_level = 'low'
WHERE is_active = true AND (impact_level IS NULL OR impact_level = '')
  AND movement_pattern IN ('squat', 'hinge', 'push', 'pull', 'carry', 'rotate')
  AND modalities && ARRAY['strength','hypertrophy','power'];

-- ============== 7) Default: main work roles get low warmup/cooldown relevance ==============
UPDATE public.exercises SET warmup_relevance = 'low'
WHERE is_active = true AND (warmup_relevance IS NULL OR warmup_relevance = '')
  AND exercise_role IN ('main_compound', 'accessory', 'isolation', 'finisher', 'conditioning');

UPDATE public.exercises SET cooldown_relevance = 'low'
WHERE is_active = true AND (cooldown_relevance IS NULL OR cooldown_relevance = '')
  AND exercise_role IN ('main_compound', 'accessory', 'isolation', 'finisher', 'conditioning');

COMMENT ON COLUMN public.exercises.warmup_relevance IS 'Suitability as warm-up: none | low | medium | high.';
COMMENT ON COLUMN public.exercises.cooldown_relevance IS 'Suitability as cooldown/stretch: none | low | medium | high.';
COMMENT ON COLUMN public.exercises.stability_demand IS 'Balance/stability demand: none | low | medium | high.';
COMMENT ON COLUMN public.exercises.grip_demand IS 'Grip/forearm demand: none | low | medium | high.';
COMMENT ON COLUMN public.exercises.impact_level IS 'Joint impact level (e.g. plyometric): none | low | medium | high.';
