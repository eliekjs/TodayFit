-- Paddleboarding (SUP): add starter_exercises tags so getPreferredExerciseNamesForSportAndGoals
-- ranks SUP-relevant exercises first (aerobic base, core stability, balance, shoulder endurance).
-- sport_tag_profile: steady_state, aerobic, balance, trunk, shoulders, low_impact.

-- Aerobic base (steady paddling)
UPDATE public.starter_exercises SET tags = tags || '["zone2_cardio","aerobic_base"]'::jsonb
WHERE slug IN ('rower_intervals', 'treadmill_incline_walk', 'assault_bike_intervals') AND NOT (tags ? 'zone2_cardio');

-- Core stability (trunk on board)
UPDATE public.starter_exercises SET tags = tags || '["core_stability","core_anti_rotation"]'::jsonb
WHERE slug IN ('dead_bug', 'side_plank', 'cable_pallof_press') AND NOT (tags ? 'core_stability');

-- Balance (standing on board)
UPDATE public.starter_exercises SET tags = tags || '["balance"]'::jsonb
WHERE slug IN ('single_leg_rdl', 'bulgarian_split_squat', 'reverse_lunge') AND NOT (tags ? 'balance');

-- Shoulder endurance (paddle stroke; scapular control)
UPDATE public.starter_exercises SET tags = tags || '["scapular_control","shoulder_stability"]'::jsonb
WHERE slug IN ('rower_intervals', 'face_pull', 'band_pullapart') AND NOT (tags ? 'scapular_control');
