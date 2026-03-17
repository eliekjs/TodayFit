-- Badminton: add sport to catalog, sport_tag_profile, and starter_exercises tags
-- so getPreferredExerciseNamesForSportAndGoals ranks badminton-relevant exercises first.

-- 1) Add badminton to public.sports (Court/Field)
INSERT INTO public.sports (slug, name, category, description, is_active, popularity_tier)
VALUES ('badminton', 'Badminton', 'Court/Field', 'Racquet sport with explosive lateral movement and overhead strokes.', true, 2)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  popularity_tier = EXCLUDED.popularity_tier;

-- 2) Add badminton to sport_tag_profile
INSERT INTO public.sport_tag_profile (sport_slug, tags)
VALUES ('badminton', '["sport","court","racquet","lateral","change_of_direction","anaerobic_repeats","shoulders","rotational_power","explosive","wrists"]'::jsonb)
ON CONFLICT (sport_slug) DO UPDATE SET
  tags = EXCLUDED.tags,
  updated_at = now();

-- 3) Append badminton-relevant tags to starter_exercises (lateral speed, rotation, shoulder, core, work capacity)
UPDATE public.starter_exercises SET tags = tags || '["agility","speed"]'::jsonb
WHERE slug IN ('lateral_lunge', 'reverse_lunge', 'bulgarian_split_squat') AND NOT (tags ? 'agility');
UPDATE public.starter_exercises SET tags = tags || '["rotation","explosive_power"]'::jsonb
WHERE slug IN ('cable_woodchop', 'medball_rotational_throw') AND NOT (tags ? 'rotation');
UPDATE public.starter_exercises SET tags = tags || '["shoulder_stability","scapular_control"]'::jsonb
WHERE slug IN ('face_pull', 'band_pullapart') AND NOT (tags ? 'shoulder_stability');
UPDATE public.starter_exercises SET tags = tags || '["core_anti_rotation","core_stability"]'::jsonb
WHERE slug IN ('dead_bug', 'side_plank', 'cable_pallof_press') AND NOT (tags ? 'core_anti_rotation');
UPDATE public.starter_exercises SET tags = tags || '["work_capacity","anaerobic_capacity"]'::jsonb
WHERE slug IN ('rower_intervals', 'assault_bike_intervals') AND NOT (tags ? 'work_capacity');
