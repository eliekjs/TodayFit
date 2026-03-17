-- Sport/Lead climbing (rock_sport_lead): add starter_exercises tags so getPreferredExerciseNamesForSportAndGoals
-- ranks sport/lead-relevant exercises first (pull, finger/grip, lockoff, core, shoulder, power).
-- sport_tag_profile: strength_endurance, grip, pulling, forearms, aerobic_support, anaerobic_repeats, pacing.
-- Research-backed (20250310100000): pullup, chinup, lat_pulldown, face_pull, band_pullapart, ytw, rower.

-- Pull strength (vertical/horizontal pull)
UPDATE public.starter_exercises SET tags = tags || '["pulling_strength","vertical_pull","lats"]'::jsonb
WHERE slug IN ('pullup', 'neutral_grip_pullup', 'lat_pulldown') AND NOT (tags ? 'pulling_strength');
UPDATE public.starter_exercises SET tags = tags || '["pulling_strength","horizontal_pull","lats"]'::jsonb
WHERE slug IN ('barbell_row', 'chest_supported_row', 'one_arm_cable_row') AND NOT (tags ? 'pulling_strength');

-- Core tension (anti-extension, stability on the wall)
UPDATE public.starter_exercises SET tags = tags || '["core_anti_extension","core_stability"]'::jsonb
WHERE slug IN ('plank', 'dead_bug', 'cable_pallof_press') AND NOT (tags ? 'core_anti_extension');

-- Shoulder stability (scapular control for sustained climbing)
UPDATE public.starter_exercises SET tags = tags || '["shoulder_stability","scapular_control"]'::jsonb
WHERE slug IN ('face_pull', 'band_pullapart') AND NOT (tags ? 'shoulder_stability');

-- Grip (forearm/finger support)
UPDATE public.starter_exercises SET tags = tags || '["grip"]'::jsonb
WHERE slug IN ('pullup', 'neutral_grip_pullup', 'farmer_carry') AND NOT (tags ? 'grip');

-- Aerobic/conditioning support (route endurance; rower in research-backed list)
UPDATE public.starter_exercises SET tags = tags || '["aerobic_base","strength_endurance"]'::jsonb
WHERE slug = 'rower_intervals' AND NOT (tags ? 'strength_endurance');
