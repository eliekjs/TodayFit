-- Remove "Scapular Push-up" / "Push up plus" from the library.
-- exercise_tag_map and exercise_contraindications CASCADE on exercise delete.
DELETE FROM public.exercises
WHERE slug IN ('scapular_push_up', 'push_up_plus')
   OR name ILIKE '%push up plus%'
   OR name ILIKE '%scapular push-up%';
