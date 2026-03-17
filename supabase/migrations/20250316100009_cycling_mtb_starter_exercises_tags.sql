-- Cycling (mountain): append tags to starter_exercises so SUB_FOCUS_TAG_MAP
-- (cycling_mtb: leg_strength, core_stability, power_endurance, aerobic_base)
-- ranks MTB-support exercises. Evidence: single-leg, posterior chain, core
-- anti-movement support trail riding and handling (see docs/research/cycling-mountain-goal.md).

UPDATE public.starter_exercises SET tags = tags || '["glute_strength","single_leg_strength","cycling_mtb"]'::jsonb
WHERE slug IN ('back_squat','trap_bar_deadlift','romanian_deadlift','bulgarian_split_squat','step_up','single_leg_rdl','reverse_lunge','hip_thrust','lateral_lunge')
  AND NOT (tags ? 'cycling_mtb');
UPDATE public.starter_exercises SET tags = tags || '["core_stability","core_anti_rotation","cycling_mtb"]'::jsonb
WHERE slug IN ('dead_bug','side_plank','cable_pallof_press')
  AND NOT (tags ? 'cycling_mtb');
UPDATE public.starter_exercises SET tags = tags || '["zone2_cardio","aerobic_base","cycling_mtb"]'::jsonb
WHERE slug IN ('assault_bike_intervals','rower_intervals','treadmill_incline_walk')
  AND NOT (tags ? 'cycling_mtb');
