-- Phase 4: Ontology annotations for a representative subset of exercises.
-- Purpose: Prove ontology on real data before refactoring generator. Subset only; no full library.
-- See docs/PHASE4_ANNOTATION_CONVENTIONS.md for decision rules.
--
-- Categories covered: upper_push, upper_pull, lower_body (squat, hinge, unilateral), core, mobility/cooldown, conditioning.
-- Joint stress/contraindication: use joint_stress_tags for biomechanical load; contraindication_tags for body regions to avoid when injured.

-- ============== LOWER BODY — SQUAT ==============
UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['squat'],
  joint_stress_tags = ARRAY['knee_flexion'],
  contraindication_tags = ARRAY['knee'],
  exercise_role = 'main_compound',
  pairing_category = 'quads',
  fatigue_regions = ARRAY['quads', 'core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'goblet_squat';

UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['squat'],
  joint_stress_tags = ARRAY['knee_flexion', 'deep_knee_flexion', 'spinal_axial_load'],
  contraindication_tags = ARRAY['knee', 'lower_back'],
  exercise_role = 'main_compound',
  pairing_category = 'quads',
  fatigue_regions = ARRAY['quads', 'glutes', 'core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'barbell_back_squat';

UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['squat'],
  joint_stress_tags = ARRAY['knee_flexion', 'spinal_axial_load'],
  contraindication_tags = ARRAY['knee', 'lower_back'],
  exercise_role = 'main_compound',
  pairing_category = 'quads',
  fatigue_regions = ARRAY['quads', 'core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'front_squat';

UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['squat'],
  joint_stress_tags = ARRAY['knee_flexion'],
  contraindication_tags = ARRAY['knee', 'lower_back'],
  exercise_role = 'accessory',
  pairing_category = 'quads',
  fatigue_regions = ARRAY['quads'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'leg_press_machine';

UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['lunge'],
  joint_stress_tags = ARRAY['knee_flexion', 'deep_knee_flexion'],
  contraindication_tags = ARRAY['knee'],
  exercise_role = 'accessory',
  pairing_category = 'quads',
  fatigue_regions = ARRAY['quads'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = true
WHERE slug = 'split_squat';

UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['lunge'],
  joint_stress_tags = ARRAY['knee_flexion', 'deep_knee_flexion'],
  contraindication_tags = ARRAY['knee'],
  exercise_role = 'accessory',
  pairing_category = 'quads',
  fatigue_regions = ARRAY['quads'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = true
WHERE slug = 'bulgarian_split_squat';

UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['lunge'],
  joint_stress_tags = ARRAY['knee_flexion'],
  contraindication_tags = ARRAY['knee'],
  exercise_role = 'accessory',
  pairing_category = 'quads',
  fatigue_regions = ARRAY['quads'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = true
WHERE slug = 'stepup';

UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['squat'],
  joint_stress_tags = ARRAY['knee_flexion'],
  contraindication_tags = ARRAY['knee'],
  exercise_role = 'accessory',
  pairing_category = 'quads',
  fatigue_regions = ARRAY['quads'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'hack_squat';

UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['squat'],
  joint_stress_tags = ARRAY['knee_flexion'],
  contraindication_tags = ARRAY['knee'],
  exercise_role = 'isolation',
  pairing_category = 'quads',
  fatigue_regions = ARRAY['quads'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'leg_extension';

UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['squat'],
  joint_stress_tags = ARRAY['knee_flexion'],
  contraindication_tags = ARRAY['knee'],
  exercise_role = 'accessory',
  pairing_category = 'quads',
  fatigue_regions = ARRAY['quads'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'wall_sit';

UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['squat', 'lunge'],
  joint_stress_tags = ARRAY['knee_flexion', 'deep_knee_flexion', 'hip_stress'],
  contraindication_tags = ARRAY['knee', 'hip'],
  exercise_role = 'mobility',
  pairing_category = 'quads',
  fatigue_regions = ARRAY['quads'],
  mobility_targets = ARRAY['hip_internal_rotation', 'hip_external_rotation'],
  stretch_targets = ARRAY['hip_flexors', 'glutes'],
  unilateral = true
WHERE slug = 'cossack_squat';

UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['lunge'],
  joint_stress_tags = ARRAY['knee_flexion'],
  contraindication_tags = ARRAY['knee'],
  exercise_role = 'accessory',
  pairing_category = 'quads',
  fatigue_regions = ARRAY['quads'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = true
WHERE slug = 'lateral_lunge';

UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['lunge'],
  joint_stress_tags = ARRAY['knee_flexion'],
  contraindication_tags = ARRAY['knee'],
  exercise_role = 'accessory',
  pairing_category = 'quads',
  fatigue_regions = ARRAY['quads', 'core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = true
WHERE slug = 'goblet_lateral_lunge';

-- ============== LOWER BODY — HINGE ==============
UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['hinge'],
  joint_stress_tags = ARRAY['lumbar_shear'],
  contraindication_tags = ARRAY['lower_back'],
  exercise_role = 'main_compound',
  pairing_category = 'posterior_chain',
  fatigue_regions = ARRAY['hamstrings', 'glutes', 'core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'rdl_dumbbell';

UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['hinge'],
  joint_stress_tags = ARRAY['lumbar_shear'],
  contraindication_tags = ARRAY['lower_back'],
  exercise_role = 'main_compound',
  pairing_category = 'posterior_chain',
  fatigue_regions = ARRAY['hamstrings', 'glutes', 'core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'barbell_rdl';

UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['hinge'],
  joint_stress_tags = ARRAY['lumbar_shear', 'spinal_axial_load'],
  contraindication_tags = ARRAY['lower_back'],
  exercise_role = 'main_compound',
  pairing_category = 'grip',
  fatigue_regions = ARRAY['hamstrings', 'glutes', 'forearms', 'core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'barbell_deadlift';

UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['hinge'],
  joint_stress_tags = ARRAY['lumbar_shear'],
  contraindication_tags = ARRAY['lower_back'],
  exercise_role = 'main_compound',
  pairing_category = 'posterior_chain',
  fatigue_regions = ARRAY['glutes', 'hamstrings', 'core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'hip_thrust';

UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['hinge'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'prep',
  pairing_category = 'posterior_chain',
  fatigue_regions = ARRAY['glutes'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'glute_bridge';

UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['hinge'],
  joint_stress_tags = ARRAY['lumbar_shear'],
  contraindication_tags = ARRAY['lower_back'],
  exercise_role = 'accessory',
  pairing_category = 'posterior_chain',
  fatigue_regions = ARRAY['hamstrings', 'glutes', 'core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'good_morning';

UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['hinge'],
  joint_stress_tags = ARRAY['lumbar_shear'],
  contraindication_tags = ARRAY['lower_back'],
  exercise_role = 'accessory',
  pairing_category = 'posterior_chain',
  fatigue_regions = ARRAY['hamstrings', 'glutes', 'core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = true
WHERE slug = 'single_leg_rdl';

UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['hinge'],
  joint_stress_tags = ARRAY['lumbar_shear'],
  contraindication_tags = ARRAY['lower_back'],
  exercise_role = 'accessory',
  pairing_category = 'posterior_chain',
  fatigue_regions = ARRAY['hamstrings', 'glutes', 'core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'back_extension';

UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['hinge'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'isolation',
  pairing_category = 'posterior_chain',
  fatigue_regions = ARRAY['hamstrings'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'leg_curl';

UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['hinge'],
  joint_stress_tags = ARRAY['lumbar_shear'],
  contraindication_tags = ARRAY['lower_back'],
  exercise_role = 'main_compound',
  pairing_category = 'posterior_chain',
  fatigue_regions = ARRAY['hamstrings', 'glutes', 'forearms', 'core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'trap_bar_deadlift';

UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['hinge'],
  joint_stress_tags = ARRAY['lumbar_shear'],
  contraindication_tags = ARRAY['lower_back'],
  exercise_role = 'conditioning',
  pairing_category = 'posterior_chain',
  fatigue_regions = ARRAY['glutes', 'hamstrings', 'core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'kb_swing';

-- ============== LOWER BODY — LOCOMOTION (walking lunge) ==============
UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['lunge', 'locomotion'],
  joint_stress_tags = ARRAY['knee_flexion'],
  contraindication_tags = ARRAY['knee'],
  exercise_role = 'accessory',
  pairing_category = 'quads',
  fatigue_regions = ARRAY['quads', 'core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = true
WHERE slug = 'walking_lunge';

-- ============== UPPER PUSH ==============
UPDATE public.exercises SET
  primary_movement_family = 'upper_push',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['horizontal_push'],
  joint_stress_tags = ARRAY['shoulder_extension_load', 'wrist_extension_load'],
  contraindication_tags = ARRAY['shoulder', 'wrist'],
  exercise_role = 'main_compound',
  pairing_category = 'chest',
  fatigue_regions = ARRAY['pecs', 'triceps', 'shoulders'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'bench_press_barbell';

UPDATE public.exercises SET
  primary_movement_family = 'upper_push',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['horizontal_push'],
  joint_stress_tags = ARRAY['shoulder_extension_load', 'wrist_extension_load'],
  contraindication_tags = ARRAY['shoulder', 'wrist'],
  exercise_role = 'main_compound',
  pairing_category = 'chest',
  fatigue_regions = ARRAY['pecs', 'triceps', 'shoulders'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'db_bench';

UPDATE public.exercises SET
  primary_movement_family = 'upper_push',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['vertical_push'],
  joint_stress_tags = ARRAY['shoulder_overhead'],
  contraindication_tags = ARRAY['shoulder', 'lower_back'],
  exercise_role = 'main_compound',
  pairing_category = 'shoulders',
  fatigue_regions = ARRAY['shoulders', 'triceps', 'core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'oh_press';

UPDATE public.exercises SET
  primary_movement_family = 'upper_push',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['horizontal_push'],
  joint_stress_tags = ARRAY['shoulder_extension_load', 'wrist_extension_load'],
  contraindication_tags = ARRAY['shoulder', 'wrist'],
  exercise_role = 'main_compound',
  pairing_category = 'chest',
  fatigue_regions = ARRAY['pecs', 'triceps', 'core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'push_up';

UPDATE public.exercises SET
  primary_movement_family = 'upper_push',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['horizontal_push'],
  joint_stress_tags = ARRAY['shoulder_extension_load'],
  contraindication_tags = ARRAY['shoulder'],
  exercise_role = 'main_compound',
  pairing_category = 'triceps',
  fatigue_regions = ARRAY['triceps', 'pecs', 'shoulders'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'dips';

UPDATE public.exercises SET
  primary_movement_family = 'upper_push',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['horizontal_push'],
  joint_stress_tags = ARRAY['shoulder_extension_load'],
  contraindication_tags = ARRAY['shoulder'],
  exercise_role = 'accessory',
  pairing_category = 'chest',
  fatigue_regions = ARRAY['pecs', 'triceps'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'incline_db_press';

UPDATE public.exercises SET
  primary_movement_family = 'upper_push',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['vertical_push'],
  joint_stress_tags = ARRAY['shoulder_overhead'],
  contraindication_tags = ARRAY['shoulder'],
  exercise_role = 'main_compound',
  pairing_category = 'shoulders',
  fatigue_regions = ARRAY['shoulders', 'triceps'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'db_shoulder_press';

UPDATE public.exercises SET
  primary_movement_family = 'upper_push',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['vertical_push'],
  joint_stress_tags = ARRAY['shoulder_abduction_load'],
  contraindication_tags = ARRAY['shoulder'],
  exercise_role = 'isolation',
  pairing_category = 'shoulders',
  fatigue_regions = ARRAY['shoulders'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'lateral_raise';

UPDATE public.exercises SET
  primary_movement_family = 'upper_push',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['horizontal_push'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'isolation',
  pairing_category = 'triceps',
  fatigue_regions = ARRAY['triceps'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'tricep_pushdown';

UPDATE public.exercises SET
  primary_movement_family = 'upper_push',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['horizontal_push'],
  joint_stress_tags = ARRAY['elbow_stress'],
  contraindication_tags = ARRAY['elbow'],
  exercise_role = 'accessory',
  pairing_category = 'triceps',
  fatigue_regions = ARRAY['triceps'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'close_grip_bench';

UPDATE public.exercises SET
  primary_movement_family = 'upper_push',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['horizontal_push'],
  joint_stress_tags = ARRAY['elbow_stress'],
  contraindication_tags = ARRAY['elbow'],
  exercise_role = 'isolation',
  pairing_category = 'triceps',
  fatigue_regions = ARRAY['triceps'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'skull_crusher';

UPDATE public.exercises SET
  primary_movement_family = 'upper_push',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['horizontal_push'],
  joint_stress_tags = ARRAY['shoulder_extension_load'],
  contraindication_tags = ARRAY['shoulder'],
  exercise_role = 'accessory',
  pairing_category = 'chest',
  fatigue_regions = ARRAY['pecs', 'triceps'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'chest_press_machine';

UPDATE public.exercises SET
  primary_movement_family = 'upper_push',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['vertical_push'],
  joint_stress_tags = ARRAY['shoulder_overhead'],
  contraindication_tags = ARRAY['shoulder'],
  exercise_role = 'accessory',
  pairing_category = 'shoulders',
  fatigue_regions = ARRAY['shoulders', 'triceps', 'core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'pike_push_up';

UPDATE public.exercises SET
  primary_movement_family = 'upper_push',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['vertical_push'],
  joint_stress_tags = ARRAY['shoulder_overhead'],
  contraindication_tags = ARRAY['shoulder'],
  exercise_role = 'main_compound',
  pairing_category = 'shoulders',
  fatigue_regions = ARRAY['shoulders', 'triceps'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'seated_ohp';

-- ============== UPPER PULL ==============
UPDATE public.exercises SET
  primary_movement_family = 'upper_pull',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['vertical_pull'],
  joint_stress_tags = ARRAY['shoulder_extension_load', 'grip_hanging'],
  contraindication_tags = ARRAY['shoulder', 'elbow'],
  exercise_role = 'main_compound',
  pairing_category = 'back',
  fatigue_regions = ARRAY['lats', 'biceps', 'forearms'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'pullup';

UPDATE public.exercises SET
  primary_movement_family = 'upper_pull',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['vertical_pull'],
  joint_stress_tags = ARRAY['shoulder_extension_load'],
  contraindication_tags = ARRAY['shoulder'],
  exercise_role = 'main_compound',
  pairing_category = 'back',
  fatigue_regions = ARRAY['lats', 'biceps'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'lat_pulldown';

UPDATE public.exercises SET
  primary_movement_family = 'upper_pull',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['horizontal_pull'],
  joint_stress_tags = ARRAY['lumbar_shear'],
  contraindication_tags = ARRAY['lower_back'],
  exercise_role = 'accessory',
  pairing_category = 'back',
  fatigue_regions = ARRAY['lats', 'biceps', 'core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = true
WHERE slug = 'db_row';

UPDATE public.exercises SET
  primary_movement_family = 'upper_pull',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['horizontal_pull'],
  joint_stress_tags = ARRAY['lumbar_shear'],
  contraindication_tags = ARRAY['lower_back'],
  exercise_role = 'accessory',
  pairing_category = 'back',
  fatigue_regions = ARRAY['lats', 'biceps'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'cable_row';

UPDATE public.exercises SET
  primary_movement_family = 'upper_pull',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['horizontal_pull'],
  joint_stress_tags = ARRAY['lumbar_shear'],
  contraindication_tags = ARRAY['lower_back'],
  exercise_role = 'main_compound',
  pairing_category = 'back',
  fatigue_regions = ARRAY['lats', 'biceps', 'core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'barbell_row';

UPDATE public.exercises SET
  primary_movement_family = 'upper_pull',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['vertical_pull'],
  joint_stress_tags = ARRAY['shoulder_extension_load', 'grip_hanging'],
  contraindication_tags = ARRAY['shoulder', 'elbow'],
  exercise_role = 'main_compound',
  pairing_category = 'back',
  fatigue_regions = ARRAY['lats', 'biceps', 'forearms'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'chinup';

UPDATE public.exercises SET
  primary_movement_family = 'upper_pull',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['horizontal_pull'],
  joint_stress_tags = ARRAY['shoulder_extension_load'],
  contraindication_tags = ARRAY['shoulder'],
  exercise_role = 'accessory',
  pairing_category = 'shoulders',
  fatigue_regions = ARRAY['shoulders', 'upper_back'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'face_pull';

UPDATE public.exercises SET
  primary_movement_family = 'upper_pull',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['shoulder_stability'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'prep',
  pairing_category = 'mobility',
  fatigue_regions = ARRAY['shoulders'],
  mobility_targets = ARRAY['shoulders'],
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'band_pullapart';

UPDATE public.exercises SET
  primary_movement_family = 'upper_pull',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['horizontal_pull'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'isolation',
  pairing_category = 'shoulders',
  fatigue_regions = ARRAY['shoulders'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'reverse_fly';

UPDATE public.exercises SET
  primary_movement_family = 'upper_pull',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['horizontal_pull'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'isolation',
  pairing_category = 'biceps',
  fatigue_regions = ARRAY['biceps'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'barbell_curl';

UPDATE public.exercises SET
  primary_movement_family = 'upper_pull',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['horizontal_pull'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'accessory',
  pairing_category = 'back',
  fatigue_regions = ARRAY['lats', 'biceps'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'chest_supported_row';

UPDATE public.exercises SET
  primary_movement_family = 'upper_pull',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['shoulder_stability'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'mobility',
  pairing_category = 'mobility',
  fatigue_regions = ARRAY['shoulders'],
  mobility_targets = ARRAY['shoulders'],
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'ytw';

-- ============== CORE ==============
UPDATE public.exercises SET
  primary_movement_family = 'core',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['anti_rotation'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'finisher',
  pairing_category = 'core',
  fatigue_regions = ARRAY['core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'plank';

UPDATE public.exercises SET
  primary_movement_family = 'core',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['anti_rotation'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'prep',
  pairing_category = 'core',
  fatigue_regions = ARRAY['core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'dead_bug';

UPDATE public.exercises SET
  primary_movement_family = 'core',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['anti_rotation'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'accessory',
  pairing_category = 'core',
  fatigue_regions = ARRAY['core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'pallof_hold';

UPDATE public.exercises SET
  primary_movement_family = 'core',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['horizontal_push'],
  joint_stress_tags = ARRAY['lumbar_flexion_load'],
  contraindication_tags = ARRAY['lower_back'],
  exercise_role = 'accessory',
  pairing_category = 'core',
  fatigue_regions = ARRAY['core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'ab_wheel';

UPDATE public.exercises SET
  primary_movement_family = 'core',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['vertical_pull'],
  joint_stress_tags = ARRAY['grip_hanging', 'shoulder_extension_load'],
  contraindication_tags = ARRAY['shoulder'],
  exercise_role = 'accessory',
  pairing_category = 'core',
  fatigue_regions = ARRAY['core', 'lats'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'hanging_leg_raise';

UPDATE public.exercises SET
  primary_movement_family = 'core',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['rotation'],
  joint_stress_tags = ARRAY['lumbar_flexion_load'],
  contraindication_tags = ARRAY['lower_back'],
  exercise_role = 'accessory',
  pairing_category = 'core',
  fatigue_regions = ARRAY['core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'russian_twist';

UPDATE public.exercises SET
  primary_movement_family = 'core',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['anti_rotation'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'accessory',
  pairing_category = 'core',
  fatigue_regions = ARRAY['core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'side_plank';

UPDATE public.exercises SET
  primary_movement_family = 'core',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['anti_rotation'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'mobility',
  pairing_category = 'core',
  fatigue_regions = ARRAY['core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'bird_dog';

UPDATE public.exercises SET
  primary_movement_family = 'core',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['anti_rotation'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'accessory',
  pairing_category = 'core',
  fatigue_regions = ARRAY['core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'pallof_press';

UPDATE public.exercises SET
  primary_movement_family = 'core',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['anti_rotation'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'finisher',
  pairing_category = 'core',
  fatigue_regions = ARRAY['core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'hollow_hold';

-- Carries: core primary (anti-lateral flexion / grip), lower_body secondary for loaded carry
UPDATE public.exercises SET
  primary_movement_family = 'core',
  secondary_movement_families = ARRAY['lower_body'],
  movement_patterns = ARRAY['carry'],
  joint_stress_tags = ARRAY['wrist_extension_load'],
  contraindication_tags = ARRAY['wrist'],
  exercise_role = 'accessory',
  pairing_category = 'grip',
  fatigue_regions = ARRAY['core', 'forearms'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'farmer_carry';

UPDATE public.exercises SET
  primary_movement_family = 'core',
  secondary_movement_families = ARRAY['lower_body'],
  movement_patterns = ARRAY['carry'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'accessory',
  pairing_category = 'core',
  fatigue_regions = ARRAY['core', 'forearms'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = true
WHERE slug = 'suitcase_carry';

-- ============== MOBILITY / COOLDOWN ==============
UPDATE public.exercises SET
  primary_movement_family = 'mobility',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['thoracic_mobility'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'cooldown',
  pairing_category = 'mobility',
  fatigue_regions = '{}',
  mobility_targets = ARRAY['thoracic_spine', 'lumbar'],
  stretch_targets = ARRAY['thoracic_spine', 'low_back'],
  unilateral = false
WHERE slug = 'cat_camel';

UPDATE public.exercises SET
  primary_movement_family = 'mobility',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['thoracic_mobility'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'cooldown',
  pairing_category = 'mobility',
  fatigue_regions = '{}',
  mobility_targets = ARRAY['thoracic_spine'],
  stretch_targets = ARRAY['thoracic_spine'],
  unilateral = false
WHERE slug = 't_spine_rotation';

UPDATE public.exercises SET
  primary_movement_family = 'mobility',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['thoracic_mobility', 'locomotion'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'cooldown',
  pairing_category = 'mobility',
  fatigue_regions = '{}',
  mobility_targets = ARRAY['thoracic_spine', 'hip_flexors', 'hamstrings'],
  stretch_targets = ARRAY['hip_flexors', 'hamstrings', 'thoracic_spine'],
  unilateral = false
WHERE slug = 'worlds_greatest_stretch';

UPDATE public.exercises SET
  primary_movement_family = 'mobility',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['thoracic_mobility'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'cooldown',
  pairing_category = 'mobility',
  fatigue_regions = '{}',
  mobility_targets = ARRAY['hip_internal_rotation', 'hip_external_rotation'],
  stretch_targets = ARRAY['hip_flexors', 'glutes'],
  unilateral = false
WHERE slug = 'hip_90_90';

UPDATE public.exercises SET
  primary_movement_family = 'mobility',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['locomotion'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'cooldown',
  pairing_category = 'mobility',
  fatigue_regions = '{}',
  mobility_targets = ARRAY['hamstrings', 'calves'],
  stretch_targets = ARRAY['hamstrings', 'calves'],
  unilateral = false
WHERE slug = 'inchworm';

UPDATE public.exercises SET
  primary_movement_family = 'mobility',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['thoracic_mobility'],
  joint_stress_tags = ARRAY['hip_stress'],
  contraindication_tags = ARRAY['hip'],
  exercise_role = 'cooldown',
  pairing_category = 'mobility',
  fatigue_regions = '{}',
  mobility_targets = ARRAY['hip_internal_rotation', 'hip_external_rotation'],
  stretch_targets = ARRAY['hip_flexors', 'glutes'],
  unilateral = false
WHERE slug = 'frog_stretch';

UPDATE public.exercises SET
  primary_movement_family = 'mobility',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['thoracic_mobility'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'cooldown',
  pairing_category = 'mobility',
  fatigue_regions = '{}',
  mobility_targets = ARRAY['thoracic_spine', 'shoulders'],
  stretch_targets = ARRAY['thoracic_spine', 'shoulders'],
  unilateral = false
WHERE slug = 'thread_the_needle';

UPDATE public.exercises SET
  primary_movement_family = 'mobility',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['thoracic_mobility'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'cooldown',
  pairing_category = 'mobility',
  fatigue_regions = '{}',
  mobility_targets = ARRAY['thoracic_spine', 'hip_flexors'],
  stretch_targets = ARRAY['low_back'],
  unilateral = false
WHERE slug = 'quadruped_rockback';

UPDATE public.exercises SET
  primary_movement_family = 'mobility',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['shoulder_stability'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'cooldown',
  pairing_category = 'mobility',
  fatigue_regions = '{}',
  mobility_targets = ARRAY['shoulders'],
  stretch_targets = ARRAY['shoulders'],
  unilateral = false
WHERE slug = 'wall_slide';

UPDATE public.exercises SET
  primary_movement_family = 'mobility',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['thoracic_mobility'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'cooldown',
  pairing_category = 'mobility',
  fatigue_regions = '{}',
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'breathing_diaphragmatic';

-- ============== CONDITIONING ==============
UPDATE public.exercises SET
  primary_movement_family = 'conditioning',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['locomotion'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'conditioning',
  pairing_category = 'mobility',
  fatigue_regions = ARRAY['quads', 'calves'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'zone2_bike';

UPDATE public.exercises SET
  primary_movement_family = 'conditioning',
  secondary_movement_families = '{}',
  movement_patterns = ARRAY['locomotion'],
  joint_stress_tags = '{}',
  contraindication_tags = '{}',
  exercise_role = 'conditioning',
  pairing_category = 'mobility',
  fatigue_regions = ARRAY['quads', 'hamstrings', 'core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'rower';

-- ============== HYBRID (thruster) ==============
UPDATE public.exercises SET
  primary_movement_family = 'lower_body',
  secondary_movement_families = ARRAY['upper_push'],
  movement_patterns = ARRAY['squat', 'vertical_push'],
  joint_stress_tags = ARRAY['knee_flexion', 'shoulder_overhead'],
  contraindication_tags = ARRAY['knee', 'shoulder'],
  exercise_role = 'conditioning',
  pairing_category = 'quads',
  fatigue_regions = ARRAY['quads', 'shoulders', 'triceps', 'core'],
  mobility_targets = '{}',
  stretch_targets = '{}',
  unilateral = false
WHERE slug = 'thruster';
