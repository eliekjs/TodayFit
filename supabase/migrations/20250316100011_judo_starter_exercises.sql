-- Judo: add starter_exercises tags so getPreferredExerciseNamesForSportAndGoals
-- ranks judo-relevant exercises first (grip, hip stability, pull, explosive power, work capacity).
-- sport_tag_profile: throws, grip, power, mobility, anaerobic_repeats, shoulders, hips.
-- Research-backed (20250310100000): barbell_deadlift, barbell_back_squat, pullup, kb_swing.

-- Core research-backed: power/hinge/hip for throws; pull + grip for kumi-kata
UPDATE public.starter_exercises SET tags = tags || '["power","hinge_pattern","hip_stability"]'::jsonb
WHERE slug IN ('barbell_deadlift', 'kettlebell_swing') AND NOT (tags ? 'power');
UPDATE public.starter_exercises SET tags = tags || '["pulling_strength","vertical_pull","grip"]'::jsonb
WHERE slug = 'pullup' AND NOT (tags ? 'pulling_strength');
UPDATE public.starter_exercises SET tags = tags || '["explosive_power","power","hip_stability"]'::jsonb
WHERE slug IN ('barbell_back_squat', 'kettlebell_swing') AND NOT (tags ? 'explosive_power');
UPDATE public.starter_exercises SET tags = tags || '["work_capacity","anaerobic_capacity"]'::jsonb
WHERE slug = 'kettlebell_swing' AND NOT (tags ? 'work_capacity');

-- Grip/carry and hip stability (shared with BJJ pattern)
UPDATE public.starter_exercises SET tags = tags || '["grip","grip_endurance","carry"]'::jsonb
WHERE slug = 'farmer_carry' AND NOT (tags ? 'grip_endurance');
UPDATE public.starter_exercises SET tags = tags || '["hip_stability","hips","single_leg_strength"]'::jsonb
WHERE slug IN ('single_leg_rdl', 'bulgarian_split_squat', 'reverse_lunge') AND NOT (tags ? 'hip_stability');

-- Work capacity (randori / repeated efforts)
UPDATE public.starter_exercises SET tags = tags || '["work_capacity","anaerobic_capacity"]'::jsonb
WHERE slug IN ('rower_intervals', 'assault_bike_intervals') AND NOT (tags ? 'work_capacity');
