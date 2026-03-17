-- Powerlifting (general_strength): append tags so SUB_FOCUS_TAG_MAP ranks squat, bench, deadlift, accessory, core.
-- See docs/research/powerlifting-goal.md.

UPDATE public.starter_exercises SET tags = tags || '["max_strength","squat_pattern","general_strength"]'::jsonb
WHERE slug IN ('back_squat','front_squat')
  AND NOT (tags ? 'general_strength');
UPDATE public.starter_exercises SET tags = tags || '["max_strength","hinge_pattern","posterior_chain","general_strength"]'::jsonb
WHERE slug IN ('romanian_deadlift','trap_bar_deadlift')
  AND NOT (tags ? 'general_strength');
UPDATE public.starter_exercises SET tags = tags || '["max_strength","horizontal_push","general_strength"]'::jsonb
WHERE slug IN ('barbell_bench_press','dumbbell_bench_press')
  AND NOT (tags ? 'general_strength');
UPDATE public.starter_exercises SET tags = tags || '["pulling_strength","horizontal_pull","general_strength"]'::jsonb
WHERE slug IN ('chest_supported_row','one_arm_cable_row','lat_pulldown','neutral_grip_pullup')
  AND NOT (tags ? 'general_strength');
UPDATE public.starter_exercises SET tags = tags || '["core_bracing","core_anti_extension","general_strength"]'::jsonb
WHERE slug IN ('dead_bug','plank','side_plank','cable_pallof_press')
  AND NOT (tags ? 'general_strength');
