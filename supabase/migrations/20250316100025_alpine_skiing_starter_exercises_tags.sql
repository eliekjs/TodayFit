-- Alpine (downhill) skiing: append tags so SUB_FOCUS_TAG_MAP ranks ski-support exercises.
-- Sub-focuses: leg_strength, eccentric_control, core_stability, knee_resilience, ankle_stability.
-- DB (20250301000008): eccentric_load, quads, glutes, trunk, lateral_stability, knee_load, ankle_load.
-- Research-backed (20250310100000): goblet_squat, barbell_back_squat, split_squat, bulgarian_split_squat,
-- walking_lunge, lateral_lunge, single_leg_rdl, stepup, box_step_up, plank, side_plank, pallof_hold, dead_bug, etc.
-- See docs/research/alpine-skiing-goal.md.

UPDATE public.starter_exercises SET tags = tags || '["eccentric_quad_strength","glute_strength","single_leg_strength","eccentric_strength","knee_stability","alpine_skiing"]'::jsonb
WHERE slug IN ('back_squat','step_up','bulgarian_split_squat','reverse_lunge','single_leg_rdl','goblet_squat','hip_thrust')
  AND NOT (tags ? 'alpine_skiing');
UPDATE public.starter_exercises SET tags = tags || '["core_anti_rotation","core_stability","alpine_skiing"]'::jsonb
WHERE slug IN ('dead_bug','side_plank','plank','cable_pallof_press')
  AND NOT (tags ? 'alpine_skiing');
UPDATE public.starter_exercises SET tags = tags || '["ankle_stability","balance","alpine_skiing"]'::jsonb
WHERE slug IN ('standing_calf_raise','tibialis_raise')
  AND NOT (tags ? 'alpine_skiing');
