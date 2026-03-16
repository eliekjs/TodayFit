-- Exercise swap_candidates audit: normalize and backfill (substitution in same slot).
-- See docs/research/exercise-swap-candidates-audit.md and docs/EXERCISE_ONTOLOGY_DESIGN.md § C.17.

-- ============== 1) Normalize existing swap_candidates ==============
-- Remove self-reference; remove slugs that do not exist or are inactive; dedupe.
UPDATE public.exercises e
SET swap_candidates = (
  SELECT COALESCE(array_agg(DISTINCT s ORDER BY s), '{}')::text[]
  FROM unnest(COALESCE(e.swap_candidates, '{}')) AS s
  WHERE s != e.slug
    AND s IN (SELECT slug FROM public.exercises WHERE is_active = true)
)
WHERE e.is_active = true
  AND e.swap_candidates IS NOT NULL
  AND array_length(e.swap_candidates, 1) > 0;

-- ============== 2) Backfill: exercises with no swap_candidates (extend 20250320000001) ==============
-- Only set where swap_candidates is null or empty.

UPDATE public.exercises SET swap_candidates = ARRAY['bench_press_barbell', 'incline_db_press', 'push_up', 'cable_fly', 'dips']
WHERE slug = 'incline_db_press' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['bench_press_barbell', 'db_bench', 'incline_db_press', 'dips']
WHERE slug = 'push_up' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['bench_press_barbell', 'db_bench', 'push_up', 'tricep_pushdown', 'skull_crusher']
WHERE slug = 'dips' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['barbell_row', 'cable_row', 'pullup', 'lat_pulldown', 'chinup']
WHERE slug = 'db_row' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['barbell_row', 'db_row', 'cable_row', 'pullup', 'lat_pulldown']
WHERE slug = 'trx_row' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['barbell_back_squat', 'goblet_squat', 'bulgarian_split_squat', 'leg_extension', 'hack_squat']
WHERE slug = 'leg_press_machine' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['bulgarian_split_squat', 'leg_press_machine', 'barbell_back_squat', 'leg_curl']
WHERE slug = 'leg_extension' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['barbell_rdl', 'hip_thrust', 'good_morning', 'bulgarian_split_squat']
WHERE slug = 'leg_curl' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['skull_crusher', 'tricep_pushdown', 'dips', 'overhead_tricep_extension']
WHERE slug = 'close_grip_bench' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['skull_crusher', 'tricep_pushdown', 'close_grip_bench', 'dips']
WHERE slug = 'overhead_tricep_extension' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['db_curl', 'barbell_curl', 'preacher_curl', 'concentration_curl']
WHERE slug = 'hammer_curl' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['db_curl', 'barbell_curl', 'hammer_curl', 'concentration_curl']
WHERE slug = 'preacher_curl' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['single_leg_rdl', 'barbell_deadlift', 'good_morning', 'leg_curl']
WHERE slug = 'rdl_dumbbell' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['barbell_rdl', 'barbell_deadlift', 'hip_thrust', 'good_morning']
WHERE slug = 'single_leg_rdl' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['hip_thrust', 'barbell_rdl', 'back_extension']
WHERE slug = 'glute_bridge' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['dead_bug', 'bird_dog', 'ab_wheel', 'plank', 'pallof_hold']
WHERE slug = 'side_plank' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['dead_bug', 'ab_wheel', 'side_plank', 'hollow_hold']
WHERE slug = 'plank' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['plank', 'dead_bug', 'ab_wheel', 'bird_dog']
WHERE slug = 'hollow_hold' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

COMMENT ON COLUMN public.exercises.swap_candidates IS 'Exercise slugs that are good substitutes in the same block/slot. No self-reference; only active exercise slugs; deduped.';
