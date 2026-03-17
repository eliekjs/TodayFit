-- Pickleball: add starter_exercises so getPreferredExerciseNamesForSportAndGoals
-- ranks court/paddle-sport exercises first (lateral speed, rotation, shoulder stability).
-- Pickleball demands lateral movement, change of direction, rotational shots, shoulder health (sport_tag_profile).

-- 1) Lateral and agility exercises for pickleball (lateral_speed sub-focus)
INSERT INTO public.starter_exercises (slug, name, modality, tags, contraindications, is_active)
VALUES
  ('lateral_lunge', 'Lateral Lunge', 'strength', '["strength","agility","single_leg_strength","balance","legs","hips","lunge_pattern"]'::jsonb, '["knee"]'::jsonb, true),
  ('banded_walk', 'Banded Walk', 'strength', '["strength","agility","hip_stability","glutes","legs","balance","mobility"]'::jsonb, '[]'::jsonb, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  modality = EXCLUDED.modality,
  tags = public.starter_exercises.tags || EXCLUDED.tags,
  contraindications = EXCLUDED.contraindications,
  is_active = true;

-- 2) Append pickleball-relevant tags to existing starter_exercises (rotation, shoulder, work capacity)
UPDATE public.starter_exercises SET tags = tags || '["agility","single_leg_strength","balance"]'::jsonb
WHERE slug = 'step_up' AND NOT (tags ? 'agility');
UPDATE public.starter_exercises SET tags = tags || '["agility","balance","single_leg_strength"]'::jsonb
WHERE slug = 'single_leg_rdl' AND NOT (tags ? 'agility');
UPDATE public.starter_exercises SET tags = tags || '["rotation","core_anti_rotation"]'::jsonb
WHERE slug IN ('cable_woodchop', 'pallof_hold', 'medball_rotational_throw') AND NOT (tags ? 'rotation');
