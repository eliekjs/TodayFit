-- Ice climbing (ice_climbing): add starter_exercises tags so getPreferredExerciseNamesForSportAndGoals
-- ranks ice-climbing-relevant exercises first (grip, pull, shoulder/overhead, core, lockoff).
-- sport_tag_profile: grip, forearms, shoulders, overhead, high_isometric.
-- Research-backed (20250310100000): pullup, face_pull, wrist_curl, plank, oh_press.

-- Pull strength
UPDATE public.starter_exercises SET tags = tags || '["pulling_strength","vertical_pull","lats","grip"]'::jsonb
WHERE slug IN ('pullup', 'neutral_grip_pullup', 'lat_pulldown') AND NOT (tags ? 'pulling_strength');

-- Shoulder stability and overhead (tool placement, overhead lockoffs)
UPDATE public.starter_exercises SET tags = tags || '["shoulder_stability","scapular_control"]'::jsonb
WHERE slug IN ('face_pull', 'band_pullapart') AND NOT (tags ? 'shoulder_stability');
UPDATE public.starter_exercises SET tags = tags || '["vertical_push","shoulder_stability"]'::jsonb
WHERE slug = 'landmine_press' AND NOT (tags ? 'vertical_push');

-- Core tension
UPDATE public.starter_exercises SET tags = tags || '["core_anti_extension","core_stability"]'::jsonb
WHERE slug IN ('plank', 'dead_bug', 'cable_pallof_press') AND NOT (tags ? 'core_anti_extension');

-- Grip / forearm (tool grip, isometric)
UPDATE public.starter_exercises SET tags = tags || '["grip","grip_endurance"]'::jsonb
WHERE slug IN ('pullup', 'neutral_grip_pullup', 'farmer_carry') AND NOT (tags ? 'grip_endurance');
