-- Movement pattern(s): enrich compounds with secondary patterns, order primary first.
-- See docs/research/movement-patterns-audit-2025.md and lib/ontology/legacyMapping.ts.

-- ============== 1) Compounds: add secondary movement_patterns (order = primary, then secondary) ==============
-- Thruster: squat + vertical push (NSCA/ExRx)
UPDATE public.exercises
SET movement_patterns = ARRAY['squat','vertical_push'], movement_pattern = 'squat'
WHERE slug = 'thruster' AND is_active = true;

-- Clean and press / KB clean: hinge + vertical pull (clean) + vertical push (press)
UPDATE public.exercises
SET movement_patterns = ARRAY['hinge','vertical_pull','vertical_push'], movement_pattern = 'hinge'
WHERE slug IN ('clean_and_press','kb_clean') AND is_active = true;

-- Squat clean, hang clean, snatch-grip high pull: hinge + vertical pull
UPDATE public.exercises
SET movement_patterns = ARRAY['hinge','vertical_pull'], movement_pattern = 'hinge'
WHERE slug IN ('squat_clean','hang_clean','snatch_grip_high_pull') AND is_active = true;

-- DB snatch, thruster (already done above): lower + vertical push
UPDATE public.exercises
SET movement_patterns = ARRAY['hinge','vertical_push'], movement_pattern = 'hinge'
WHERE slug = 'db_snatch' AND is_active = true;

-- Devil's press: hinge + vertical push (dumbbell push from floor)
UPDATE public.exercises
SET movement_patterns = ARRAY['hinge','vertical_push'], movement_pattern = 'hinge'
WHERE slug = 'devils_press' AND is_active = true;

-- Power snatch, push jerk, split jerk, squat jerk: compound Olympic-style
UPDATE public.exercises
SET movement_patterns = ARRAY['hinge','vertical_pull'], movement_pattern = 'hinge'
WHERE slug IN ('power_snatch') AND is_active = true;

-- Jerks: vertical push primary (legacy push), squat/secondary
UPDATE public.exercises
SET movement_patterns = ARRAY['vertical_push','squat'], movement_pattern = 'push'
WHERE slug IN ('push_jerk','split_jerk','squat_jerk') AND is_active = true;

-- Push press: vertical push with leg drive (squat or locomotion component); primary = vertical push
UPDATE public.exercises
SET movement_patterns = ARRAY['vertical_push','squat'], movement_pattern = 'push'
WHERE slug = 'push_press' AND is_active = true;

-- ============== 2) Ensure movement_pattern = legacy of first movement_patterns element ==============
-- (Sync already in 20250325000002; re-apply for compounds we just changed.)
UPDATE public.exercises e
SET movement_pattern = CASE (e.movement_patterns)[1]
  WHEN 'squat' THEN 'squat'
  WHEN 'hinge' THEN 'hinge'
  WHEN 'lunge' THEN 'squat'
  WHEN 'horizontal_push' THEN 'push'
  WHEN 'vertical_push' THEN 'push'
  WHEN 'horizontal_pull' THEN 'pull'
  WHEN 'vertical_pull' THEN 'pull'
  WHEN 'shoulder_stability' THEN 'pull'
  WHEN 'carry' THEN 'carry'
  WHEN 'rotation' THEN 'rotate'
  WHEN 'anti_rotation' THEN 'rotate'
  WHEN 'thoracic_mobility' THEN 'rotate'
  WHEN 'locomotion' THEN 'locomotion'
  ELSE e.movement_pattern
END
WHERE e.is_active = true
  AND e.movement_patterns IS NOT NULL
  AND array_length(e.movement_patterns, 1) > 0
  AND e.slug IN ('thruster','clean_and_press','kb_clean','squat_clean','hang_clean','snatch_grip_high_pull','db_snatch','devils_press','power_snatch','push_jerk','split_jerk','squat_jerk','push_press');
