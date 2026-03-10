-- Exercise-specific rep ranges. When set, the generator uses these (optionally blended with goal)
-- so that e.g. calves/isolation get higher reps than compound lifts.
-- Research: strength 1-5, hypertrophy 6-20 (8-15 typical), endurance 15-25+, body recomp 10-15;
-- calves/small muscles respond better to 15-25 (Schoenfeld, RP Strength, calf volume studies).

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS rep_range_min integer;

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS rep_range_max integer;

COMMENT ON COLUMN public.exercises.rep_range_min IS 'Exercise-specific rep floor; when set, generator uses this (blended with goal) for prescription.';
COMMENT ON COLUMN public.exercises.rep_range_max IS 'Exercise-specific rep ceiling; when set, generator uses this (blended with goal) for prescription.';

-- Calves: higher reps (15-25) — soleus/gastroc respond to volume and moderate-high reps
UPDATE public.exercises SET rep_range_min = 15, rep_range_max = 25
WHERE slug IN ('calf_raise', 'seated_calf_raise', 'standing_calf_raise', 'donkey_calf_raise', 'single_leg_calf_raise')
   OR name ILIKE '%calf%raise%' OR name ILIKE '%calf raise%';

-- Isolation / small-muscle (lateral raises, face pulls, curls, etc.): typically 10-20
UPDATE public.exercises SET rep_range_min = 10, rep_range_max = 20
WHERE exercise_role = 'isolation'
  AND rep_range_min IS NULL;

-- Optional: a few known high-rep moves by slug
UPDATE public.exercises SET rep_range_min = 12, rep_range_max = 20
WHERE slug IN ('lateral_raise', 'face_pull', 'reverse_fly', 'concentration_curl', 'tricep_pushdown', 'leg_curl', 'leg_extension')
  AND rep_range_min IS NULL;
