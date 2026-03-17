-- Boxing: add starter_exercises so getPreferredExerciseNamesForSportAndGoals
-- ranks boxing-relevant exercises first (rotational power, work capacity, shoulder, leg power, core).
-- sport_tag_profile: striking, footwork, conditioning, anaerobic_repeats, aerobic_base, shoulders, wrists.
-- Research-backed (20250310100000): trap_bar_deadlift, close_grip_bench, front_squat, kneeling_landmine_press, medball_slam, box_jump, db_row, band_pullapart.

-- 1) Boxing-specific exercises (match public.exercises names)
INSERT INTO public.starter_exercises (slug, name, modality, tags, contraindications, is_active)
VALUES
  ('medball_slam', 'Medicine Ball Slam', 'power', '["power","explosive_power","rotation","core","work_capacity","conditioning"]'::jsonb, '[]'::jsonb, true),
  ('kneeling_landmine_press', 'Kneeling Landmine Press', 'strength', '["strength","vertical_push","shoulder_stability","scapular_control","core","rotation"]'::jsonb, '["shoulder"]'::jsonb, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  modality = EXCLUDED.modality,
  tags = public.starter_exercises.tags || EXCLUDED.tags,
  contraindications = EXCLUDED.contraindications,
  is_active = true;

-- 2) Append boxing-relevant tags to existing starter_exercises
UPDATE public.starter_exercises SET tags = tags || '["explosive_power","rotation","core_stability"]'::jsonb
WHERE slug IN ('trap_bar_deadlift', 'front_squat', 'box_jump') AND NOT (tags ? 'rotation');
UPDATE public.starter_exercises SET tags = tags || '["shoulder_stability","scapular_control"]'::jsonb
WHERE slug = 'band_pullapart' AND NOT (tags ? 'shoulder_stability');
UPDATE public.starter_exercises SET tags = tags || '["rotation","explosive_power","work_capacity"]'::jsonb
WHERE slug IN ('medball_rotational_throw', 'cable_woodchop') AND NOT (tags ? 'work_capacity');
UPDATE public.starter_exercises SET tags = tags || '["work_capacity","anaerobic_capacity"]'::jsonb
WHERE slug IN ('rower_intervals', 'assault_bike_intervals', 'sled_push', 'kettlebell_swing') AND NOT (tags ? 'work_capacity');
