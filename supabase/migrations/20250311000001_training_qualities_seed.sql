-- =============================================================================
-- Phase 1: Seed data for training qualities system
-- Idempotent: INSERT ... ON CONFLICT DO UPDATE/NOTHING
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. training_qualities (canonical taxonomy; matches logic/workoutIntelligence/trainingQualities.ts)
-- -----------------------------------------------------------------------------
INSERT INTO public.training_qualities (slug, name, category, description, sort_order)
VALUES
  ('max_strength', 'Max strength', 'strength', 'Peak force production; low reps, heavy load.', 1),
  ('hypertrophy', 'Hypertrophy', 'strength', 'Muscle size; moderate load and volume.', 2),
  ('muscular_endurance', 'Muscular endurance', 'strength', 'Sustained force; higher reps, shorter rest.', 3),
  ('unilateral_strength', 'Unilateral strength', 'strength', 'Single-limb strength and balance.', 4),
  ('eccentric_strength', 'Eccentric strength', 'strength', 'Controlled lengthening under load.', 5),
  ('pulling_strength', 'Pulling strength', 'strength', 'Vertical/horizontal pull; lats, back, biceps.', 6),
  ('pushing_strength', 'Pushing strength', 'strength', 'Vertical/horizontal push; chest, shoulders, triceps.', 7),
  ('lockoff_strength', 'Lock-off strength', 'strength', 'Static hold at bent arm (climbing).', 8),
  ('power', 'Power', 'power', 'Explosive force; speed × strength.', 10),
  ('rate_of_force_development', 'Rate of force development', 'power', 'How quickly force is produced.', 11),
  ('plyometric_ability', 'Plyometric ability', 'power', 'Stretch-shorten cycle; jumps, bounds.', 12),
  ('aerobic_base', 'Aerobic base', 'energy_system', 'Zone 2; sustained low-intensity endurance.', 20),
  ('aerobic_power', 'Aerobic power', 'energy_system', 'Higher intensity sustained efforts.', 21),
  ('anaerobic_capacity', 'Anaerobic capacity', 'energy_system', 'Repeated high-intensity efforts.', 22),
  ('lactate_tolerance', 'Lactate tolerance', 'energy_system', 'Ability to sustain effort at lactate threshold.', 23),
  ('work_capacity', 'Work capacity', 'energy_system', 'Mixed modal; total work in time.', 24),
  ('mobility', 'Mobility', 'movement', 'Range of motion and tissue capacity.', 30),
  ('thoracic_mobility', 'Thoracic mobility', 'movement', 'T-spine rotation and extension.', 31),
  ('balance', 'Balance', 'movement', 'Static and dynamic balance.', 32),
  ('coordination', 'Coordination', 'movement', 'Movement skill and sequencing.', 33),
  ('rotational_power', 'Rotational power', 'movement', 'Explosive rotation (throwing, striking).', 34),
  ('rotational_control', 'Rotational control', 'movement', 'Controlled rotation and anti-rotation.', 35),
  ('joint_stability', 'Joint stability', 'resilience', 'Stability around joints; injury resilience.', 40),
  ('tendon_resilience', 'Tendon resilience', 'resilience', 'Tendon load tolerance and recovery.', 41),
  ('recovery', 'Recovery', 'resilience', 'Low-intensity restoration.', 42),
  ('grip_strength', 'Grip strength', 'sport_support', 'Hand and finger strength.', 50),
  ('forearm_endurance', 'Forearm endurance', 'sport_support', 'Sustained grip and forearm work.', 51),
  ('scapular_stability', 'Scapular stability', 'sport_support', 'Scapula control and positioning.', 52),
  ('core_tension', 'Core tension', 'sport_support', 'Bracing and core stiffness.', 53),
  ('trunk_anti_flexion', 'Trunk anti-flexion', 'sport_support', 'Anti-extension; front core.', 54),
  ('trunk_anti_rotation', 'Trunk anti-rotation', 'sport_support', 'Anti-rotation; oblique stability.', 55),
  ('trunk_endurance', 'Trunk endurance', 'sport_support', 'Sustained trunk stability.', 56),
  ('hip_stability', 'Hip stability', 'sport_support', 'Hip control and single-leg stability.', 57),
  ('posterior_chain_endurance', 'Posterior chain endurance', 'sport_support', 'Sustained posterior chain work.', 58),
  ('lat_hypertrophy', 'Lat hypertrophy', 'sport_support', 'Lat size and pull emphasis.', 59),
  ('quad_hypertrophy', 'Quad hypertrophy', 'sport_support', 'Quad size and knee-dominant work.', 60),
  ('paddling_endurance', 'Paddling endurance', 'sport_support', 'Sustained paddling (surf, SUP).', 61),
  ('pop_up_power', 'Pop-up power', 'sport_support', 'Explosive pop-up (surfing).', 62)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- -----------------------------------------------------------------------------
