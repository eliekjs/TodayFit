-- Backcountry skiing / ski touring: append tags so SUB_FOCUS_TAG_MAP ranks tour-support exercises.
-- Sub-focuses: uphill_endurance, leg_strength, downhill_stability, core_stability, knee_resilience.
-- DB (20250301000008): aerobic, uphill, eccentric_load, quads, glutes, trunk, knee_load, durability.
-- Research-backed (20250310100000): goblet_squat, stepup, box_step_up, incline_treadmill_walk, stair_climber.
-- See docs/research/backcountry-skiing-goal.md.

UPDATE public.starter_exercises SET tags = tags || '["zone2_cardio","aerobic_base","backcountry_skiing"]'::jsonb
WHERE slug IN ('treadmill_incline_walk','rower_intervals','assault_bike_intervals')
  AND NOT (tags ? 'backcountry_skiing');
UPDATE public.starter_exercises SET tags = tags || '["single_leg_strength","eccentric_quad_strength","glute_strength","knee_stability","backcountry_skiing"]'::jsonb
WHERE slug IN ('back_squat','step_up','box_step_up','bulgarian_split_squat','reverse_lunge','single_leg_rdl','goblet_squat','hip_thrust')
  AND NOT (tags ? 'backcountry_skiing');
UPDATE public.starter_exercises SET tags = tags || '["core_anti_rotation","core_stability","backcountry_skiing"]'::jsonb
WHERE slug IN ('dead_bug','side_plank','plank','cable_pallof_press')
  AND NOT (tags ? 'backcountry_skiing');
