-- Remove "Scapular Push-up" (push up plus) exercise.
-- exercise_tag_map and exercise_contraindications CASCADE on exercise delete.
DELETE FROM public.exercises WHERE slug = 'scapular_push_up';
