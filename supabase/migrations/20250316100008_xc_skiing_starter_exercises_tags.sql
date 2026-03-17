-- XC (Nordic) skiing: append tags to starter_exercises for double_pole_upper, leg_drive, core_stability.
-- See docs/research/xc-skiing-nordic-goal.md.

UPDATE public.starter_exercises SET tags = tags || '["pulling_strength","xc_skiing"]'::jsonb
WHERE slug IN ('neutral_grip_pullup','lat_pulldown','chest_supported_row','one_arm_cable_row')
  AND NOT (tags ? 'xc_skiing');
UPDATE public.starter_exercises SET tags = tags || '["single_leg_strength","glute_strength","posterior_chain","xc_skiing"]'::jsonb
WHERE slug IN ('back_squat','step_up','single_leg_rdl','reverse_lunge','bulgarian_split_squat','hip_thrust','romanian_deadlift','trap_bar_deadlift')
  AND NOT (tags ? 'xc_skiing');
UPDATE public.starter_exercises SET tags = tags || '["core_stability","core_anti_extension","xc_skiing"]'::jsonb
WHERE slug IN ('dead_bug','side_plank','cable_pallof_press')
  AND NOT (tags ? 'xc_skiing');
UPDATE public.starter_exercises SET tags = tags || '["zone2_cardio","aerobic_base","xc_skiing"]'::jsonb
WHERE slug IN ('rower_intervals','assault_bike_intervals','treadmill_incline_walk')
  AND NOT (tags ? 'xc_skiing');
