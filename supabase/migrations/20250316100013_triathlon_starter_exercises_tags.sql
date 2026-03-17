-- Triathlon: ensure starter_exercises has tags that match
-- SUB_FOCUS_TAG_MAP (triathlon: swim_specific, bike_run_durability, core_stability) so
-- getPreferredExerciseNamesForSportAndGoals ranks triathlon-support exercises first.
-- Evidence: swim (pull, scapular, core), bike/run (posterior chain, single-leg, strength endurance),
-- and core stability support triathlon (see docs/research/triathlon-goal.md).

-- Append triathlon-relevant tags (swim: pull + scapular; bike/run: posterior chain + single-leg; core)
UPDATE public.starter_exercises SET tags = tags || '["pulling_strength","scapular_control","triathlon"]'::jsonb
WHERE slug IN ('neutral_grip_pullup','lat_pulldown','scapular_pullup','face_pull')
  AND NOT (tags ? 'triathlon');
UPDATE public.starter_exercises SET tags = tags || '["posterior_chain","single_leg_strength","triathlon"]'::jsonb
WHERE slug IN ('back_squat','trap_bar_deadlift','romanian_deadlift','single_leg_rdl','hip_thrust','bulgarian_split_squat','step_up')
  AND NOT (tags ? 'triathlon');
UPDATE public.starter_exercises SET tags = tags || '["core_stability","triathlon"]'::jsonb
WHERE slug IN ('dead_bug','side_plank','cable_pallof_press')
  AND NOT (tags ? 'triathlon');
UPDATE public.starter_exercises SET tags = tags || '["zone2_cardio","aerobic_base","triathlon"]'::jsonb
WHERE slug IN ('rower_intervals','assault_bike_intervals','treadmill_incline_walk')
  AND NOT (tags ? 'triathlon');
