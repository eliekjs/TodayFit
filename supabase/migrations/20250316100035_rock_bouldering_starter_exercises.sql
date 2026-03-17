-- Bouldering (rock_bouldering): add starter_exercises tags so getPreferredExerciseNamesForSportAndGoals
-- ranks bouldering-relevant exercises first (pull, finger/grip, lockoff, core, shoulder, power).
-- sport_tag_profile: bouldering, power, strength, finger_strength, grip, pulling, shoulder_stability.
-- Research-backed (20250310100000): pullup, chinup, lat_pulldown, db_row, barbell_row, cable_row,
-- barbell_deadlift, rdl_dumbbell, plank, dead_bug, pallof_hold, face_pull, band_pullapart, ytw, wrist_curl.

-- Pull strength (vertical/horizontal pull)
UPDATE public.starter_exercises SET tags = tags || '["pulling_strength","vertical_pull","lats"]'::jsonb
WHERE slug IN ('pullup', 'neutral_grip_pullup', 'lat_pulldown') AND NOT (tags ? 'pulling_strength');
UPDATE public.starter_exercises SET tags = tags || '["pulling_strength","horizontal_pull","lats"]'::jsonb
WHERE slug IN ('barbell_row', 'chest_supported_row', 'one_arm_cable_row') AND NOT (tags ? 'pulling_strength');

-- Core tension (anti-extension, stability)
UPDATE public.starter_exercises SET tags = tags || '["core_anti_extension","core_stability"]'::jsonb
WHERE slug IN ('plank', 'dead_bug', 'cable_pallof_press') AND NOT (tags ? 'core_anti_extension');

-- Shoulder stability (scapular control)
UPDATE public.starter_exercises SET tags = tags || '["shoulder_stability","scapular_control"]'::jsonb
WHERE slug IN ('face_pull', 'band_pullapart') AND NOT (tags ? 'shoulder_stability');

-- Grip (finger/forearm support)
UPDATE public.starter_exercises SET tags = tags || '["grip"]'::jsonb
WHERE slug IN ('pullup', 'neutral_grip_pullup', 'farmer_carry') AND NOT (tags ? 'grip');
