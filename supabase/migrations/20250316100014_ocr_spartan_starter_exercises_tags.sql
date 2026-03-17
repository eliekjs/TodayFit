-- Spartan / OCR: append tags so SUB_FOCUS_TAG_MAP ranks OCR-support exercises.
-- See docs/research/ocr-spartan-goal.md.

UPDATE public.starter_exercises SET tags = tags || '["work_capacity","zone3_cardio","ocr_spartan"]'::jsonb
WHERE slug IN ('rower_intervals','assault_bike_intervals','burpee') AND NOT (tags ? 'ocr_spartan');
UPDATE public.starter_exercises SET tags = tags || '["zone2_cardio","aerobic_base","ocr_spartan"]'::jsonb
WHERE slug IN ('rower_intervals','assault_bike_intervals','treadmill_incline_walk','incline_treadmill_walk') AND NOT (tags ? 'ocr_spartan');
UPDATE public.starter_exercises SET tags = tags || '["grip_endurance","grip","carry","ocr_spartan"]'::jsonb
WHERE slug IN ('farmer_carry','suitcase_carry') AND NOT (tags ? 'ocr_spartan');
UPDATE public.starter_exercises SET tags = tags || '["squat_pattern","lunge_pattern","glute_strength","ocr_spartan"]'::jsonb
WHERE slug IN ('back_squat','reverse_lunge','step_up','romanian_deadlift','trap_bar_deadlift') AND NOT (tags ? 'ocr_spartan');
UPDATE public.starter_exercises SET tags = tags || '["core_stability","core_bracing","ocr_spartan"]'::jsonb
WHERE slug IN ('dead_bug','side_plank','plank','cable_pallof_press') AND NOT (tags ? 'ocr_spartan');
