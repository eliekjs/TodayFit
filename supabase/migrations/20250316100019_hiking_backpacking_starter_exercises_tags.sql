-- Hiking / backpacking: append tags to starter_exercises so SUB_FOCUS_TAG_MAP
-- (hiking_backpacking: uphill_endurance, leg_strength, load_carriage_durability, ankle_stability)
-- ranks hiking-support exercises. Evidence: progressive load carriage + aerobic + resistance;
-- squat variations, single-leg, carries (see docs/research/hiking-backpacking-goal.md).

UPDATE public.starter_exercises SET tags = tags || '["single_leg_strength","glute_strength","squat_pattern","hiking_backpacking"]'::jsonb
WHERE slug IN ('back_squat','step_up','box_step_up','goblet_squat','single_leg_rdl','reverse_lunge','bulgarian_split_squat','hip_thrust')
  AND NOT (tags ? 'hiking_backpacking');
UPDATE public.starter_exercises SET tags = tags || '["strength_endurance","carry","hiking_backpacking"]'::jsonb
WHERE slug IN ('farmer_carry','suitcase_carry')
  AND NOT (tags ? 'hiking_backpacking');
UPDATE public.starter_exercises SET tags = tags || '["zone2_cardio","aerobic_base","hiking_backpacking"]'::jsonb
WHERE slug IN ('incline_treadmill_walk','treadmill_incline_walk','assault_bike_intervals')
  AND NOT (tags ? 'hiking_backpacking');
UPDATE public.starter_exercises SET tags = tags || '["ankle_stability","balance","hiking_backpacking"]'::jsonb
WHERE slug IN ('standing_calf_raise','single_leg_rdl','reverse_lunge')
  AND NOT (tags ? 'hiking_backpacking');
