-- Idempotent seed: exercise_tags, exercises, exercise_tag_map, exercise_contraindications
-- Run after 20250301000002_app_entities_schema.sql

-- exercise_tags (all tag slugs + modality slugs used in data/exercises)
INSERT INTO public.exercise_tags (slug, name, tag_group, sort_order)
VALUES
  ('quad-focused', 'Quad focused', 'general', 1),
  ('posterior chain', 'Posterior chain', 'general', 2),
  ('hamstrings', 'Hamstrings', 'general', 3),
  ('single-leg', 'Single leg', 'general', 4),
  ('balance', 'Balance', 'general', 5),
  ('chest', 'Chest', 'general', 6),
  ('triceps', 'Triceps', 'general', 7),
  ('shoulder-friendly', 'Shoulder friendly', 'general', 8),
  ('core stability', 'Core stability', 'general', 9),
  ('spine-friendly', 'Spine friendly', 'general', 10),
  ('glutes', 'Glutes', 'general', 11),
  ('hip hinge', 'Hip hinge', 'general', 12),
  ('power', 'Power', 'general', 13),
  ('grip strength', 'Grip strength', 'general', 14),
  ('shoulder stability', 'Shoulder stability', 'general', 15),
  ('posture', 'Posture', 'general', 16),
  ('upper back', 'Upper back', 'general', 17),
  ('anti-rotation', 'Anti-rotation', 'general', 18),
  ('lat-focused', 'Lat focused', 'general', 19),
  ('lats', 'Lats', 'general', 20),
  ('shoulders', 'Shoulders', 'general', 26),
  ('knee-friendly', 'Knee friendly', 'general', 21),
  ('uphill conditioning', 'Uphill conditioning', 'general', 22),
  ('thoracic mobility', 'Thoracic mobility', 'general', 23),
  ('endurance', 'Endurance', 'general', 24),
  ('low impact', 'Low impact', 'general', 25),
  ('strength', 'Strength', 'modality', 30),
  ('hypertrophy', 'Hypertrophy', 'modality', 31),
  ('mobility', 'Mobility', 'modality', 32),
  ('conditioning', 'Conditioning', 'modality', 33)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, tag_group = EXCLUDED.tag_group, sort_order = EXCLUDED.sort_order;

