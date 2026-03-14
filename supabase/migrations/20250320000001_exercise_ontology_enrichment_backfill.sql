-- Backfill exercise ontology enrichment columns across the exercise database.
-- warmup_relevance, cooldown_relevance, stability_demand, grip_demand, impact_level, aliases, swap_candidates.
-- Values: none | low | medium | high. Touches all active exercises where applicable.

-- ============== WARMUP RELEVANCE ==============
-- High: classic warm-up / prep mobility
UPDATE public.exercises SET warmup_relevance = 'high'
WHERE is_active = true AND slug IN (
  'cat_camel', 't_spine_rotation', 'worlds_greatest_stretch', 'hip_90_90', 'frog_stretch', 'thread_the_needle',
  'quadruped_rockback', 'inchworm', 'ytw', 'face_pull_band', 'cuban_press', 'wall_slide', 'banded_walk', 'windmill',
  'band_pullapart', 'breathing_diaphragmatic', 'dead_bug', 'bird_dog'
);

-- Medium: light activation / prep that can be used in warm-up
UPDATE public.exercises SET warmup_relevance = 'medium'
WHERE is_active = true AND (exercise_role = 'mobility' OR modalities && ARRAY['mobility','recovery'])
  AND (warmup_relevance IS NULL OR warmup_relevance = 'none');

-- Stretches that are cooldown-focused get warmup_relevance low (can still open a session gently)
UPDATE public.exercises SET warmup_relevance = 'low'
WHERE is_active = true AND exercise_role = 'cooldown' AND (warmup_relevance IS NULL);

-- ============== COOLDOWN RELEVANCE ==============
-- High: dedicated stretches and mobility for cool-down
UPDATE public.exercises SET cooldown_relevance = 'high'
WHERE is_active = true AND slug IN (
  'standing_hamstring_stretch', 'figure_four_stretch', 'standing_quad_stretch', 'calf_stretch_wall',
  'hip_flexor_stretch', 'chest_stretch_doorway', 'cat_camel', 't_spine_rotation', 'hip_90_90', 'frog_stretch',
  'thread_the_needle', 'worlds_greatest_stretch', 'breathing_diaphragmatic'
);

-- Medium: mobility exercises suitable for cool-down
UPDATE public.exercises SET cooldown_relevance = 'medium'
WHERE is_active = true AND exercise_role IN ('mobility', 'cooldown') AND (cooldown_relevance IS NULL);

-- ============== STABILITY DEMAND ==============
-- High: single-leg, pistol, unstable surface, heavy balance component
UPDATE public.exercises SET stability_demand = 'high'
WHERE is_active = true AND (
  unilateral = true AND slug IN ('pistol_squat', 'shrimp_squat', 'single_leg_rdl', 'single_leg_hip_thrust', 'bulgarian_split_squat')
  OR slug IN ('pistol_squat', 'shrimp_squat', 'single_leg_rdl', 'single_leg_hip_thrust', 'bulgarian_split_squat', 'stability_ball_hamstring_curl', 'bottoms_up_kb_press', 'bottoms_up_press')
);

-- Medium: unilateral or anti-rotation without extreme balance
UPDATE public.exercises SET stability_demand = 'medium'
WHERE is_active = true AND (unilateral = true OR slug LIKE '%single_arm%' OR slug LIKE '%one_arm%' OR slug IN ('db_row', 'renegade_row', 'suitcase_carry', 'waiter_carry', 'split_squat', 'walking_lunge'))
  AND (stability_demand IS NULL);

-- Low: machine / supported (explicit low for clarity in filtering)
UPDATE public.exercises SET stability_demand = 'low'
WHERE is_active = true AND (
  slug IN ('leg_extension', 'leg_curl', 'leg_press_machine', 'hack_squat', 'pec_deck', 'chest_press_machine', 'lat_pulldown', 'cable_row', 'seated_calf_raise', 'hip_abduction', 'hip_adduction', 'back_extension_45')
  OR equipment && ARRAY['machine'] AND movement_pattern IN ('squat', 'hinge', 'push', 'pull')
) AND stability_demand IS NULL;

