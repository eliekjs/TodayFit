-- Hyrox: append tags to starter_exercises so SUB_FOCUS_TAG_MAP
-- (hyrox: work_capacity, running_endurance, lower_body_power, grip_endurance, core_stability)
-- ranks Hyrox-support exercises. Evidence: run + stations (row, sled, burpees, carry);
-- aerobic base, strength under fatigue, full-body (see docs/research/hyrox-goal.md).

UPDATE public.starter_exercises SET tags = tags || '["work_capacity","zone3_cardio","hyrox"]'::jsonb
WHERE slug IN ('rower_intervals','assault_bike_intervals','burpee')
  AND NOT (tags ? 'hyrox');
UPDATE public.starter_exercises SET tags = tags || '["zone2_cardio","aerobic_base","hyrox"]'::jsonb
WHERE slug IN ('rower_intervals','assault_bike_intervals','treadmill_incline_walk','incline_treadmill_walk')
  AND NOT (tags ? 'hyrox');
UPDATE public.starter_exercises SET tags = tags || '["squat_pattern","lunge_pattern","hyrox"]'::jsonb
WHERE slug IN ('back_squat','reverse_lunge','step_up','romanian_deadlift','trap_bar_deadlift')
  AND NOT (tags ? 'hyrox');
UPDATE public.starter_exercises SET tags = tags || '["carry","grip","hyrox"]'::jsonb
WHERE slug IN ('farmer_carry','suitcase_carry')
  AND NOT (tags ? 'hyrox');
UPDATE public.starter_exercises SET tags = tags || '["core_stability","core_bracing","hyrox"]'::jsonb
WHERE slug IN ('dead_bug','side_plank','plank','cable_pallof_press')
  AND NOT (tags ? 'hyrox');
