-- Hockey: add sport to catalog, sport_tag_profile, and starter_exercises tags
-- so getPreferredExerciseNamesForSportAndGoals ranks hockey-relevant exercises first.

-- 1) Add hockey to public.sports (Court/Field)
INSERT INTO public.sports (slug, name, category, description, is_active, popularity_tier)
VALUES ('hockey', 'Hockey', 'Court/Field', 'Ice hockey: skating power, change of direction, and anaerobic conditioning.', true, 2)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  popularity_tier = EXCLUDED.popularity_tier;

-- 2) Add hockey to sport_tag_profile
INSERT INTO public.sport_tag_profile (sport_slug, tags)
VALUES ('hockey', '["sport","field","skating","power","speed","change_of_direction","anaerobic_repeats","lower_body","core","work_capacity"]'::jsonb)
ON CONFLICT (sport_slug) DO UPDATE SET
  tags = EXCLUDED.tags,
  updated_at = now();

-- 3) Append hockey-relevant tags to starter_exercises (speed, agility, leg power, core, work capacity)
UPDATE public.starter_exercises SET tags = tags || '["speed","agility"]'::jsonb
WHERE slug IN ('lateral_lunge', 'reverse_lunge', 'bulgarian_split_squat', 'box_jump', 'jump_squat') AND NOT (tags ? 'speed');
UPDATE public.starter_exercises SET tags = tags || '["explosive_power","plyometric"]'::jsonb
WHERE slug IN ('box_jump', 'jump_squat') AND NOT (tags ? 'explosive_power');
UPDATE public.starter_exercises SET tags = tags || '["core_stability","core_anti_extension"]'::jsonb
WHERE slug IN ('dead_bug', 'side_plank', 'cable_pallof_press') AND NOT (tags ? 'core_stability');
UPDATE public.starter_exercises SET tags = tags || '["work_capacity","anaerobic_capacity"]'::jsonb
WHERE slug IN ('rower_intervals', 'assault_bike_intervals') AND NOT (tags ? 'work_capacity');
