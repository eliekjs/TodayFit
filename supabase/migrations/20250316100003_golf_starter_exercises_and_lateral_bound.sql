-- Golf and vertical jump: add starter_exercises so getPreferredExerciseNamesForSportAndGoals
-- ranks sport-specific exercises first (golf: rotation, core, T-spine, hip; vertical jump: lateral_bound).
-- Evidence: golf (TPI, core training research, thoracic/hip mobility); vertical jump (plyometric meta-analyses).

-- 1) Lateral bound for vertical jump / dunk (plyometric, reactive)
INSERT INTO public.starter_exercises (slug, name, modality, tags, contraindications, is_active)
VALUES
  ('lateral_bound', 'Lateral Bound', 'power', '["power","plyometric","explosive_power","explosive","agility","single_leg_strength","legs","balance"]'::jsonb, '["knee"]'::jsonb, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  modality = EXCLUDED.modality,
  tags = public.starter_exercises.tags || EXCLUDED.tags,
  contraindications = EXCLUDED.contraindications,
  is_active = true;

-- 2) Golf-relevant exercises (rotation, core, thoracic mobility, hip)
INSERT INTO public.starter_exercises (slug, name, modality, tags, contraindications, is_active)
VALUES
  ('cable_woodchop', 'Cable Woodchop', 'strength', '["strength","rotation","core_anti_rotation","core","core_stability","power"]'::jsonb, '[]'::jsonb, true),
  ('pallof_hold', 'Pallof Hold', 'strength', '["strength","anti_rotation","core_anti_rotation","core","core_stability","trunk","hips"]'::jsonb, '[]'::jsonb, true),
  ('pallof_press', 'Pallof Press', 'strength', '["strength","anti_rotation","core_anti_rotation","core","core_stability","cable"]'::jsonb, '[]'::jsonb, true),
  ('medball_rotational_throw', 'Medicine Ball Rotational Throw', 'power', '["power","rotation","explosive_power","core","core_rotation"]'::jsonb, '[]'::jsonb, true),
  ('russian_twist', 'Russian Twist', 'strength', '["strength","rotation","core","core_rotation"]'::jsonb, '["lower_back"]'::jsonb, true),
  ('t_spine_rotation', 'T-Spine Rotation', 'mobility', '["mobility","thoracic_mobility","t_spine","rotation","shoulders"]'::jsonb, '[]'::jsonb, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  modality = EXCLUDED.modality,
  tags = public.starter_exercises.tags || EXCLUDED.tags,
  contraindications = EXCLUDED.contraindications,
  is_active = true;

-- 3) Ensure open book / thoracic mobility entry exists for golf (slug may vary; use common name)
-- If t_spine_rotation_open_book exists in starter_exercises from seed, append golf tags
UPDATE public.starter_exercises SET tags = tags || '["thoracic_mobility","t_spine","rotation","mobility"]'::jsonb
WHERE slug = 't_spine_rotation_open_book' AND NOT (tags ? 'thoracic_mobility');
