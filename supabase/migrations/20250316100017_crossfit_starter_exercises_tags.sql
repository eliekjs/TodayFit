-- CrossFit: append tags so SUB_FOCUS_TAG_MAP ranks CrossFit-support exercises.
-- See docs/research/crossfit-goal.md.

UPDATE public.starter_exercises SET tags = tags || '["work_capacity","conditioning","crossfit"]'::jsonb
WHERE slug IN ('rower_intervals','assault_bike_intervals','burpee')
  AND NOT (tags ? 'crossfit');
UPDATE public.starter_exercises SET tags = tags || '["aerobic_base","zone3_cardio","crossfit"]'::jsonb
WHERE slug IN ('rower_intervals','assault_bike_intervals','treadmill_incline_walk','incline_treadmill_walk')
  AND NOT (tags ? 'crossfit');
UPDATE public.starter_exercises SET tags = tags || '["max_strength","squat_pattern","hinge_pattern","crossfit"]'::jsonb
WHERE slug IN ('back_squat','romanian_deadlift','trap_bar_deadlift','front_squat','overhead_squat')
  AND NOT (tags ? 'crossfit');
UPDATE public.starter_exercises SET tags = tags || '["explosive_power","plyometric","crossfit"]'::jsonb
WHERE slug IN ('box_jump','jump_squat','burpee')
  AND NOT (tags ? 'crossfit');
UPDATE public.starter_exercises SET tags = tags || '["core_stability","bodyweight","crossfit"]'::jsonb
WHERE slug IN ('dead_bug','side_plank','plank','pullup','push_up','handstand_push_up')
  AND NOT (tags ? 'crossfit');
