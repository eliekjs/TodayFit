-- Muay Thai: add starter_exercises tags so getPreferredExerciseNamesForSportAndGoals
-- ranks Muay Thai-relevant exercises first (rotational power, hip stability, work capacity, core, leg power).
-- sport_tag_profile: striking, kicks, conditioning, anaerobic_repeats, hips, shins, trunk, aerobic_base.
-- Research-backed (20250310100000): barbell_deadlift, push_up, kb_swing.

-- Power/hinge/hip for clinch and kicks
UPDATE public.starter_exercises SET tags = tags || '["power","hinge_pattern","hip_stability"]'::jsonb
WHERE slug IN ('barbell_deadlift', 'kettlebell_swing') AND NOT (tags ? 'power');
UPDATE public.starter_exercises SET tags = tags || '["rotation","explosive_power","core_stability"]'::jsonb
WHERE slug IN ('medball_rotational_throw', 'cable_woodchop') AND NOT (tags ? 'rotation');
UPDATE public.starter_exercises SET tags = tags || '["work_capacity","anaerobic_capacity"]'::jsonb
WHERE slug IN ('kettlebell_swing', 'rower_intervals', 'assault_bike_intervals') AND NOT (tags ? 'work_capacity');

-- Hip stability (kicks, stance)
UPDATE public.starter_exercises SET tags = tags || '["hip_stability","hips","single_leg_strength"]'::jsonb
WHERE slug IN ('single_leg_rdl', 'bulgarian_split_squat', 'reverse_lunge') AND NOT (tags ? 'hip_stability');

-- Leg power (explosive_power, plyometric for kicks)
UPDATE public.starter_exercises SET tags = tags || '["explosive_power","plyometric"]'::jsonb
WHERE slug IN ('box_jump', 'jump_squat') AND NOT (tags ? 'explosive_power');
