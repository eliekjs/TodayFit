-- Per (exercise, tag) relevance weight for goal/sport scoring.
-- 1) Add column; 2) Backfill by rules; 3) Curated overrides.

ALTER TABLE public.exercise_tag_map
  ADD COLUMN IF NOT EXISTS relevance_weight real NOT NULL DEFAULT 1.0;

COMMENT ON COLUMN public.exercise_tag_map.relevance_weight IS
  'Per (exercise, tag) relevance for goal/sport scoring; higher = stronger match.';

-- 2) Rule-based backfill: movement 1.2, first modality 1.1, other modality/muscle 1.0, equipment 0.9, energy 0.85
UPDATE public.exercise_tag_map m
SET relevance_weight = CASE
  WHEN t.slug = e.movement_pattern THEN 1.2
  WHEN t.slug = e.modalities[1] THEN 1.1
  WHEN t.slug = ANY(e.modalities) THEN 1.0
  WHEN t.slug = ANY(e.primary_muscles) THEN 1.0
  WHEN t.slug LIKE 'equipment_%' THEN 0.9
  WHEN t.slug IN ('energy_low', 'energy_medium', 'energy_high') THEN 0.85
  ELSE 0.9
END
FROM public.exercises e, public.exercise_tags t
WHERE m.exercise_id = e.id AND m.tag_id = t.id;

-- 3) Curated overrides: pull-up, push-up, squat, RDL, step-up, etc. (exercise_slug, tag_slug, weight)
WITH overrides(exercise_slug, tag_slug, w) AS (
  VALUES
    ('pullup', 'equipment_bodyweight', 1.2),
    ('pullup', 'strength', 1.0),
    ('pullup', 'hypertrophy', 0.7),
    ('pullup', 'pull', 1.2),
    ('pullup', 'lats', 1.0),
    ('push_up', 'equipment_bodyweight', 1.2),
    ('push_up', 'strength', 1.0),
    ('push_up', 'hypertrophy', 0.7),
    ('push_up', 'push', 1.2),
    ('barbell_back_squat', 'strength', 1.2),
    ('barbell_back_squat', 'hypertrophy', 0.85),
    ('barbell_back_squat', 'squat', 1.2),
    ('barbell_back_squat', 'compound', 1.1),
    ('stepup', 'strength', 1.0),
    ('stepup', 'squat', 1.2),
    ('stepup', 'balance', 1.0),
    ('stepup', 'equipment_bench', 0.9),
    ('rdl_dumbbell', 'hinge', 1.2),
    ('rdl_dumbbell', 'strength', 1.0),
    ('barbell_rdl', 'hinge', 1.2),
    ('barbell_rdl', 'strength', 1.0),
    ('barbell_rdl', 'posterior_chain', 1.0),
    ('kb_swing', 'conditioning', 1.1),
    ('kb_swing', 'power', 1.1),
    ('kb_swing', 'hinge', 1.2),
    ('kb_swing', 'posterior_chain', 1.0),
    ('hip_thrust', 'hypertrophy', 1.0),
    ('hip_thrust', 'hinge', 1.2),
    ('hip_thrust', 'glutes', 1.0),
    ('lat_pulldown', 'pull', 1.2),
    ('lat_pulldown', 'hypertrophy', 1.0),
    ('lat_pulldown', 'lats', 1.0),
    ('bench_press_barbell', 'strength', 1.2),
    ('bench_press_barbell', 'push', 1.2),
    ('bench_press_barbell', 'compound', 1.1),
    ('db_bench', 'strength', 1.0),
    ('db_bench', 'push', 1.2),
    ('oh_press', 'strength', 1.2),
    ('oh_press', 'push', 1.2),
    ('goblet_squat', 'squat', 1.2),
    ('goblet_squat', 'strength', 1.0),
    ('split_squat', 'squat', 1.2),
    ('split_squat', 'unilateral', 1.1),
    ('bulgarian_split_squat', 'squat', 1.2),
    ('bulgarian_split_squat', 'unilateral', 1.1),
    ('farmer_carry', 'carry', 1.2),
    ('farmer_carry', 'conditioning', 1.0),
    ('farmer_carry', 'grip', 1.0),
    ('face_pull', 'pull', 1.0),
    ('face_pull', 'scapular_control', 1.2),
    ('dead_bug', 'core_stability', 1.2),
    ('plank', 'core_stability', 1.2),
    ('trap_bar_deadlift', 'strength', 1.2),
    ('trap_bar_deadlift', 'hinge', 1.2),
    ('trap_bar_deadlift', 'compound', 1.1),
    ('neutral_pull_up', 'equipment_bodyweight', 1.2),
    ('neutral_pull_up', 'strength', 1.0),
    ('neutral_pull_up', 'pull', 1.2),
    ('rower', 'conditioning', 1.2),
    ('assault_bike', 'conditioning', 1.2),
    ('zone2_bike', 'conditioning', 1.0),
    ('zone2_treadmill', 'conditioning', 1.0),
    ('incline_treadmill_walk', 'conditioning', 1.0),
    ('sled_push', 'conditioning', 1.1),
    ('sled_push', 'strength', 0.9)
)
UPDATE public.exercise_tag_map m
SET relevance_weight = o.w
FROM overrides o
JOIN public.exercises e ON e.slug = o.exercise_slug
JOIN public.exercise_tags t ON t.slug = o.tag_slug
WHERE m.exercise_id = e.id AND m.tag_id = t.id;