-- ============== GRIP DEMAND ==============
-- High: heavy grip / hanging / heavy pulls
UPDATE public.exercises SET grip_demand = 'high'
WHERE is_active = true AND slug IN (
  'pullup', 'chinup', 'weighted_pull_up', 'neutral_pull_up', 'ring_pull_up', 'australian_pull_up',
  'barbell_deadlift', 'barbell_rdl', 'trap_bar_deadlift', 'sumo_deadlift', 'deficit_deadlift', 'snatch_grip_deadlift',
  'farmer_carry', 'suitcase_carry', 'waiter_carry', 'overhead_carry', 'toes_to_bar', 'hanging_leg_raise', 'l_sit',
  'barbell_row', 'pendlay_row', 'yates_row', 't_bar_row', 'db_row', 'renegade_row', 'inverted_row', 'inverted_row_feet_elevated',
  'shrug', 'db_shrug', 'rack_pull', 'kb_swing', 'single_arm_swing'
);

-- Medium: barbell/dumbbell work that taxes grip but not maximally
UPDATE public.exercises SET grip_demand = 'medium'
WHERE is_active = true AND (
  slug IN ('bench_press_barbell', 'oh_press', 'front_squat', 'barbell_back_squat', 'good_morning', 'stiff_leg_deadlift', 'rdl_dumbbell', 'barbell_curl', 'preacher_curl', 'wrist_curl', 'reverse_curl')
  OR (movement_pattern IN ('push', 'pull', 'hinge') AND equipment && ARRAY['barbell'])
) AND grip_demand IS NULL;

-- ============== IMPACT LEVEL ==============
-- High: plyometric, jump, run
UPDATE public.exercises SET impact_level = 'high'
WHERE is_active = true AND slug IN (
  'jump_squat', 'box_jump', 'burpee', 'jump_rope', 'jump_lunge', 'mountain_climber',
  'zone2_treadmill', 'running', 'sprint', 'bounding', 'lateral_bound', 'skater_jump', 'tuck_jump', 'broad_jump'
);

-- Medium: step, lunge, higher impact conditioning
UPDATE public.exercises SET impact_level = 'medium'
WHERE is_active = true AND (slug IN ('stepup', 'walking_lunge', 'assault_bike', 'ski_erg') OR modalities @> ARRAY['conditioning'])
  AND impact_level IS NULL;

-- Low: most strength work (default for injury filtering when NULL is treated as unknown)
UPDATE public.exercises SET impact_level = 'low'
WHERE is_active = true AND movement_pattern IN ('squat', 'hinge', 'push', 'pull', 'carry', 'rotate')
  AND modalities && ARRAY['strength','hypertrophy','power'] AND impact_level IS NULL;

