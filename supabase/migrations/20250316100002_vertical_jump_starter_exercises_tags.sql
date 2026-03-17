-- Vertical jump / dunk training: ensure starter_exercises has tags that match
-- SUB_FOCUS_TAG_MAP (vertical_jump: vertical_jump → explosive_power, plyometric, power, etc.)
-- so getPreferredExerciseNamesForSportAndGoals ranks jump-specific exercises first.
-- Evidence: combined resistance + plyometric training improves vertical jump (systematic reviews);
-- key exercises: jump squats, box jumps, back squats, trap bar deadlift, Bulgarian split squats,
-- calf raises (see docs/research/vertical-jump-dunk-training.md).

-- 1) Add vertical-jump plyometric exercises to starter_exercises if missing (by slug)
INSERT INTO public.starter_exercises (slug, name, modality, tags, contraindications, is_active)
VALUES
  ('box_jump', 'Box Jump', 'power', '["power","plyometric","explosive_power","legs","core","jumping","squat_pattern"]'::jsonb, '["knee"]'::jsonb, true),
  ('jump_squat', 'Jump Squat', 'power', '["power","plyometric","explosive_power","legs","core","jumping","squat_pattern"]'::jsonb, '["knee"]'::jsonb, true),
  ('jump_lunge', 'Jump Lunge', 'power', '["power","plyometric","explosive_power","single_leg_strength","legs","balance"]'::jsonb, '["knee"]'::jsonb, true),
  ('barbell_back_squat', 'Barbell Back Squat', 'strength', '["strength","barbell","squat_pattern","quads","glutes","core","max_strength","power"]'::jsonb, '["knee","lower_back"]'::jsonb, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  modality = EXCLUDED.modality,
  tags = public.starter_exercises.tags || EXCLUDED.tags,
  contraindications = EXCLUDED.contraindications,
  is_active = true;

-- 2) Append vertical-jump tags to existing starter_exercises that support jump training
UPDATE public.starter_exercises SET tags = tags || '["power","squat_pattern","explosive_power"]'::jsonb
WHERE slug = 'back_squat' AND NOT (tags ? 'explosive_power');
UPDATE public.starter_exercises SET tags = tags || '["single_leg_strength","power","explosive_power"]'::jsonb
WHERE slug = 'bulgarian_split_squat' AND NOT (tags ? 'explosive_power');
UPDATE public.starter_exercises SET tags = tags || '["hinge_pattern","power"]'::jsonb
WHERE slug IN ('trap_bar_deadlift','romanian_deadlift') AND NOT (tags ? 'power');
UPDATE public.starter_exercises SET tags = tags || '["jumping","explosive_power","plyometric"]'::jsonb
WHERE slug = 'standing_calf_raise' AND NOT (tags ? 'plyometric');
