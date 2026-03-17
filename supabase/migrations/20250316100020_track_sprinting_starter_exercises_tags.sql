-- Track sprinting: append tags so SUB_FOCUS_TAG_MAP ranks sprint-support exercises.
-- See docs/research/track-sprinting-goal.md.

UPDATE public.starter_exercises SET tags = tags || '["explosive_power","plyometric","track_sprinting"]'::jsonb
WHERE slug IN ('squat_clean','box_jump','jump_squat','bounding','lateral_bound')
  AND NOT (tags ? 'track_sprinting');
UPDATE public.starter_exercises SET tags = tags || '["max_strength","squat_pattern","track_sprinting"]'::jsonb
WHERE slug IN ('back_squat','front_squat')
  AND NOT (tags ? 'track_sprinting');
UPDATE public.starter_exercises SET tags = tags || '["hinge_pattern","posterior_chain","track_sprinting"]'::jsonb
WHERE slug IN ('romanian_deadlift','trap_bar_deadlift','nordic_curl')
  AND NOT (tags ? 'track_sprinting');
