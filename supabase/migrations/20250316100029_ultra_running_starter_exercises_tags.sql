-- Ultra running: append tags so SUB_FOCUS_TAG_MAP ranks ultra-support exercises.
-- See docs/research/ultra-running-goal.md.

UPDATE public.starter_exercises SET tags = tags || '["zone2_cardio","aerobic_base","ultra_running"]'::jsonb
WHERE slug IN ('treadmill_incline_walk','incline_treadmill_walk','assault_bike_intervals','rower_intervals')
  AND NOT (tags ? 'ultra_running');
UPDATE public.starter_exercises SET tags = tags || '["strength_endurance","single_leg_strength","posterior_chain","ultra_running"]'::jsonb
WHERE slug IN ('back_squat','step_up','single_leg_rdl','reverse_lunge','bulgarian_split_squat','hip_thrust')
  AND NOT (tags ? 'ultra_running');
UPDATE public.starter_exercises SET tags = tags || '["eccentric_quad_strength","knee_stability","calves","ultra_running"]'::jsonb
WHERE slug IN ('bulgarian_split_squat','reverse_lunge','single_leg_rdl','standing_calf_raise')
  AND NOT (tags ? 'ultra_running');
UPDATE public.starter_exercises SET tags = tags || '["core_stability","core_anti_extension","ultra_running"]'::jsonb
WHERE slug IN ('dead_bug','side_plank','plank','cable_pallof_press')
  AND NOT (tags ? 'ultra_running');
