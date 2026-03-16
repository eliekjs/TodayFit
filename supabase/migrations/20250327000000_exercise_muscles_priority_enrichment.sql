-- Primary/secondary muscles: enrich and order by contribution (ExRx-style).
-- See docs/research/primary-secondary-muscles-audit-2025.md.
-- Ensures conditioning/erg exercises have canonical muscles in correct order; adds missing secondaries.

-- ============== 1) Conditioning / erg exercises: canonical muscles, order most→least ==============
-- Rower variants: legs, core primary; lats, upper_back secondary (ExRx-style rowing musculature)
UPDATE public.exercises
SET primary_muscles = ARRAY['legs','core'], secondary_muscles = ARRAY['lats','upper_back']
WHERE slug IN ('rower_steady','rower_intervals_30_30','row_calorie_burn');

-- Zone 2 / bike / treadmill: legs primary; core secondary where applicable
UPDATE public.exercises
SET primary_muscles = ARRAY['legs'], secondary_muscles = ARRAY['core']
WHERE slug IN ('zone2_bike','zone2_treadmill','assault_bike_steady')
  AND is_active = true;

-- Ski erg: legs, core primary; lats, upper_back, shoulders secondary
UPDATE public.exercises
SET primary_muscles = ARRAY['legs','core'], secondary_muscles = ARRAY['lats','upper_back','shoulders']
WHERE slug IN ('ski_erg_intervals','ski_erg_steady') AND is_active = true;

-- ============== 2) Enrich: add forearms as secondary where grip is significant (ExRx, deadlift/row) ==============
-- Barbell deadlift / trap bar: forearms secondary (grip)
UPDATE public.exercises
SET secondary_muscles = COALESCE(secondary_muscles, '{}') || ARRAY['forearms']
WHERE slug IN ('barbell_deadlift','trap_bar_deadlift')
  AND is_active = true
  AND NOT (COALESCE(secondary_muscles, '{}') @> ARRAY['forearms']);

-- Heavy rows: forearms secondary
UPDATE public.exercises
SET secondary_muscles = COALESCE(secondary_muscles, '{}') || ARRAY['forearms']
WHERE slug IN ('barbell_row','pendlay_row','t_bar_row','yates_row')
  AND is_active = true
  AND NOT (COALESCE(secondary_muscles, '{}') @> ARRAY['forearms']);

-- ============== 3) Stragglers: replace any remaining push/pull with canonical muscles (order most→least) ==============
UPDATE public.exercises
SET primary_muscles = array_remove(primary_muscles, 'push') || ARRAY['chest','triceps','shoulders']
WHERE 'push' = ANY(primary_muscles) AND is_active = true;

UPDATE public.exercises
SET primary_muscles = array_remove(primary_muscles, 'pull') || ARRAY['lats','biceps','upper_back']
WHERE 'pull' = ANY(primary_muscles) AND is_active = true;
