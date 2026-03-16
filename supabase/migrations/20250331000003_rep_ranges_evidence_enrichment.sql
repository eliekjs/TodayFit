-- Rep ranges: evidence-aligned (power/Olympic leave null so goal 1–5 drives).
-- See docs/research/rep-ranges-audit-2025.md. Builds on 20250325000008 and 20250331000000.

-- ============== 1) Power / Olympic: clear rep range so goal rep range drives (ACSM/NSCA: power = 1–5) ==============
UPDATE public.exercises
SET rep_range_min = NULL, rep_range_max = NULL
WHERE is_active = true
  AND exercise_role IN ('power', 'olympic')
  AND (rep_range_min IS NOT NULL OR rep_range_max IS NOT NULL);

-- ============== 2) Optional: high-rep band for shrugs / wrist (ExRx/NCSF: 10–15 typical) ==============
UPDATE public.exercises
SET rep_range_min = 10, rep_range_max = 20
WHERE is_active = true
  AND rep_range_min IS NULL
  AND slug IN ('shrug', 'db_shrug', 'wrist_curl', 'reverse_wrist_curl');

COMMENT ON COLUMN public.exercises.rep_range_min IS 'Exercise-specific rep floor; with rep_range_max, generator blends with goal (getEffectiveRepRange). Null = goal only. See docs/research/rep-ranges-audit-2025.md.';
COMMENT ON COLUMN public.exercises.rep_range_max IS 'Exercise-specific rep ceiling; with rep_range_min, generator blends with goal. Null = goal only.';
