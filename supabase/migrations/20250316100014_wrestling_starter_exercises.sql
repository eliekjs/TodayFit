-- Wrestling: add starter_exercises tags so getPreferredExerciseNamesForSportAndGoals
-- ranks wrestling-relevant exercises first (grip, hip stability, pull, explosive power, work capacity).
-- sport_tag_profile: grappling, power, anaerobic_repeats, strength_endurance, neck_optional, hips, durability.
-- Research-backed (20250310100000): barbell_deadlift, barbell_back_squat, pullup, barbell_row, kb_swing.

-- Core research-backed: power/hinge/hip for takedowns; pull + grip for ties and mat work
UPDATE public.starter_exercises SET tags = tags || '["power","hinge_pattern","hip_stability"]'::jsonb
WHERE slug IN ('barbell_deadlift', 'kettlebell_swing') AND NOT (tags ? 'power');
UPDATE public.starter_exercises SET tags = tags || '["pulling_strength","vertical_pull","grip"]'::jsonb
WHERE slug = 'pullup' AND NOT (tags ? 'pulling_strength');
UPDATE public.starter_exercises SET tags = tags || '["pulling_strength","horizontal_pull","grip"]'::jsonb
WHERE slug = 'barbell_row' AND NOT (tags ? 'pulling_strength');
UPDATE public.starter_exercises SET tags = tags || '["explosive_power","power","hip_stability"]'::jsonb
WHERE slug IN ('barbell_back_squat', 'kettlebell_swing') AND NOT (tags ? 'explosive_power');
UPDATE public.starter_exercises SET tags = tags || '["work_capacity","anaerobic_capacity"]'::jsonb
WHERE slug = 'kettlebell_swing' AND NOT (tags ? 'work_capacity');

-- Grip/carry and hip stability
UPDATE public.starter_exercises SET tags = tags || '["grip","grip_endurance","carry"]'::jsonb
WHERE slug = 'farmer_carry' AND NOT (tags ? 'grip_endurance');
UPDATE public.starter_exercises SET tags = tags || '["hip_stability","hips","single_leg_strength"]'::jsonb
WHERE slug IN ('single_leg_rdl', 'bulgarian_split_squat', 'reverse_lunge') AND NOT (tags ? 'hip_stability');

-- Work capacity (matches, repeated efforts)
UPDATE public.starter_exercises SET tags = tags || '["work_capacity","anaerobic_capacity"]'::jsonb
WHERE slug IN ('rower_intervals', 'assault_bike_intervals') AND NOT (tags ? 'work_capacity');
