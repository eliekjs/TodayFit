-- Exercise aliases: evidence-aligned (ExRx/NSCA common names and abbreviations).
-- See docs/research/aliases-audit-2025.md. Builds on 20250325000009 and 20250331000000.

-- ============== 1) Normalize existing aliases (trim, dedupe, remove canonical name) ==============
UPDATE public.exercises e
SET aliases = (
  SELECT COALESCE(array_agg(DISTINCT a ORDER BY a), '{}')::text[]
  FROM (SELECT trim(unnest(COALESCE(e.aliases, '{}'))) AS a) sub
  WHERE sub.a != '' AND lower(sub.a) != lower(trim(e.name))
)
WHERE e.is_active = true
  AND e.aliases IS NOT NULL
  AND array_length(e.aliases, 1) > 0;

-- ============== 2) Backfill: high-value aliases (only where null/empty) — ExRx/NSCA common names ==============
UPDATE public.exercises SET aliases = ARRAY['pull-up', 'pull up', 'pullup', 'lat pull-up']
WHERE slug = 'pullup' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['chin-up', 'chin up', 'chinup']
WHERE slug = 'chinup' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['leg curl', 'lying leg curl', 'hamstring curl']
WHERE slug = 'leg_curl' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['leg extension', 'leg ext', 'quad extension']
WHERE slug = 'leg_extension' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['sumo deadlift', 'sumo DL', 'wide stance deadlift']
WHERE slug = 'sumo_deadlift' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['trap bar deadlift', 'hex bar deadlift', 'trap bar DL']
WHERE slug = 'trap_bar_deadlift' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['incline dumbbell press', 'incline DB press', 'incline press']
WHERE slug = 'incline_db_press' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['push-up', 'push up', 'press-up']
WHERE slug = 'push_up' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['barbell row', 'BB row', 'bent over row', 'BOR']
WHERE slug = 'barbell_row' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['dumbbell row', 'DB row', 'single arm row']
WHERE slug = 'db_row' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['back squat', 'squat', 'barbell squat']
WHERE slug = 'barbell_back_squat' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['face pull', 'facepull', 'rear delt cable']
WHERE slug = 'face_pull' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['lateral raise', 'side raise', 'dumbbell lateral raise']
WHERE slug = 'lateral_raise' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['tricep pushdown', 'pushdown', 'cable pushdown']
WHERE slug = 'tricep_pushdown' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['concentration curl', 'concentration bicep curl']
WHERE slug = 'concentration_curl' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

COMMENT ON COLUMN public.exercises.aliases IS 'Alternate names / search aliases (e.g. OHP, overhead press). Trimmed, no empty strings; exclude canonical name. See docs/research/aliases-audit-2025.md.';
