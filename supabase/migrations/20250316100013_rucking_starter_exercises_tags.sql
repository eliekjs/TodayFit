-- Rucking: append tags to starter_exercises so SUB_FOCUS_TAG_MAP
-- (rucking: aerobic_base, load_carriage_durability, leg_strength, core_stability, ankle_stability)
-- ranks rucking-support exercises. Evidence: load carriage, aerobic base, posterior chain, core, carries;
-- see docs/research/rucking-goal.md.

UPDATE public.starter_exercises SET tags = tags || '["single_leg_strength","glute_strength","squat_pattern","rucking"]'::jsonb
WHERE slug IN ('back_squat','step_up','box_step_up','goblet_squat','single_leg_rdl','reverse_lunge','bulgarian_split_squat','hip_thrust')
  AND NOT (tags ? 'rucking');
UPDATE public.starter_exercises SET tags = tags || '["strength_endurance","carry","rucking"]'::jsonb
WHERE slug IN ('farmer_carry','suitcase_carry')
  AND NOT (tags ? 'rucking');
UPDATE public.starter_exercises SET tags = tags || '["zone2_cardio","aerobic_base","rucking"]'::jsonb
WHERE slug IN ('incline_treadmill_walk','treadmill_incline_walk','assault_bike_intervals')
  AND NOT (tags ? 'rucking');
UPDATE public.starter_exercises SET tags = tags || '["ankle_stability","balance","rucking"]'::jsonb
WHERE slug IN ('standing_calf_raise','single_leg_rdl','reverse_lunge')
  AND NOT (tags ? 'rucking');
