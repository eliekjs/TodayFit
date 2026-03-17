-- Road running: ensure starter_exercises has tags that match
-- SUB_FOCUS_TAG_MAP (road_running: running_economy, leg_resilience) so
-- getPreferredExerciseNamesForSportAndGoals ranks running-support exercises first.
-- Evidence: strength training (single-leg, glutes, core, eccentric, knee/calves) supports
-- running economy and injury resilience (see docs/research/road-running-goal.md).

-- Append road-running-relevant tags to existing starter_exercises (running economy + leg resilience)
UPDATE public.starter_exercises SET tags = tags || '["single_leg_strength","glute_strength","running"]'::jsonb
WHERE slug IN ('back_squat','trap_bar_deadlift','romanian_deadlift','bulgarian_split_squat','step_up','single_leg_rdl','reverse_lunge','hip_thrust')
  AND NOT (tags ? 'single_leg_strength');
UPDATE public.starter_exercises SET tags = tags || '["running"]'::jsonb
WHERE slug IN ('dead_bug','side_plank','cable_pallof_press')
  AND NOT (tags ? 'running');
UPDATE public.starter_exercises SET tags = tags || '["eccentric_quad_strength","knee_stability","running"]'::jsonb
WHERE slug IN ('bulgarian_split_squat','reverse_lunge','single_leg_rdl')
  AND NOT (tags ? 'eccentric_quad_strength');
UPDATE public.starter_exercises SET tags = tags || '["calves","ankle_stability","running"]'::jsonb
WHERE slug IN ('standing_calf_raise','tibialis_raise')
  AND NOT (tags ? 'ankle_stability');
UPDATE public.starter_exercises SET tags = tags || '["zone2_cardio","aerobic_base","running"]'::jsonb
WHERE slug = 'treadmill_incline_walk' AND NOT (tags ? 'aerobic_base');
