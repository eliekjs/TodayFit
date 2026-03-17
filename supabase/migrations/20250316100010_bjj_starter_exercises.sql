-- Brazilian Jiu-Jitsu: add starter_exercises so getPreferredExerciseNamesForSportAndGoals
-- ranks BJJ-relevant exercises first (grip, hip stability, core, pull, work capacity).
-- sport_tag_profile: grappling, isometric, strength_endurance, mobility, hips, grip, anaerobic_repeats.
-- Research-backed (20250310100000): barbell_deadlift, rdl_dumbbell, barbell_back_squat, pullup, barbell_row, bench_press_barbell, push_up, kb_swing, farmer_carry.

-- Append BJJ-relevant tags to existing starter_exercises (grip, hip, core, pull, work capacity)
UPDATE public.starter_exercises SET tags = tags || '["grip","grip_endurance","carry"]'::jsonb
WHERE slug = 'farmer_carry' AND NOT (tags ? 'grip_endurance');
UPDATE public.starter_exercises SET tags = tags || '["hinge_pattern","posterior_chain","work_capacity"]'::jsonb
WHERE slug IN ('trap_bar_deadlift', 'romanian_deadlift', 'kettlebell_swing') AND NOT (tags ? 'posterior_chain');
UPDATE public.starter_exercises SET tags = tags || '["pulling_strength","vertical_pull","horizontal_pull","grip"]'::jsonb
WHERE slug IN ('neutral_grip_pullup', 'pullup', 'lat_pulldown', 'chest_supported_row', 'one_arm_cable_row') AND NOT (tags ? 'pulling_strength');
UPDATE public.starter_exercises SET tags = tags || '["core_stability","core_anti_extension","core_tension"]'::jsonb
WHERE slug IN ('dead_bug', 'side_plank', 'cable_pallof_press') AND NOT (tags ? 'core_tension');
UPDATE public.starter_exercises SET tags = tags || '["hip_stability","hips","single_leg_strength"]'::jsonb
WHERE slug IN ('single_leg_rdl', 'bulgarian_split_squat', 'reverse_lunge') AND NOT (tags ? 'hip_stability');
UPDATE public.starter_exercises SET tags = tags || '["work_capacity","anaerobic_capacity"]'::jsonb
WHERE slug IN ('rower_intervals', 'assault_bike_intervals') AND NOT (tags ? 'work_capacity');
