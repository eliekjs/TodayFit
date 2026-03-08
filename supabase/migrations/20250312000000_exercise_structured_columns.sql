-- Exercise structured columns for rule-based filtering and generation logic.
-- Aligned with NSCA-style movement patterns, ExRx-style joint stress, and generator constraints.
-- Run after existing exercise/tag migrations.

-- primary_movement_family: canonical family for strict body-part inclusion
-- Values: upper_push | upper_pull | lower_body | core | mobility | conditioning
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS primary_movement_family text;

-- secondary_movement_families: for exercises that span families (e.g. thruster = upper_push + lower_body)
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS secondary_movement_families text[] DEFAULT '{}';

-- movement_patterns: finer NSCA-style patterns (horizontal_push, vertical_push, squat, hinge, lunge, etc.)
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS movement_patterns text[] DEFAULT '{}';

-- joint_stress_tags: canonical tags for injury filtering (must match lib/workoutRules INJURY_AVOID_TAGS)
-- shoulder_overhead, shoulder_extension, grip_hanging, knee_flexion, deep_knee_flexion, lumbar_shear, etc.
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS joint_stress_tags text[] DEFAULT '{}';

-- contraindication_tags: body regions to avoid when injured (shoulder, knee, lower_back, elbow, wrist, hip, ankle)
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS contraindication_tags text[] DEFAULT '{}';

-- stretch_targets / mobility_targets: for cooldown mobility selection (hamstrings, hip_flexors, thoracic_spine, etc.)
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS stretch_targets text[] DEFAULT '{}';

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS mobility_targets text[] DEFAULT '{}';

-- exercise_role: warmup, prep, main_compound, accessory, isolation, finisher, cooldown, mobility, conditioning
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS exercise_role text;

-- pairing_category: for superset logic (chest, shoulders, triceps, back, biceps, quads, posterior_chain, core, mobility)
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS pairing_category text;

-- unilateral: single-limb vs bilateral
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS unilateral boolean DEFAULT false;

-- fatigue_regions: regions that get fatigued (quads, glutes, pecs, triceps, lats, biceps, forearms, core)
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS fatigue_regions text[] DEFAULT '{}';

-- Indexes for filter and generator queries
CREATE INDEX IF NOT EXISTS idx_exercises_primary_movement_family
  ON public.exercises(primary_movement_family) WHERE primary_movement_family IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exercises_joint_stress_tags
  ON public.exercises USING GIN(joint_stress_tags) WHERE joint_stress_tags <> '{}';

CREATE INDEX IF NOT EXISTS idx_exercises_exercise_role
  ON public.exercises(exercise_role) WHERE exercise_role IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exercises_pairing_category
  ON public.exercises(pairing_category) WHERE pairing_category IS NOT NULL;

COMMENT ON COLUMN public.exercises.primary_movement_family IS 'Canonical movement family for strict body-part filter (upper_push, upper_pull, lower_body, core, mobility, conditioning)';
COMMENT ON COLUMN public.exercises.joint_stress_tags IS 'Canonical joint stress tags for injury-based exclusion; must match INJURY_AVOID_TAGS in app';
COMMENT ON COLUMN public.exercises.exercise_role IS 'Role in session: warmup, prep, main_compound, accessory, isolation, finisher, cooldown, mobility, conditioning';
COMMENT ON COLUMN public.exercises.pairing_category IS 'For superset pairing: chest, shoulders, triceps, back, biceps, quads, posterior_chain, core, mobility';
