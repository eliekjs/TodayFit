-- Volleyball (Indoor): add starter_exercises so getPreferredExerciseNamesForSportAndGoals
-- ranks volleyball-relevant exercises first (vertical jump, landing, shoulder, core, knee).
-- sport_tag_profile: jumping, shoulders, overhead, anaerobic_repeats, knees, ankles, landing_mechanics.
-- Research-backed (20250310100000): barbell_back_squat, bulgarian_split_squat, calf_raise, jump_squat, box_jump, ytw, band_pullapart, face_pull, t_spine_rotation.

-- 1) Volleyball-specific prep and shoulder exercises (match public.exercises names)
INSERT INTO public.starter_exercises (slug, name, modality, tags, contraindications, is_active)
VALUES
  ('ytw', 'Y-T-W Raise', 'mobility', '["mobility","shoulder_stability","scapular_control","shoulders","upper_back","prehab"]'::jsonb, '[]'::jsonb, true),
  ('band_pullapart', 'Band Pull-Apart', 'mobility', '["mobility","shoulder_stability","scapular_control","shoulders","posture","prehab"]'::jsonb, '[]'::jsonb, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  modality = EXCLUDED.modality,
  tags = public.starter_exercises.tags || EXCLUDED.tags,
  contraindications = EXCLUDED.contraindications,
  is_active = true;

-- 2) Append volleyball-relevant tags to existing starter_exercises (jump, landing, knee, shoulder)
UPDATE public.starter_exercises SET tags = tags || '["explosive_power","plyometric","knee_stability"]'::jsonb
WHERE slug IN ('box_jump', 'jump_squat') AND NOT (tags ? 'plyometric');
UPDATE public.starter_exercises SET tags = tags || '["squat_pattern","knee_stability","eccentric_quad_strength"]'::jsonb
WHERE slug IN ('barbell_back_squat', 'back_squat') AND NOT (tags ? 'knee_stability');
UPDATE public.starter_exercises SET tags = tags || '["single_leg_strength","knee_stability","balance"]'::jsonb
WHERE slug = 'bulgarian_split_squat' AND NOT (tags ? 'knee_stability');
UPDATE public.starter_exercises SET tags = tags || '["jumping","knee_stability","calves"]'::jsonb
WHERE slug IN ('standing_calf_raise', 'calf_raise') AND NOT (tags ? 'jumping');
UPDATE public.starter_exercises SET tags = tags || '["shoulder_stability","scapular_control"]'::jsonb
WHERE slug = 'face_pull' AND NOT (tags ? 'shoulder_stability');
UPDATE public.starter_exercises SET tags = tags || '["thoracic_mobility","t_spine","shoulders"]'::jsonb
WHERE slug IN ('t_spine_rotation', 't_spine_rotation_open_book') AND NOT (tags ? 'thoracic_mobility');
