-- Exercise equipment audit: normalize slugs to match app EquipmentKey and ensure every exercise has at least one equipment.
-- Aligns with docs/research/equipment-audit-2025.md. Sources: ExRx, NSCA, ACE, gym profile options (lib/types EquipmentKey).

-- 1) Normalize resistance_band -> bands (canonical slug for user-facing equipment; both mean the same)
UPDATE public.exercises
SET equipment = (
  SELECT ARRAY_AGG(norm ORDER BY norm)
  FROM (
    SELECT DISTINCT CASE WHEN eq = 'resistance_band' THEN 'bands' ELSE eq END AS norm
    FROM unnest(equipment) AS eq
  ) sub
)
WHERE equipment && ARRAY['resistance_band'];

-- 2) Ensure no exercise has empty equipment: default to bodyweight
UPDATE public.exercises
SET equipment = ARRAY['bodyweight']
WHERE equipment IS NULL OR array_length(equipment, 1) IS NULL OR equipment = '{}';
