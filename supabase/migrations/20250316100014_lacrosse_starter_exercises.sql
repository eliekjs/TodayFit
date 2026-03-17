-- Lacrosse: add starter_exercises so getPreferredExerciseNamesForSportAndGoals
-- ranks lacrosse-relevant exercises first (speed, change of direction, rotation, shoulder, work capacity).
-- sport_tag_profile: intermittent, sprinting, cutting, shoulders, rotational_power, anaerobic_repeats.

-- Append lacrosse-relevant tags to existing starter_exercises (speed, agility, rotation, shoulder)
UPDATE public.starter_exercises SET tags = tags || '["speed","agility","single_leg_strength"]'::jsonb
WHERE slug IN ('lateral_lunge', 'banded_walk', 'box_jump', 'jump_squat') AND NOT (tags ? 'speed');
UPDATE public.starter_exercises SET tags = tags || '["rotation","explosive_power","core_anti_rotation"]'::jsonb
WHERE slug IN ('cable_woodchop', 'medball_rotational_throw', 'russian_twist') AND NOT (tags ? 'rotation');
UPDATE public.starter_exercises SET tags = tags || '["shoulder_stability","scapular_control"]'::jsonb
WHERE slug IN ('face_pull', 'ytw', 'band_pullapart') AND NOT (tags ? 'shoulder_stability');
UPDATE public.starter_exercises SET tags = tags || '["work_capacity","anaerobic_capacity"]'::jsonb
WHERE slug IN ('rower_intervals', 'assault_bike_intervals', 'sled_push') AND NOT (tags ? 'work_capacity');
