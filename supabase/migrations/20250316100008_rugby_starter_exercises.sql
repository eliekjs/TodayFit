-- Rugby: add starter_exercises so getPreferredExerciseNamesForSportAndGoals
-- ranks rugby-relevant exercises first (max strength, work capacity, posterior chain, grip).
-- sport_tag_profile: contact, strength, conditioning, anaerobic_repeats, aerobic_base, trunk, durability.
-- Research-backed sport exercises (20250310100000): barbell_deadlift, barbell_back_squat, bench_press_barbell, barbell_row, pullup, farmer_carry.

-- 1) Rugby core lifts (match public.exercises names for generator preferred-name bonus)
INSERT INTO public.starter_exercises (slug, name, modality, tags, contraindications, is_active)
VALUES
  ('barbell_deadlift', 'Barbell Deadlift', 'strength', '["strength","max_strength","hinge_pattern","posterior_chain","glutes","hamstrings","core","grip","compound"]'::jsonb, '["lower_back"]'::jsonb, true),
  ('barbell_back_squat', 'Barbell Back Squat', 'strength', '["strength","max_strength","squat_pattern","quads","glutes","core","compound","power"]'::jsonb, '["knee","lower_back"]'::jsonb, true),
  ('bench_press_barbell', 'Barbell Bench Press', 'strength', '["strength","max_strength","horizontal_push","chest","triceps","shoulders","core","compound"]'::jsonb, '["shoulder"]'::jsonb, true),
  ('barbell_row', 'Barbell Row', 'strength', '["strength","horizontal_pull","back","lats","biceps","core","compound","grip"]'::jsonb, '["lower_back"]'::jsonb, true),
  ('pullup', 'Pull-up or Assisted Pull-up', 'strength', '["strength","vertical_pull","lats","back","biceps","grip","pulling_strength"]'::jsonb, '["shoulder","elbow"]'::jsonb, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  modality = EXCLUDED.modality,
  tags = public.starter_exercises.tags || EXCLUDED.tags,
  contraindications = EXCLUDED.contraindications,
  is_active = true;

-- 2) Append rugby-relevant tags to existing starter_exercises
UPDATE public.starter_exercises SET tags = tags || '["max_strength","posterior_chain","work_capacity","grip"]'::jsonb
WHERE slug = 'farmer_carry' AND NOT (tags ? 'max_strength');
UPDATE public.starter_exercises SET tags = tags || '["work_capacity","anaerobic_capacity","conditioning"]'::jsonb
WHERE slug IN ('rower_intervals', 'assault_bike_intervals', 'sled_push', 'kettlebell_swing') AND NOT (tags ? 'work_capacity');
UPDATE public.starter_exercises SET tags = tags || '["posterior_chain","hinge_pattern","max_strength"]'::jsonb
WHERE slug IN ('trap_bar_deadlift', 'romanian_deadlift') AND NOT (tags ? 'posterior_chain');
UPDATE public.starter_exercises SET tags = tags || '["max_strength","compound","horizontal_push"]'::jsonb
WHERE slug = 'barbell_bench_press' AND NOT (tags ? 'max_strength');
UPDATE public.starter_exercises SET tags = tags || '["max_strength","compound","squat_pattern"]'::jsonb
WHERE slug = 'back_squat' AND NOT (tags ? 'max_strength');