-- exercises (upsert by slug)
INSERT INTO public.exercises (slug, name, primary_muscles, equipment, modalities, is_active)
VALUES
  ('goblet_squat', 'Goblet Squat', ARRAY['legs','core'], ARRAY['dumbbells'], ARRAY['strength','hypertrophy'], true),
  ('rdl_dumbbell', 'Dumbbell Romanian Deadlift', ARRAY['legs'], ARRAY['dumbbells'], ARRAY['strength','hypertrophy'], true),
  ('split_squat', 'Rear-Foot Elevated Split Squat', ARRAY['legs'], ARRAY['bench','dumbbells'], ARRAY['strength','hypertrophy'], true),
  ('bench_press_barbell', 'Barbell Bench Press', ARRAY['push'], ARRAY['barbell','bench','squat_rack'], ARRAY['strength','hypertrophy'], true),
  ('db_bench', 'Dumbbell Bench Press', ARRAY['push'], ARRAY['dumbbells','bench'], ARRAY['strength','hypertrophy'], true),
  ('oh_press', 'Standing Overhead Press', ARRAY['push','core'], ARRAY['barbell'], ARRAY['strength','hypertrophy'], true),
  ('pullup', 'Pull-up or Assisted Pull-up', ARRAY['pull'], ARRAY['pullup_bar'], ARRAY['strength','hypertrophy'], true),
  ('lat_pulldown', 'Lat Pulldown', ARRAY['pull'], ARRAY['cable_machine'], ARRAY['strength','hypertrophy'], true),
  ('db_row', 'Single-Arm Dumbbell Row', ARRAY['pull','core'], ARRAY['dumbbells','bench'], ARRAY['strength','hypertrophy'], true),
  ('plank', 'Plank Hold', ARRAY['core'], ARRAY['bodyweight'], ARRAY['strength'], true),
  ('dead_bug', 'Dead Bug', ARRAY['core'], ARRAY['bodyweight'], ARRAY['strength','mobility'], true),
  ('hip_thrust', 'Hip Thrust', ARRAY['legs'], ARRAY['barbell','bench'], ARRAY['strength','hypertrophy'], true),
  ('kb_swing', 'Kettlebell Swing', ARRAY['legs','core'], ARRAY['kettlebells'], ARRAY['power','conditioning'], true),
  ('farmer_carry', 'Farmer Carry', ARRAY['core'], ARRAY['dumbbells','kettlebells'], ARRAY['strength','conditioning'], true),
  ('band_pullapart', 'Band Pull-Apart', ARRAY['pull'], ARRAY['bands'], ARRAY['mobility','hypertrophy'], true),
  ('face_pull', 'Cable Face Pull', ARRAY['pull'], ARRAY['cable_machine'], ARRAY['mobility','hypertrophy'], true),
  ('walking_lunge', 'Walking Lunge', ARRAY['legs'], ARRAY['bodyweight','dumbbells'], ARRAY['strength','conditioning'], true),
  ('stepup', 'Step-up', ARRAY['legs'], ARRAY['bench'], ARRAY['strength','conditioning'], true),
  ('cat_camel', 'Cat-Camel', ARRAY['core'], ARRAY['bodyweight'], ARRAY['mobility'], true),
  ('t_spine_rotation', 'Quadruped T-Spine Rotation', ARRAY['core'], ARRAY['bodyweight'], ARRAY['mobility'], true),
  ('zone2_bike', 'Zone 2 Bike', ARRAY['legs'], ARRAY['assault_bike'], ARRAY['conditioning'], true),
  ('zone2_treadmill', 'Zone 2 Treadmill', ARRAY['legs'], ARRAY['treadmill'], ARRAY['conditioning'], true),
  ('leg_press_machine', 'Leg Press', ARRAY['legs'], ARRAY['leg_press'], ARRAY['strength','hypertrophy'], true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  primary_muscles = EXCLUDED.primary_muscles,
  equipment = EXCLUDED.equipment,
  modalities = EXCLUDED.modalities,
  is_active = EXCLUDED.is_active;

-- exercise_tag_map: (exercise_slug, tag_slug) -> insert mapping
WITH map_rows(exercise_slug, tag_slug) AS (
  VALUES
    ('goblet_squat', 'quad-focused'), ('goblet_squat', 'posterior chain'),
    ('rdl_dumbbell', 'hamstrings'), ('rdl_dumbbell', 'posterior chain'),
    ('split_squat', 'single-leg'), ('split_squat', 'balance'),
    ('bench_press_barbell', 'chest'), ('bench_press_barbell', 'triceps'),
    ('db_bench', 'chest'), ('db_bench', 'triceps'), ('db_bench', 'shoulder-friendly'),
    ('oh_press', 'shoulders'), ('oh_press', 'core stability'),
    ('pullup', 'lats'), ('pullup', 'upper back'),
    ('lat_pulldown', 'lat-focused'),
    ('db_row', 'upper back'), ('db_row', 'anti-rotation'),
    ('plank', 'core stability'),
    ('dead_bug', 'spine-friendly'), ('dead_bug', 'core stability'),
    ('hip_thrust', 'glutes'), ('hip_thrust', 'posterior chain'),
    ('kb_swing', 'hip hinge'), ('kb_swing', 'power'),
    ('farmer_carry', 'grip strength'), ('farmer_carry', 'core stability'),
    ('band_pullapart', 'shoulder stability'), ('band_pullapart', 'posture'),
    ('face_pull', 'shoulder stability'),
    ('walking_lunge', 'single-leg'), ('walking_lunge', 'uphill conditioning'),
    ('stepup', 'knee-friendly'), ('stepup', 'uphill conditioning'),
    ('cat_camel', 'spine mobility'),
    ('t_spine_rotation', 'thoracic mobility'), ('t_spine_rotation', 'shoulder-friendly'),
    ('zone2_bike', 'endurance'), ('zone2_bike', 'low impact'),
    ('zone2_treadmill', 'endurance'), ('zone2_treadmill', 'low impact'),
    ('leg_press_machine', 'quad-focused'), ('leg_press_machine', 'knee-friendly')
)
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM map_rows m
JOIN public.exercises e ON e.slug = m.exercise_slug
JOIN public.exercise_tags t ON t.slug = m.tag_slug
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- exercise_contraindications
WITH contra_rows(exercise_slug, contraindication) AS (
  VALUES
    ('goblet_squat', 'knee'),
    ('rdl_dumbbell', 'lower_back'),
    ('split_squat', 'knee'),
    ('bench_press_barbell', 'shoulder'), ('bench_press_barbell', 'wrist'),
    ('db_bench', 'shoulder'), ('db_bench', 'wrist'),
    ('oh_press', 'shoulder'), ('oh_press', 'lower_back'),
    ('pullup', 'shoulder'), ('pullup', 'elbow'),
    ('lat_pulldown', 'shoulder'),
    ('db_row', 'lower_back'),
    ('plank', 'shoulder'),
    ('hip_thrust', 'lower_back'),
    ('kb_swing', 'lower_back'),
    ('farmer_carry', 'wrist'),
    ('band_pullapart', 'shoulder'),
    ('face_pull', 'shoulder'),
    ('walking_lunge', 'knee'),
    ('stepup', 'knee'),
    ('zone2_bike', 'knee'),
    ('zone2_treadmill', 'knee'),
    ('leg_press_machine', 'knee'), ('leg_press_machine', 'lower_back')
)
INSERT INTO public.exercise_contraindications (exercise_id, contraindication, joint)
SELECT e.id, c.contraindication, c.contraindication FROM contra_rows c
JOIN public.exercises e ON e.slug = c.exercise_slug
ON CONFLICT (exercise_id, contraindication) DO NOTHING;
