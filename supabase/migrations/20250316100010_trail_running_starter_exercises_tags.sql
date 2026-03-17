-- Trail running: ensure starter_exercises has tags that match
-- SUB_FOCUS_TAG_MAP (trail_running: uphill_endurance, downhill_control, ankle_stability) so
-- getPreferredExerciseNamesForSportAndGoals ranks trail-support exercises first.
-- Evidence: single-leg strength, glutes, eccentric control, knee and ankle stability support
-- trail running on uneven terrain and descents (see docs/research/trail-running-goal.md).

-- Append trail-running-relevant tags to existing starter_exercises
UPDATE public.starter_exercises SET tags = tags || '["single_leg_strength","glute_strength","trail"]'::jsonb
WHERE slug IN ('back_squat','step_up','single_leg_rdl','reverse_lunge','bulgarian_split_squat','hip_thrust')
  AND NOT (tags ? 'single_leg_strength');
UPDATE public.starter_exercises SET tags = tags || '["eccentric_quad_strength","knee_stability","trail"]'::jsonb
WHERE slug IN ('bulgarian_split_squat','reverse_lunge','single_leg_rdl')
  AND NOT (tags ? 'eccentric_quad_strength');
UPDATE public.starter_exercises SET tags = tags || '["ankle_stability","balance","trail"]'::jsonb
WHERE slug IN ('standing_calf_raise','tibialis_raise','single_leg_rdl')
  AND NOT (tags ? 'ankle_stability');
UPDATE public.starter_exercises SET tags = tags || '["zone2_cardio","aerobic_base","trail"]'::jsonb
WHERE slug = 'treadmill_incline_walk' AND NOT (tags ? 'trail');
