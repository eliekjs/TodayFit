-- Marathon running: add starter_exercises tags so getPreferredExerciseNamesForSportAndGoals
-- ranks marathon-relevant exercises first (aerobic base, threshold, marathon pace, durability, leg resilience).
-- Aligns with road running; marathon emphasizes aerobic base, durability, and leg resilience.

-- Aerobic base (zone2, long runs)
UPDATE public.starter_exercises SET tags = tags || '["zone2_cardio","aerobic_base"]'::jsonb
WHERE slug = 'treadmill_incline_walk' AND NOT (tags ? 'zone2_cardio');

-- Leg resilience (eccentric, knee, calves)
UPDATE public.starter_exercises SET tags = tags || '["eccentric_quad_strength","knee_stability","single_leg_strength"]'::jsonb
WHERE slug IN ('bulgarian_split_squat', 'reverse_lunge', 'single_leg_rdl') AND NOT (tags ? 'eccentric_quad_strength');
UPDATE public.starter_exercises SET tags = tags || '["calves","ankle_stability"]'::jsonb
WHERE slug IN ('standing_calf_raise', 'tibialis_raise') AND NOT (tags ? 'ankle_stability');

-- Durability (strength endurance, core)
UPDATE public.starter_exercises SET tags = tags || '["strength_endurance","core_stability"]'::jsonb
WHERE slug IN ('dead_bug', 'side_plank', 'cable_pallof_press') AND NOT (tags ? 'strength_endurance');

-- Glute / posterior chain (running economy)
UPDATE public.starter_exercises SET tags = tags || '["glute_strength","single_leg_strength"]'::jsonb
WHERE slug IN ('back_squat', 'romanian_deadlift', 'bulgarian_split_squat', 'single_leg_rdl', 'reverse_lunge', 'hip_thrust') AND NOT (tags ? 'glute_strength');
