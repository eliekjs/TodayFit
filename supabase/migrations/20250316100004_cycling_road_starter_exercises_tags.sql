-- Cycling (road): ensure starter_exercises has tags that match
-- SUB_FOCUS_TAG_MAP (cycling_road: leg_strength, core_stability) so
-- getPreferredExerciseNamesForSportAndGoals ranks cycling-support exercises first.
-- Evidence: heavy strength training (e.g. half-squats, leg strength) improves cycling economy
-- and performance; core stability supports sustained riding (see docs/research/cycling-road-goal.md).

-- Append cycling-relevant tags to existing starter_exercises (leg strength + core)
UPDATE public.starter_exercises SET tags = tags || '["glute_strength","cycling"]'::jsonb
WHERE slug IN ('back_squat','trap_bar_deadlift','romanian_deadlift','bulgarian_split_squat','step_up','single_leg_rdl','reverse_lunge','hip_thrust')
  AND NOT (tags ? 'glute_strength');
UPDATE public.starter_exercises SET tags = tags || '["core_stability","cycling"]'::jsonb
WHERE slug IN ('dead_bug','side_plank','cable_pallof_press')
  AND NOT (tags ? 'core_stability');
UPDATE public.starter_exercises SET tags = tags || '["zone2_cardio","aerobic_base","cycling"]'::jsonb
WHERE slug = 'assault_bike_intervals' AND NOT (tags ? 'zone2_cardio');
UPDATE public.starter_exercises SET tags = tags || '["cycling"]'::jsonb
WHERE slug = 'treadmill_incline_walk' AND NOT (tags ? 'cycling');
