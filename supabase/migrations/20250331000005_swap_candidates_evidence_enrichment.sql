-- Exercise swap_candidates: evidence-aligned (same pattern/family, ExRx/NSCA substitution).
-- See docs/research/swap-candidates-audit-2025.md. Builds on 20250325000010 and 20250331000000.

-- ============== 1) Normalize existing swap_candidates (no self, only active slugs, dedupe) ==============
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

-- ============== 2) Backfill: high-value swap pairs (only where null/empty) — same pattern/family ==============
UPDATE public.exercises SET swap_candidates = ARRAY['db_shoulder_press', 'push_press', 'arnold_press', 'pike_push_up', 'half_kneeling_landmine_press']
WHERE slug = 'oh_press' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['bench_press_barbell', 'incline_db_press', 'db_bench', 'push_up', 'cable_fly', 'dips']
WHERE slug = 'incline_bench_barbell' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['chinup', 'lat_pulldown', 'barbell_row', 'cable_row', 'australian_pull_up']
WHERE slug = 'pullup' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['pullup', 'lat_pulldown', 'barbell_row', 'cable_row', 'db_row']
WHERE slug = 'chinup' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['pullup', 'chinup', 'barbell_row', 'cable_row', 'db_row', 'trx_row']
WHERE slug = 'lat_pulldown' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['barbell_deadlift', 'barbell_rdl', 'trap_bar_deadlift', 'good_morning', 'rack_pull']
WHERE slug = 'sumo_deadlift' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['barbell_deadlift', 'barbell_rdl', 'single_leg_rdl', 'glute_bridge', 'back_extension']
WHERE slug = 'good_morning' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['hip_thrust', 'glute_bridge', 'barbell_rdl', 'good_morning', 'back_extension_45']
WHERE slug = 'back_extension' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['back_extension', 'hip_thrust', 'glute_bridge', 'barbell_rdl']
WHERE slug = 'back_extension_45' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['plank', 'dead_bug', 'pallof_hold', 'side_plank', 'hollow_hold', 'bird_dog']
WHERE slug = 'ab_wheel' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['plank', 'dead_bug', 'ab_wheel', 'side_plank', 'hollow_hold']
WHERE slug = 'pallof_hold' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['face_pull', 'prone_y_raise', 'db_fly', 'cable_fly']
WHERE slug = 'reverse_fly' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['oh_press', 'db_shoulder_press', 'push_press', 'pike_push_up', 'lateral_raise']
WHERE slug = 'arnold_press' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['oh_press', 'db_shoulder_press', 'arnold_press', 'push_press', 'lateral_raise']
WHERE slug = 'pike_push_up' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['bench_press_barbell', 'db_bench', 'incline_db_press', 'cable_crossover', 'pec_deck']
WHERE slug = 'cable_fly' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['leg_curl', 'barbell_rdl', 'good_morning', 'glute_bridge', 'back_extension']
WHERE slug = 'nordic_curl' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

COMMENT ON COLUMN public.exercises.swap_candidates IS 'Exercise slugs that are good substitutes in the same block/slot. No self-reference; only active slugs; same pattern/family preferred. See docs/research/swap-candidates-audit-2025.md.';
