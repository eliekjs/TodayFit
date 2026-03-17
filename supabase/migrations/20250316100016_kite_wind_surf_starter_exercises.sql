-- Kitesurfing / Windsurfing: add starter_exercises tags so getPreferredExerciseNamesForSportAndGoals
-- ranks kite/windsurf-relevant exercises first (balance, core stability, grip, leg strength, work capacity).
-- sport_tag_profile: balance, trunk, grip, legs, anaerobic_bursts, endurance.

-- Balance / single-leg (board stance)
UPDATE public.starter_exercises SET tags = tags || '["balance","single_leg_strength"]'::jsonb
WHERE slug IN ('single_leg_rdl', 'bulgarian_split_squat', 'reverse_lunge') AND NOT (tags ? 'balance');

-- Core stability (trunk control on board)
UPDATE public.starter_exercises SET tags = tags || '["core_stability","core_anti_rotation"]'::jsonb
WHERE slug IN ('dead_bug', 'side_plank', 'cable_pallof_press') AND NOT (tags ? 'core_stability');

-- Grip endurance (bar/rig control)
UPDATE public.starter_exercises SET tags = tags || '["grip","grip_endurance","carry"]'::jsonb
WHERE slug = 'farmer_carry' AND NOT (tags ? 'grip_endurance');

-- Leg strength (squat/lunge for stance and loading)
UPDATE public.starter_exercises SET tags = tags || '["squat_pattern","lunge_pattern"]'::jsonb
WHERE slug IN ('goblet_squat', 'reverse_lunge', 'bulgarian_split_squat') AND NOT (tags ? 'squat_pattern');

-- Work capacity (sessions, repeated efforts)
UPDATE public.starter_exercises SET tags = tags || '["work_capacity","anaerobic_capacity"]'::jsonb
WHERE slug IN ('rower_intervals', 'assault_bike_intervals') AND NOT (tags ? 'work_capacity');
