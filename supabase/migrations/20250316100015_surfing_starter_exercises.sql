-- Surfing: add starter_exercises tags so getPreferredExerciseNamesForSportAndGoals
-- ranks surfing-relevant exercises first (paddle endurance, pop-up power, core rotation, shoulder stability, balance).
-- sport_tag_profile: paddling, upper_body, shoulders, trunk, pop_up, anaerobic_bursts, balance.
-- Research-backed (20250310100000): burpee, push_up, walking_lunge, goblet_squat, plank, pike_push_up, rower, ski_erg.

-- Paddle endurance: rowing simulates paddle; shoulder/scapular control
UPDATE public.starter_exercises SET tags = tags || '["scapular_control","shoulder_stability"]'::jsonb
WHERE slug = 'rower_intervals' AND NOT (tags ? 'scapular_control');

-- Pop-up power: explosive push from prone (burpee); core anti-extension (plank)
UPDATE public.starter_exercises SET tags = tags || '["explosive_power","core_anti_extension"]'::jsonb
WHERE slug = 'burpee' AND NOT (tags ? 'explosive_power');
UPDATE public.starter_exercises SET tags = tags || '["core_anti_extension","core_stability"]'::jsonb
WHERE slug = 'plank' AND NOT (tags ? 'core_anti_extension');

-- Core rotation
UPDATE public.starter_exercises SET tags = tags || '["rotation","core_anti_rotation"]'::jsonb
WHERE slug IN ('cable_woodchop', 'medball_rotational_throw') AND NOT (tags ? 'rotation');

-- Shoulder stability
UPDATE public.starter_exercises SET tags = tags || '["shoulder_stability","scapular_control"]'::jsonb
WHERE slug IN ('face_pull', 'band_pullapart') AND NOT (tags ? 'shoulder_stability');

-- Balance / single-leg (board stance, stability)
UPDATE public.starter_exercises SET tags = tags || '["balance","single_leg_strength"]'::jsonb
WHERE slug IN ('single_leg_rdl', 'bulgarian_split_squat', 'reverse_lunge') AND NOT (tags ? 'balance');
