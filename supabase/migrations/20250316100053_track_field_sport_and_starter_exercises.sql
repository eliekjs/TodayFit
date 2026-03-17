-- Track & Field: add sport to catalog, sport_tag_profile, and starter_exercises tags
-- so getPreferredExerciseNamesForSportAndGoals ranks T&F-relevant exercises first.
-- Covers sprints, jumps, throws, middle distance; sub-focuses align with track_sprinting (acceleration, max velocity, plyometrics, leg strength, hamstring/tendon resilience).

-- 1) Add track_field to public.sports (Strength/Power)
INSERT INTO public.sports (slug, name, category, description, is_active, popularity_tier)
VALUES ('track_field', 'Track & Field', 'Strength/Power', 'Track and field: sprints, jumps, throws, and middle distance. Power, speed, plyometrics, and tendon resilience.', true, 2)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  popularity_tier = EXCLUDED.popularity_tier;

-- 2) Add track_field to sport_tag_profile
INSERT INTO public.sport_tag_profile (sport_slug, tags)
VALUES ('track_field', '["sport","power","speed","sprinting","jumping","throws","acceleration","max_velocity","plyometrics","hamstrings","ankles","tendons","high_neural"]'::jsonb)
ON CONFLICT (sport_slug) DO UPDATE SET
  tags = EXCLUDED.tags,
  updated_at = now();

-- 3) Append track_field-relevant tags to starter_exercises (same pattern as track_sprinting for ranking)
UPDATE public.starter_exercises SET tags = tags || '["explosive_power","plyometric","track_field"]'::jsonb
WHERE slug IN ('squat_clean','box_jump','jump_squat','bounding','lateral_bound')
  AND NOT (tags ? 'track_field');
UPDATE public.starter_exercises SET tags = tags || '["max_strength","squat_pattern","track_field"]'::jsonb
WHERE slug IN ('back_squat','front_squat')
  AND NOT (tags ? 'track_field');
UPDATE public.starter_exercises SET tags = tags || '["hinge_pattern","posterior_chain","track_field"]'::jsonb
WHERE slug IN ('romanian_deadlift','trap_bar_deadlift','nordic_curl')
  AND NOT (tags ? 'track_field');
