-- Ice climbing: append sport tag so SUB_FOCUS_TAG_MAP ranking applies when user selects ice_climbing.
-- Existing 20250316100021 adds pulling_strength, shoulder_stability, core, grip tags; this adds ice_climbing.
-- See docs/research/ice-climbing-goal.md.

UPDATE public.starter_exercises SET tags = tags || '["ice_climbing"]'::jsonb
WHERE slug IN ('pullup','neutral_grip_pullup','lat_pulldown','face_pull','band_pullapart','landmine_press','plank','dead_bug','cable_pallof_press','farmer_carry')
  AND NOT (tags ? 'ice_climbing');
