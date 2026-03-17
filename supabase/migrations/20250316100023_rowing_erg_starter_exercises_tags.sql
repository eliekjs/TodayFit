-- Rowing / erg: append tags to starter_exercises so SUB_FOCUS_TAG_MAP
-- (rowing_erg: aerobic_base, threshold, posterior_chain, core_bracing, grip_endurance)
-- ranks rowing-support exercises. Evidence: leg drive + posterior chain + core + pull;
-- see docs/research/rowing-erg-goal.md.

UPDATE public.starter_exercises SET tags = tags || '["zone2_cardio","aerobic_base","rowing_erg"]'::jsonb
WHERE slug IN ('rower_intervals','rower_intervals_30_30','rower_steady','assault_bike_intervals')
  AND NOT (tags ? 'rowing_erg');
UPDATE public.starter_exercises SET tags = tags || '["posterior_chain","hinge_pattern","glute_strength","rowing_erg"]'::jsonb
WHERE slug IN ('romanian_deadlift','trap_bar_deadlift','hip_thrust','back_squat','single_leg_rdl')
  AND NOT (tags ? 'rowing_erg');
UPDATE public.starter_exercises SET tags = tags || '["core_bracing","core_anti_extension","rowing_erg"]'::jsonb
WHERE slug IN ('dead_bug','side_plank','plank','cable_pallof_press')
  AND NOT (tags ? 'rowing_erg');
UPDATE public.starter_exercises SET tags = tags || '["grip_endurance","grip","rowing_erg"]'::jsonb
WHERE slug IN ('farmer_carry','chest_supported_row','one_arm_cable_row')
  AND NOT (tags ? 'rowing_erg');
