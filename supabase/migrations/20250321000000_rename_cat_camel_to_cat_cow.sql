-- Rename exercise display name: Cat-Camel → Cat Cow (correct name for the mobility drill).
UPDATE public.exercises
SET name = 'Cat Cow'
WHERE slug = 'cat_camel';