-- ============== ALIASES ==============
UPDATE public.exercises SET aliases = ARRAY['OHP', 'overhead press', 'strict press'] WHERE slug = 'oh_press';
UPDATE public.exercises SET aliases = ARRAY['bench', 'BP', 'barbell bench'] WHERE slug = 'bench_press_barbell';
UPDATE public.exercises SET aliases = ARRAY['DB bench', 'dumbbell bench'] WHERE slug = 'db_bench';
UPDATE public.exercises SET aliases = ARRAY['back squat', 'squat'] WHERE slug = 'barbell_back_squat';
UPDATE public.exercises SET aliases = ARRAY['RDL', 'Romanian deadlift'] WHERE slug = 'barbell_rdl';
UPDATE public.exercises SET aliases = ARRAY['conventional deadlift', 'DL'] WHERE slug = 'barbell_deadlift';
UPDATE public.exercises SET aliases = ARRAY['trap bar DL', 'hex bar deadlift'] WHERE slug = 'trap_bar_deadlift';
UPDATE public.exercises SET aliases = ARRAY['pull-up', 'pull up'] WHERE slug = 'pullup';
UPDATE public.exercises SET aliases = ARRAY['chin-up', 'chin up'] WHERE slug = 'chinup';
UPDATE public.exercises SET aliases = ARRAY['lat pulldown', 'pulldown'] WHERE slug = 'lat_pulldown';
UPDATE public.exercises SET aliases = ARRAY['BB row', 'barbell row'] WHERE slug = 'barbell_row';
UPDATE public.exercises SET aliases = ARRAY['single arm row', 'one arm row'] WHERE slug = 'db_row';
UPDATE public.exercises SET aliases = ARRAY['push-up', 'pushup'] WHERE slug = 'push_up';
UPDATE public.exercises SET aliases = ARRAY['goblet squat'] WHERE slug = 'goblet_squat';
UPDATE public.exercises SET aliases = ARRAY['BSS', 'Bulgarian split squat', 'split squat'] WHERE slug = 'bulgarian_split_squat';
UPDATE public.exercises SET aliases = ARRAY['RFESS', 'rear foot elevated split squat'] WHERE slug = 'split_squat';
UPDATE public.exercises SET aliases = ARRAY['KB swing', 'kettlebell swing'] WHERE slug = 'kb_swing';
UPDATE public.exercises SET aliases = ARRAY['WGS', 'world''s greatest stretch'] WHERE slug = 'worlds_greatest_stretch';
UPDATE public.exercises SET aliases = ARRAY['face pull'] WHERE slug = 'face_pull';
UPDATE public.exercises SET aliases = ARRAY['leg press'] WHERE slug = 'leg_press_machine';
UPDATE public.exercises SET aliases = ARRAY['hip thrust'] WHERE slug = 'hip_thrust';
UPDATE public.exercises SET aliases = ARRAY['glute bridge'] WHERE slug = 'glute_bridge';
UPDATE public.exercises SET aliases = ARRAY['incline DB press'] WHERE slug = 'incline_db_press';
UPDATE public.exercises SET aliases = ARRAY['lateral raise', 'side raise'] WHERE slug = 'lateral_raise';
UPDATE public.exercises SET aliases = ARRAY['tricep pushdown', 'pushdown'] WHERE slug = 'tricep_pushdown';
UPDATE public.exercises SET aliases = ARRAY['leg curl'] WHERE slug = 'leg_curl';
UPDATE public.exercises SET aliases = ARRAY['leg extension'] WHERE slug = 'leg_extension';
UPDATE public.exercises SET aliases = ARRAY['calf raise'] WHERE slug = 'calf_raise';
UPDATE public.exercises SET aliases = ARRAY['farmer''s carry', 'farmers carry'] WHERE slug = 'farmer_carry';
UPDATE public.exercises SET aliases = ARRAY['Pallof press', 'Pallof hold'] WHERE slug = 'pallof_hold';
UPDATE public.exercises SET aliases = ARRAY['ab wheel', 'ab rollout'] WHERE slug = 'ab_wheel';
UPDATE public.exercises SET aliases = ARRAY['band pull-apart', 'pull apart'] WHERE slug = 'band_pullapart';

-- ============== SWAP CANDIDATES (logical substitutes in same slot) ==============
UPDATE public.exercises SET swap_candidates = ARRAY['db_bench', 'incline_db_press', 'push_up', 'dips', 'cable_fly']
WHERE slug = 'bench_press_barbell';

UPDATE public.exercises SET swap_candidates = ARRAY['bench_press_barbell', 'incline_db_press', 'push_up', 'cable_fly']
WHERE slug = 'db_bench';

UPDATE public.exercises SET swap_candidates = ARRAY['db_shoulder_press', 'arnold_press', 'push_press', 'pike_push_up']
WHERE slug = 'oh_press';

UPDATE public.exercises SET swap_candidates = ARRAY['oh_press', 'arnold_press', 'seated_dumbbell_ohp']
WHERE slug = 'db_shoulder_press';

UPDATE public.exercises SET swap_candidates = ARRAY['chinup', 'lat_pulldown', 'barbell_row', 'cable_row', 'trx_row']
WHERE slug = 'pullup';

UPDATE public.exercises SET swap_candidates = ARRAY['pullup', 'lat_pulldown', 'neutral_pull_up', 'weighted_pull_up']
WHERE slug = 'chinup';

