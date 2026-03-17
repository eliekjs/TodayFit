-- Strongman: append tags so SUB_FOCUS_TAG_MAP ranks strongman-support exercises.
-- DB tags (20250301000008): strength, power, carries, odd_object, grip, trunk, work_capacity, posterior_chain.
-- See docs/research/strongman-goal.md.

UPDATE public.starter_exercises SET tags = tags || '["work_capacity","posterior_chain","core_bracing","grip_strength","strongman"]'::jsonb
WHERE slug IN ('farmer_carry','suitcase_carry')
  AND NOT (tags ? 'strongman');
UPDATE public.starter_exercises SET tags = tags || '["max_strength","vertical_push","strongman"]'::jsonb
WHERE slug = 'landmine_press' AND NOT (tags ? 'strongman');
UPDATE public.starter_exercises SET tags = tags || '["max_strength","hinge_pattern","posterior_chain","strongman"]'::jsonb
WHERE slug IN ('back_squat','front_squat','romanian_deadlift','trap_bar_deadlift')
  AND NOT (tags ? 'strongman');
UPDATE public.starter_exercises SET tags = tags || '["core_bracing","core_stability","strongman"]'::jsonb
WHERE slug IN ('dead_bug','side_plank','plank','cable_pallof_press')
  AND NOT (tags ? 'strongman');
UPDATE public.starter_exercises SET tags = tags || '["work_capacity","conditioning","strongman"]'::jsonb
WHERE slug IN ('rower_intervals','assault_bike_intervals','sled_push','kettlebell_swing')
  AND NOT (tags ? 'strongman');
