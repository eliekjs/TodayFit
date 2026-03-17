-- Swimming (lap / open water): ensure starter_exercises has tags that match
-- SUB_FOCUS_TAG_MAP (swimming_open_water: pull_strength, shoulder_scapular, core_stability) so
-- getPreferredExerciseNamesForSportAndGoals ranks swim-support exercises first.
-- Evidence: dryland pull strength, scapular/shoulder stability, and core transfer to swimming
-- (see docs/research/swimming-open-water-goal.md).

-- Append swimming-relevant tags to existing starter_exercises (pull, shoulder/scapular, core)
UPDATE public.starter_exercises SET tags = tags || '["pulling_strength","vertical_pull","swimming"]'::jsonb
WHERE slug IN ('neutral_grip_pullup','lat_pulldown')
  AND NOT (tags ? 'pulling_strength');
UPDATE public.starter_exercises SET tags = tags || '["pulling_strength","horizontal_pull","swimming"]'::jsonb
WHERE slug IN ('chest_supported_row','one_arm_cable_row')
  AND NOT (tags ? 'pulling_strength');
UPDATE public.starter_exercises SET tags = tags || '["scapular_control","shoulder_stability","swimming"]'::jsonb
WHERE slug IN ('scapular_pullup','face_pull','external_rotation_band')
  AND NOT (tags ? 'scapular_control');
UPDATE public.starter_exercises SET tags = tags || '["core_stability","core_anti_extension","swimming"]'::jsonb
WHERE slug IN ('dead_bug','side_plank','cable_pallof_press')
  AND NOT (tags ? 'swimming');
UPDATE public.starter_exercises SET tags = tags || '["swimming"]'::jsonb
WHERE slug IN ('pushup_incline','landmine_press')
  AND NOT (tags ? 'swimming');