UPDATE public.exercises SET swap_candidates = ARRAY['pullup', 'chinup', 'barbell_row', 'cable_row', 'db_row']
WHERE slug = 'lat_pulldown';

UPDATE public.exercises SET swap_candidates = ARRAY['cable_row', 'db_row', 'pullup', 'lat_pulldown', 'trx_row']
WHERE slug = 'barbell_row';

UPDATE public.exercises SET swap_candidates = ARRAY['barbell_row', 'db_row', 'pullup', 'lat_pulldown']
WHERE slug = 'cable_row';

UPDATE public.exercises SET swap_candidates = ARRAY['front_squat', 'goblet_squat', 'leg_press_machine', 'hack_squat', 'bulgarian_split_squat']
WHERE slug = 'barbell_back_squat';

UPDATE public.exercises SET swap_candidates = ARRAY['barbell_back_squat', 'goblet_squat', 'leg_press_machine', 'split_squat']
WHERE slug = 'front_squat';

UPDATE public.exercises SET swap_candidates = ARRAY['barbell_back_squat', 'front_squat', 'hack_squat', 'split_squat']
WHERE slug = 'goblet_squat';

UPDATE public.exercises SET swap_candidates = ARRAY['barbell_rdl', 'single_leg_rdl', 'hip_thrust', 'good_morning', 'leg_curl']
WHERE slug = 'barbell_deadlift';

UPDATE public.exercises SET swap_candidates = ARRAY['barbell_deadlift', 'trap_bar_deadlift', 'single_leg_rdl', 'hip_thrust']
WHERE slug = 'barbell_rdl';

UPDATE public.exercises SET swap_candidates = ARRAY['barbell_deadlift', 'barbell_rdl', 'rdl_dumbbell']
WHERE slug = 'trap_bar_deadlift';

UPDATE public.exercises SET swap_candidates = ARRAY['glute_bridge', 'barbell_rdl', 'back_extension', 'leg_curl']
WHERE slug = 'hip_thrust';

UPDATE public.exercises SET swap_candidates = ARRAY['split_squat', 'walking_lunge', 'leg_press_machine', 'leg_extension']
WHERE slug = 'bulgarian_split_squat';

UPDATE public.exercises SET swap_candidates = ARRAY['bulgarian_split_squat', 'walking_lunge', 'barbell_back_squat']
WHERE slug = 'split_squat';

UPDATE public.exercises SET swap_candidates = ARRAY['tricep_pushdown', 'overhead_tricep_extension', 'close_grip_bench', 'dips']
WHERE slug = 'skull_crusher';

UPDATE public.exercises SET swap_candidates = ARRAY['barbell_curl', 'hammer_curl', 'preacher_curl', 'concentration_curl']
WHERE slug = 'db_curl';

UPDATE public.exercises SET swap_candidates = ARRAY['db_curl', 'hammer_curl', 'preacher_curl', 'cable_row']
WHERE slug = 'barbell_curl';

UPDATE public.exercises SET swap_candidates = ARRAY['dead_bug', 'plank', 'pallof_hold', 'ab_wheel']
WHERE slug = 'bird_dog';

UPDATE public.exercises SET swap_candidates = ARRAY['plank', 'dead_bug', 'side_plank', 'hollow_hold']
WHERE slug = 'ab_wheel';

-- ============== DEFAULT REMAINING: demand/relevance low or none ==============
-- So generator can distinguish "no data" from "explicitly low" we leave NULL for unknown.
-- Optional: set warmup_relevance = 'low' for main_compound/accessory so they are not chosen as warmup.
UPDATE public.exercises SET warmup_relevance = 'low'
WHERE is_active = true AND exercise_role IN ('main_compound', 'accessory', 'isolation', 'finisher', 'conditioning')
  AND warmup_relevance IS NULL;

UPDATE public.exercises SET cooldown_relevance = 'low'
WHERE is_active = true AND exercise_role IN ('main_compound', 'accessory', 'isolation', 'finisher', 'conditioning')
  AND cooldown_relevance IS NULL;
