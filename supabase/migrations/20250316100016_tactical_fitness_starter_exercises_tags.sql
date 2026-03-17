-- Tactical fitness: append tags so SUB_FOCUS_TAG_MAP ranks tactical-support exercises.
-- See docs/research/tactical-fitness-goal.md.

UPDATE public.starter_exercises SET tags = tags || '["work_capacity","zone3_cardio","tactical_fitness"]'::jsonb
WHERE slug IN ('rower_intervals','assault_bike_intervals','burpee')
  AND NOT (tags ? 'tactical_fitness');
UPDATE public.starter_exercises SET tags = tags || '["zone2_cardio","aerobic_base","tactical_fitness"]'::jsonb
WHERE slug IN ('rower_intervals','assault_bike_intervals','treadmill_incline_walk','incline_treadmill_walk')
  AND NOT (tags ? 'tactical_fitness');
UPDATE public.starter_exercises SET tags = tags || '["strength_endurance","carry","tactical_fitness"]'::jsonb
WHERE slug IN ('farmer_carry','suitcase_carry')
  AND NOT (tags ? 'tactical_fitness');
UPDATE public.starter_exercises SET tags = tags || '["core_stability","core_bracing","tactical_fitness"]'::jsonb
WHERE slug IN ('dead_bug','side_plank','plank','cable_pallof_press')
  AND NOT (tags ? 'tactical_fitness');
