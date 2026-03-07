-- Exercise progressions/regressions: fix goblet/leg_press direction and add bands/face pull + spine mobility.
-- Run after 20250308000000_exercise_progressions.sql. Aligns DB with data/exercises.ts and common progressions (ACE/NASM).

-- Fix: goblet_squat -> leg_press_machine should be regression (leg press is easier), not progression.
DELETE FROM public.exercise_progressions
WHERE exercise_id = (SELECT id FROM public.exercises WHERE slug = 'goblet_squat')
  AND related_exercise_id = (SELECT id FROM public.exercises WHERE slug = 'leg_press_machine')
  AND relationship = 'progression';

-- Fix: leg_press_machine -> goblet_squat should be progression (goblet is harder), not regression.
DELETE FROM public.exercise_progressions
WHERE exercise_id = (SELECT id FROM public.exercises WHERE slug = 'leg_press_machine')
  AND related_exercise_id = (SELECT id FROM public.exercises WHERE slug = 'goblet_squat')
  AND relationship = 'regression';

-- Insert corrected goblet <-> leg_press
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'goblet_squat' AND e2.slug = 'leg_press_machine'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'leg_press_machine' AND e2.slug = 'goblet_squat'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

-- Band pull-apart -> face pull (progression); face pull -> band pull-apart (regression)
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'band_pullapart' AND e2.slug = 'face_pull'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'face_pull' AND e2.slug = 'band_pullapart'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

-- Cat-camel -> t-spine rotation (progression); t-spine rotation -> cat-camel (regression)
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'cat_camel' AND e2.slug = 't_spine_rotation'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 't_spine_rotation' AND e2.slug = 'cat_camel'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
