-- Tags for generation logic: canonical joint_stress (match INJURY_AVOID_TAGS), movement detail, exercise_role, pairing, stretch.
-- Research-backed: NSCA movement patterns, ExRx/APTA-style joint stress naming.

-- Ensure weight column exists (from 20250302100000)
ALTER TABLE public.exercise_tags ADD COLUMN IF NOT EXISTS weight real NOT NULL DEFAULT 1.0;

-- Canonical joint_stress tags (exact slugs used by lib/workoutRules getInjuryAvoidTags / filterInjury)
INSERT INTO public.exercise_tags (slug, name, tag_group, sort_order, weight)
VALUES
  ('shoulder_overhead', 'Shoulder overhead', 'joint_stress', 70, 1.0),
  ('shoulder_extension', 'Shoulder extension', 'joint_stress', 71, 1.0),
  ('grip_hanging', 'Grip / hanging', 'joint_stress', 72, 1.0),
  ('knee_flexion', 'Knee flexion', 'joint_stress', 73, 1.0),
  ('deep_knee_flexion', 'Deep knee flexion', 'joint_stress', 74, 1.0),
  ('lumbar_shear', 'Lumbar shear', 'joint_stress', 75, 1.0),
  ('spinal_axial_load', 'Spinal axial load', 'joint_stress', 76, 1.0),
  ('elbow_stress', 'Elbow stress', 'joint_stress', 77, 1.0),
  ('wrist_stress', 'Wrist stress', 'joint_stress', 78, 1.0),
  ('hip_stress', 'Hip stress', 'joint_stress', 79, 1.0),
  ('ankle_stress', 'Ankle stress', 'joint_stress', 80, 1.0)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tag_group = 'joint_stress',
  sort_order = EXCLUDED.sort_order,
  weight = COALESCE(EXCLUDED.weight, public.exercise_tags.weight);

-- Finer movement patterns (NSCA-style: horizontal vs vertical push/pull, lunge)
INSERT INTO public.exercise_tags (slug, name, tag_group, sort_order, weight)
VALUES
  ('horizontal_push', 'Horizontal push', 'movement_pattern', 8, 1.2),
  ('vertical_push', 'Vertical push', 'movement_pattern', 9, 1.2),
  ('horizontal_pull', 'Horizontal pull', 'movement_pattern', 10, 1.2),
  ('vertical_pull', 'Vertical pull', 'movement_pattern', 11, 1.2),
  ('lunge', 'Lunge', 'movement_pattern', 12, 1.2),
  ('anti_rotation', 'Anti-rotation', 'movement_pattern', 13, 1.0),
  ('shoulder_stability', 'Shoulder stability', 'movement_pattern', 14, 1.0),
  ('thoracic_mobility', 'Thoracic mobility', 'movement_pattern', 15, 1.0)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tag_group = EXCLUDED.tag_group,
  sort_order = EXCLUDED.sort_order,
  weight = COALESCE(EXCLUDED.weight, public.exercise_tags.weight);

-- exercise_role (for block compatibility: warmup, main_compound, accessory, cooldown, etc.)
INSERT INTO public.exercise_tags (slug, name, tag_group, sort_order, weight)
VALUES
  ('role_warmup', 'Warmup', 'exercise_role', 200, 1.0),
  ('role_prep', 'Prep', 'exercise_role', 201, 1.0),
  ('role_main_compound', 'Main compound', 'exercise_role', 202, 1.0),
  ('role_accessory', 'Accessory', 'exercise_role', 203, 1.0),
  ('role_isolation', 'Isolation', 'exercise_role', 204, 1.0),
  ('role_finisher', 'Finisher', 'exercise_role', 205, 1.0),
  ('role_cooldown', 'Cooldown', 'exercise_role', 206, 1.0),
  ('role_mobility', 'Mobility', 'exercise_role', 207, 1.0),
  ('role_conditioning', 'Conditioning', 'exercise_role', 208, 1.0)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tag_group = EXCLUDED.tag_group,
  sort_order = EXCLUDED.sort_order,
  weight = COALESCE(EXCLUDED.weight, public.exercise_tags.weight);

-- pairing_category (for superset rules: chest, shoulders, triceps, back, biceps, quads, posterior_chain, core, mobility)
INSERT INTO public.exercise_tags (slug, name, tag_group, sort_order, weight)
VALUES
  ('pair_chest', 'Chest', 'pairing_category', 210, 1.0),
  ('pair_shoulders', 'Shoulders', 'pairing_category', 211, 1.0),
  ('pair_triceps', 'Triceps', 'pairing_category', 212, 1.0),
  ('pair_back', 'Back', 'pairing_category', 213, 1.0),
  ('pair_biceps', 'Biceps', 'pairing_category', 214, 1.0),
  ('pair_quads', 'Quads', 'pairing_category', 215, 1.0),
  ('pair_posterior_chain', 'Posterior chain', 'pairing_category', 216, 1.0),
  ('pair_core', 'Core', 'pairing_category', 217, 1.0),
  ('pair_mobility', 'Mobility', 'pairing_category', 218, 1.0)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tag_group = EXCLUDED.tag_group,
  sort_order = EXCLUDED.sort_order,
  weight = COALESCE(EXCLUDED.weight, public.exercise_tags.weight);

-- stretch_target / mobility_target (for cooldown selection: hamstrings, hip_flexors, thoracic_spine, etc.)
INSERT INTO public.exercise_tags (slug, name, tag_group, sort_order, weight)
VALUES
  ('stretch_hamstrings', 'Hamstrings', 'stretch_target', 220, 1.0),
  ('stretch_hip_flexors', 'Hip flexors', 'stretch_target', 221, 1.0),
  ('stretch_thoracic_spine', 'Thoracic spine', 'stretch_target', 222, 1.0),
  ('stretch_shoulders', 'Shoulders', 'stretch_target', 223, 1.0),
  ('stretch_calves', 'Calves', 'stretch_target', 224, 1.0),
  ('stretch_glutes', 'Glutes', 'stretch_target', 225, 1.0),
  ('stretch_quadriceps', 'Quadriceps', 'stretch_target', 226, 1.0),
  ('stretch_lats', 'Lats', 'stretch_target', 227, 1.0),
  ('stretch_pecs', 'Pecs', 'stretch_target', 228, 1.0),
  ('stretch_hip_mobility', 'Hip mobility', 'stretch_target', 229, 1.0)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tag_group = EXCLUDED.tag_group,
  sort_order = EXCLUDED.sort_order,
  weight = COALESCE(EXCLUDED.weight, public.exercise_tags.weight);
