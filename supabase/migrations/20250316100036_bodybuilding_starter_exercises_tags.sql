-- Bodybuilding: append tags so SUB_FOCUS_TAG_MAP ranks physique/hypertrophy exercises.
-- See docs/research/bodybuilding-goal.md.

UPDATE public.starter_exercises SET tags = tags || '["hypertrophy","horizontal_push","bodybuilding"]'::jsonb
WHERE slug IN ('barbell_bench_press','dumbbell_bench_press','push_up')
  AND NOT (tags ? 'bodybuilding');
UPDATE public.starter_exercises SET tags = tags || '["hypertrophy","pulling_strength","vertical_pull","bodybuilding"]'::jsonb
WHERE slug IN ('lat_pulldown','neutral_grip_pullup','chest_supported_row','one_arm_cable_row')
  AND NOT (tags ? 'bodybuilding');
UPDATE public.starter_exercises SET tags = tags || '["hypertrophy","squat_pattern","hinge_pattern","bodybuilding"]'::jsonb
WHERE slug IN ('back_squat','front_squat','romanian_deadlift','trap_bar_deadlift','bulgarian_split_squat','hip_thrust')
  AND NOT (tags ? 'bodybuilding');
UPDATE public.starter_exercises SET tags = tags || '["hypertrophy","core_anti_extension","bodybuilding"]'::jsonb
WHERE slug IN ('dead_bug','plank','side_plank','cable_pallof_press')
  AND NOT (tags ? 'bodybuilding');
