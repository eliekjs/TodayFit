-- Trad climbing (rock_trad): add starter_exercises tags so getPreferredExerciseNamesForSportAndGoals
-- ranks trad-relevant exercises first (pull, grip, lockoff, core, shoulder, trunk endurance).
-- sport_tag_profile: endurance, grip, pulling, durability, aerobic_support.
-- Research-backed (20250310100000): pullup (shared with rock_bouldering, rock_sport_lead).

-- Pull strength (vertical/horizontal pull)
UPDATE public.starter_exercises SET tags = tags || '["pulling_strength","vertical_pull","lats"]'::jsonb
WHERE slug IN ('pullup', 'neutral_grip_pullup', 'lat_pulldown') AND NOT (tags ? 'pulling_strength');
UPDATE public.starter_exercises SET tags = tags || '["pulling_strength","horizontal_pull","lats"]'::jsonb
WHERE slug IN ('barbell_row', 'chest_supported_row', 'one_arm_cable_row') AND NOT (tags ? 'pulling_strength');

-- Core tension and trunk endurance (sustained positions on long pitches)
UPDATE public.starter_exercises SET tags = tags || '["core_anti_extension","core_stability"]'::jsonb
WHERE slug IN ('plank', 'dead_bug', 'cable_pallof_press') AND NOT (tags ? 'core_anti_extension');

-- Shoulder stability (scapular control)
UPDATE public.starter_exercises SET tags = tags || '["shoulder_stability","scapular_control"]'::jsonb
WHERE slug IN ('face_pull', 'band_pullapart') AND NOT (tags ? 'shoulder_stability');

-- Grip (finger/forearm for gear and holds)
UPDATE public.starter_exercises SET tags = tags || '["grip"]'::jsonb
WHERE slug IN ('pullup', 'neutral_grip_pullup', 'farmer_carry') AND NOT (tags ? 'grip');

-- Trunk endurance / aerobic support (multi-pitch, long routes)
UPDATE public.starter_exercises SET tags = tags || '["strength_endurance","aerobic_base"]'::jsonb
WHERE slug IN ('rower_intervals', 'plank') AND NOT (tags ? 'strength_endurance');
