-- Flag football: add starter_exercises so getPreferredExerciseNamesForSportAndGoals
-- ranks flag-football-relevant exercises first (speed, change of direction, leg power, hamstrings).
-- sport_tag_profile: sprinting, cutting, anaerobic_repeats, hamstrings, adductors, change_of_direction.
-- Research-backed (20250310100000): lateral_lunge, squat_clean, box_jump.

-- 1) Power clean for flag football (explosive triple extension, speed-strength)
INSERT INTO public.starter_exercises (slug, name, modality, tags, contraindications, is_active)
VALUES
  ('squat_clean', 'Power Clean', 'power', '["power","explosive_power","speed","hinge_pattern","legs","core","compound","full_body"]'::jsonb, '["lower_back","shoulder","wrist"]'::jsonb, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  modality = EXCLUDED.modality,
  tags = public.starter_exercises.tags || EXCLUDED.tags,
  contraindications = EXCLUDED.contraindications,
  is_active = true;

-- 2) Append flag-football-relevant tags to existing starter_exercises (speed, agility, hamstrings)
UPDATE public.starter_exercises SET tags = tags || '["speed","agility","explosive_power"]'::jsonb
WHERE slug IN ('lateral_lunge', 'box_jump', 'jump_squat') AND NOT (tags ? 'speed');
UPDATE public.starter_exercises SET tags = tags || '["hamstrings","eccentric_strength"]'::jsonb
WHERE slug IN ('single_leg_rdl', 'romanian_deadlift') AND NOT (tags ? 'hamstrings');