-- 2. sport_training_demand (example sports; slugs match or align with public.sports)
-- -----------------------------------------------------------------------------
WITH demand(sport_slug, quality_slug, weight) AS (
  VALUES
    -- Rock climbing
    ('rock_bouldering', 'pulling_strength', 0.9),
    ('rock_bouldering', 'grip_strength', 1.0),
    ('rock_bouldering', 'forearm_endurance', 0.7),
    ('rock_bouldering', 'scapular_stability', 0.8),
    ('rock_bouldering', 'core_tension', 0.6),
    ('rock_bouldering', 'lockoff_strength', 0.85),
    ('rock_bouldering', 'power', 0.5),
    -- Backcountry skiing (slug may be backcountry_skiing or similar)
    ('backcountry_skiing', 'aerobic_base', 0.9),
    ('backcountry_skiing', 'eccentric_strength', 0.8),
    ('backcountry_skiing', 'unilateral_strength', 0.8),
    ('backcountry_skiing', 'hip_stability', 0.7),
    ('backcountry_skiing', 'trunk_endurance', 0.6),
    ('backcountry_skiing', 'quad_hypertrophy', 0.5),
    ('backcountry_skiing', 'posterior_chain_endurance', 0.5),
    -- Surfing
    ('surfing', 'paddling_endurance', 0.85),
    ('surfing', 'thoracic_mobility', 0.75),
    ('surfing', 'pop_up_power', 0.8),
    ('surfing', 'balance', 0.8),
    ('surfing', 'rotational_control', 0.6),
    ('surfing', 'core_tension', 0.6),
    ('surfing', 'pushing_strength', 0.4),
    -- Hyrox
    ('hyrox', 'aerobic_power', 0.85),
    ('hyrox', 'lactate_tolerance', 0.8),
    ('hyrox', 'work_capacity', 0.9),
    ('hyrox', 'trunk_endurance', 0.7),
    ('hyrox', 'posterior_chain_endurance', 0.6),
    ('hyrox', 'pushing_strength', 0.4),
    ('hyrox', 'pulling_strength', 0.4),
    -- Road running
    ('road_running', 'aerobic_base', 0.9),
    ('road_running', 'aerobic_power', 0.5),
    ('road_running', 'posterior_chain_endurance', 0.4),
    ('road_running', 'tendon_resilience', 0.5),
    ('road_running', 'recovery', 0.35),
    -- Alpine skiing
    ('alpine_skiing', 'eccentric_strength', 0.85),
    ('alpine_skiing', 'unilateral_strength', 0.75),
    ('alpine_skiing', 'hip_stability', 0.75),
    ('alpine_skiing', 'quad_hypertrophy', 0.6),
    ('alpine_skiing', 'trunk_anti_rotation', 0.5),
    ('alpine_skiing', 'balance', 0.5)
)
INSERT INTO public.sport_training_demand (sport_slug, training_quality_slug, weight)
SELECT d.sport_slug, d.quality_slug, d.weight
FROM demand d
WHERE EXISTS (SELECT 1 FROM public.training_qualities tq WHERE tq.slug = d.quality_slug)
ON CONFLICT (sport_slug, training_quality_slug) DO UPDATE SET weight = EXCLUDED.weight;

-- -----------------------------------------------------------------------------
-- 3. goal_training_demand (user goals → qualities)
-- -----------------------------------------------------------------------------
WITH demand(goal_slug, quality_slug, weight) AS (
  VALUES
    ('hypertrophy', 'hypertrophy', 0.9),
    ('hypertrophy', 'max_strength', 0.4),
    ('hypertrophy', 'pulling_strength', 0.55),
    ('hypertrophy', 'pushing_strength', 0.55),
    ('hypertrophy', 'muscular_endurance', 0.4),
    ('hypertrophy', 'joint_stability', 0.3),
    ('strength', 'max_strength', 0.95),
    ('strength', 'pulling_strength', 0.6),
    ('strength', 'pushing_strength', 0.6),
    ('strength', 'unilateral_strength', 0.4),
    ('strength', 'eccentric_strength', 0.35),
    ('strength', 'core_tension', 0.4),
    ('athletic_performance', 'power', 0.7),
    ('athletic_performance', 'rate_of_force_development', 0.6),
    ('athletic_performance', 'max_strength', 0.5),
    ('athletic_performance', 'unilateral_strength', 0.4),
    ('athletic_performance', 'balance', 0.4),
    ('climbing_performance', 'pulling_strength', 0.9),
    ('climbing_performance', 'grip_strength', 0.85),
    ('climbing_performance', 'scapular_stability', 0.8),
    ('climbing_performance', 'core_tension', 0.7),
    ('climbing_performance', 'lockoff_strength', 0.75),
    ('climbing_performance', 'forearm_endurance', 0.6),
    ('endurance', 'aerobic_base', 0.9),
    ('endurance', 'anaerobic_capacity', 0.4),
    ('endurance', 'posterior_chain_endurance', 0.4),
    ('endurance', 'trunk_endurance', 0.35),
    ('endurance', 'recovery', 0.3),
    ('mobility', 'mobility', 0.95),
    ('mobility', 'thoracic_mobility', 0.7),
    ('mobility', 'hip_stability', 0.5),
    ('mobility', 'recovery', 0.5),
    ('resilience', 'joint_stability', 0.7),
    ('resilience', 'scapular_stability', 0.6),
    ('resilience', 'core_tension', 0.6),
    ('resilience', 'trunk_anti_rotation', 0.6),
    ('resilience', 'mobility', 0.5),
    ('resilience', 'recovery', 0.5),
    ('resilience', 'hip_stability', 0.5)
)
INSERT INTO public.goal_training_demand (goal_slug, training_quality_slug, weight)
SELECT d.goal_slug, d.quality_slug, d.weight
FROM demand d
WHERE EXISTS (SELECT 1 FROM public.training_qualities tq WHERE tq.slug = d.quality_slug)
ON CONFLICT (goal_slug, training_quality_slug) DO UPDATE SET weight = EXCLUDED.weight;

