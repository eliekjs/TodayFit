-- Exercise aliases audit: normalize and backfill (search/discovery).
-- See docs/research/exercise-aliases-audit.md and docs/EXERCISE_ONTOLOGY_DESIGN.md § C.17.

-- ============== 1) Normalize existing aliases ==============
-- Trim each element; remove empty; remove canonical name (case-insensitive); dedupe.
UPDATE public.exercises e
SET aliases = (
  SELECT COALESCE(array_agg(DISTINCT a ORDER BY a), '{}')::text[]
  FROM (SELECT trim(unnest(COALESCE(e.aliases, '{}'))) AS a) sub
  WHERE sub.a != '' AND lower(sub.a) != lower(trim(e.name))
)
WHERE e.is_active = true
  AND e.aliases IS NOT NULL
  AND array_length(e.aliases, 1) > 0;

-- ============== 2) Backfill: exercises with no aliases (extend 20250320000001) ==============
-- Only set where aliases is null or empty; do not overwrite existing.

UPDATE public.exercises SET aliases = ARRAY['dips', 'bench dip']
WHERE slug = 'dips' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['push press', 'push jerk']
WHERE slug = 'push_press' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['good morning', 'GM']
WHERE slug = 'good_morning' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['cat cow', 'cat-cow', 'cat/cow']
WHERE slug IN ('cat_camel', 'cat_cow') AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['T-spine rotation', 'thoracic rotation']
WHERE slug = 't_spine_rotation' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['front squat']
WHERE slug = 'front_squat' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['incline bench', 'incline press']
WHERE slug = 'incline_bench_barbell' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['cable row', 'seated row']
WHERE slug = 'cable_row' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['skull crusher', 'skullcrusher', 'lying tricep ext']
WHERE slug = 'skull_crusher' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['barbell curl', 'BB curl']
WHERE slug = 'barbell_curl' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['hack squat']
WHERE slug = 'hack_squat' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['back extension', 'hyperextension']
WHERE slug IN ('back_extension', 'back_extension_45') AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['seated calf', 'seated calf raise']
WHERE slug = 'seated_calf_raise' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['dead bug']
WHERE slug = 'dead_bug' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['bird dog']
WHERE slug = 'bird_dog' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['thread the needle', 'thread needle']
WHERE slug IN ('thread_the_needle', 'thread_needle') AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['hip 90/90', '90/90 stretch']
WHERE slug = 'hip_90_90' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['band pull-apart', 'band pull apart', 'BPA']
WHERE slug = 'band_pullapart' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

COMMENT ON COLUMN public.exercises.aliases IS 'Alternate names / search aliases (e.g. OHP, overhead press). Trimmed, no empty strings; exclude canonical name.';
