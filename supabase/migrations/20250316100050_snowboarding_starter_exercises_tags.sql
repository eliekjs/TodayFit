-- Snowboarding: append tags so SUB_FOCUS_TAG_MAP ranks board-support exercises.
-- Sub-focuses: leg_strength, core_stability, balance, lateral_stability, knee_resilience.
-- DB (20250301000008): eccentric_load, legs, trunk, balance, lateral_stability, knee_load, ankle_load, durability.
-- Research-backed (20250310100000): goblet_squat, split_squat, lateral_lunge, single_leg_rdl, plank, side_plank.
-- See docs/research/snowboarding-goal.md.

UPDATE public.starter_exercises SET tags = tags || '["eccentric_quad_strength","glute_strength","single_leg_strength","snowboarding"]'::jsonb
WHERE slug IN ('back_squat','step_up','bulgarian_split_squat','reverse_lunge','single_leg_rdl','goblet_squat')
  AND NOT (tags ? 'snowboarding');
UPDATE public.starter_exercises SET tags = tags || '["core_anti_rotation","core_stability","snowboarding"]'::jsonb
WHERE slug IN ('dead_bug','side_plank','plank','cable_pallof_press')
  AND NOT (tags ? 'snowboarding');
UPDATE public.starter_exercises SET tags = tags || '["balance","knee_stability","snowboarding"]'::jsonb
WHERE slug IN ('bulgarian_split_squat','reverse_lunge','single_leg_rdl','standing_calf_raise')
  AND NOT (tags ? 'snowboarding');
UPDATE public.starter_exercises SET tags = tags || '["core_anti_rotation","hip_stability","snowboarding"]'::jsonb
WHERE slug = 'lateral_lunge' AND NOT (tags ? 'snowboarding');