-- -----------------------------------------------------------------------------
-- 4. exercise_training_quality (example exercises; use exercise slug to resolve id)
-- Only insert for exercises that exist in public.exercises.
-- -----------------------------------------------------------------------------
WITH ex_quality(ex_slug, quality_slug, weight) AS (
  VALUES
    ('pullup', 'pulling_strength', 1.0),
    ('pullup', 'grip_strength', 0.6),
    ('pullup', 'core_tension', 0.4),
    ('pullup', 'hypertrophy', 0.7),
    ('pullup', 'lat_hypertrophy', 0.7),
    ('barbell_back_squat', 'max_strength', 0.95),
    ('barbell_back_squat', 'hypertrophy', 0.5),
    ('barbell_back_squat', 'quad_hypertrophy', 0.8),
    ('barbell_back_squat', 'unilateral_strength', 0.2),
    ('barbell_back_squat', 'eccentric_strength', 0.5),
    ('bulgarian_split_squat', 'unilateral_strength', 1.0),
    ('bulgarian_split_squat', 'quad_hypertrophy', 0.8),
    ('bulgarian_split_squat', 'hip_stability', 0.5),
    ('bulgarian_split_squat', 'eccentric_strength', 0.4),
    ('rdl_dumbbell', 'eccentric_strength', 0.8),
    ('rdl_dumbbell', 'posterior_chain_endurance', 0.3),
    ('rdl_dumbbell', 'scapular_stability', 0.3),
    ('rdl_dumbbell', 'hypertrophy', 0.5),
    ('barbell_deadlift', 'max_strength', 0.9),
    ('barbell_deadlift', 'power', 0.4),
    ('barbell_deadlift', 'grip_strength', 0.5),
    ('barbell_deadlift', 'core_tension', 0.5),
    ('bench_press_barbell', 'pushing_strength', 0.95),
    ('bench_press_barbell', 'hypertrophy', 0.6),
    ('bench_press_barbell', 'max_strength', 0.85),
    ('lat_pulldown', 'pulling_strength', 0.9),
    ('lat_pulldown', 'lat_hypertrophy', 0.8),
    ('lat_pulldown', 'hypertrophy', 0.7),
    ('kb_swing', 'power', 0.7),
    ('kb_swing', 'work_capacity', 0.7),
    ('kb_swing', 'hip_stability', 0.4),
    ('kb_swing', 'rate_of_force_development', 0.5),
    ('goblet_squat', 'max_strength', 0.5),
    ('goblet_squat', 'hypertrophy', 0.6),
    ('goblet_squat', 'unilateral_strength', 0.3),
    ('goblet_squat', 'core_tension', 0.4),
    ('push_up', 'pushing_strength', 0.7),
    ('push_up', 'core_tension', 0.5),
    ('push_up', 'hypertrophy', 0.4),
    ('hip_thrust', 'hypertrophy', 0.7),
    ('hip_thrust', 'hip_stability', 0.6),
    ('hip_thrust', 'posterior_chain_endurance', 0.3)
)
INSERT INTO public.exercise_training_quality (exercise_id, training_quality_slug, weight)
SELECT e.id, eq.quality_slug, eq.weight
FROM ex_quality eq
JOIN public.exercises e ON e.slug = eq.ex_slug AND e.is_active = true
WHERE EXISTS (SELECT 1 FROM public.training_qualities tq WHERE tq.slug = eq.quality_slug)
ON CONFLICT (exercise_id, training_quality_slug) DO UPDATE SET weight = EXCLUDED.weight;
