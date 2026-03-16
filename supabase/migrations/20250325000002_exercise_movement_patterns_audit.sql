-- Movement pattern(s) audit: backfill movement_patterns from movement_pattern + slug; sync movement_pattern from first fine pattern.
-- See docs/research/exercise-movement-patterns-audit.md and lib/ontology/legacyMapping.ts.

-- ============== 1) Backfill movement_patterns where NULL or empty ==============
-- Use movement_pattern and slug to set at least one fine pattern (NSCA/ontology).

-- Push -> horizontal_push (bench, press, push-up, fly, dip, chest press, pec deck, tricep bench variants)
UPDATE public.exercises
SET movement_patterns = ARRAY['horizontal_push']
WHERE is_active = true
  AND (movement_patterns IS NULL OR movement_patterns = '{}')
  AND movement_pattern = 'push'
  AND (slug LIKE '%bench%' OR slug LIKE '%press%' OR slug LIKE '%push_up%' OR slug LIKE '%pushup%' OR slug LIKE '%fly%'
    OR slug LIKE '%dip%' OR slug LIKE '%floor_press%' OR slug LIKE '%pin_press%' OR slug LIKE '%chest_press%'
    OR slug LIKE '%pec_deck%' OR slug = 'tricep_dip_bench' OR slug = 'close_grip_push_up' OR slug = 'diamond_push_up' OR slug = 'decline_push_up');

-- Push -> vertical_push (overhead, shoulder press, raise, pike, z-press, landmine press, cuban)
UPDATE public.exercises
SET movement_patterns = ARRAY['vertical_push']
WHERE is_active = true
  AND (movement_patterns IS NULL OR movement_patterns = '{}')
  AND movement_pattern = 'push'
  AND (slug LIKE '%ohp%' OR slug LIKE '%overhead%' OR slug LIKE '%shoulder_press%' OR slug LIKE '%raise%'
    OR slug LIKE '%pike_push%' OR slug LIKE '%z_press%' OR slug LIKE '%push_press%' OR slug LIKE '%landmine%'
    OR slug LIKE '%cuban%' OR slug LIKE '%bottoms_up%' OR slug IN ('oh_press','seated_ohp','wall_slide'));

-- Push -> vertical_push (tricep isolation: pushdown, extension, kickback, skull crusher - vertical plane)
UPDATE public.exercises
SET movement_patterns = ARRAY['vertical_push']
WHERE is_active = true
  AND (movement_patterns IS NULL OR movement_patterns = '{}')
  AND movement_pattern = 'push'
  AND (slug LIKE '%tricep%' OR slug LIKE '%skull%' OR slug LIKE '%lying_tricep%' OR slug = 'overhead_tricep_extension');

-- Push -> horizontal_push (remaining push: cable crossover, band chest, etc.)
UPDATE public.exercises
SET movement_patterns = ARRAY['horizontal_push']
WHERE is_active = true
  AND (movement_patterns IS NULL OR movement_patterns = '{}')
  AND movement_pattern = 'push';

-- Pull -> horizontal_pull (row, face pull, inverted row, seal row, renegade, reverse fly)
UPDATE public.exercises
SET movement_patterns = ARRAY['horizontal_pull']
WHERE is_active = true
  AND (movement_patterns IS NULL OR movement_patterns = '{}')
  AND movement_pattern = 'pull'
  AND (slug LIKE '%row%' OR slug LIKE '%face_pull%' OR slug LIKE '%inverted%' OR slug LIKE '%seal_row%'
    OR slug LIKE '%renegade%' OR slug LIKE '%reverse_fly%' OR slug LIKE '%reverse_pec%' OR slug LIKE '%pull_apart%' OR slug LIKE '%band_pull%'
    OR slug IN ('ytw','prone_y_raise'));

-- Pull -> vertical_pull (pull-up, chin-up, pulldown, toes to bar)
UPDATE public.exercises
SET movement_patterns = ARRAY['vertical_pull']
WHERE is_active = true
  AND (movement_patterns IS NULL OR movement_patterns = '{}')
  AND movement_pattern = 'pull'
  AND (slug LIKE '%pullup%' OR slug LIKE '%chinup%' OR slug LIKE '%pulldown%' OR slug LIKE '%pull_up%' OR slug = 'toes_to_bar');

-- Pull -> horizontal_pull (curl, shrug - arm/upper back)
UPDATE public.exercises
SET movement_patterns = ARRAY['horizontal_pull']
WHERE is_active = true
  AND (movement_patterns IS NULL OR movement_patterns = '{}')
  AND movement_pattern = 'pull';

-- Squat -> lunge (split, lunge, step-up)
UPDATE public.exercises
SET movement_patterns = ARRAY['lunge']
WHERE is_active = true
  AND (movement_patterns IS NULL OR movement_patterns = '{}')
  AND movement_pattern IN ('squat','locomotion')
  AND (slug LIKE '%lunge%' OR slug LIKE '%split%' OR slug LIKE '%stepup%' OR slug LIKE '%step_up%' OR slug LIKE '%step_back%');

-- Squat -> squat (squat, leg press, hack, goblet, front, back)
UPDATE public.exercises
SET movement_patterns = ARRAY['squat']
WHERE is_active = true
  AND (movement_patterns IS NULL OR movement_patterns = '{}')
  AND movement_pattern = 'squat';

-- Hinge
UPDATE public.exercises
SET movement_patterns = ARRAY['hinge']
WHERE is_active = true
  AND (movement_patterns IS NULL OR movement_patterns = '{}')
  AND movement_pattern = 'hinge';

-- Carry
UPDATE public.exercises
SET movement_patterns = ARRAY['carry']
WHERE is_active = true
  AND (movement_patterns IS NULL OR movement_patterns = '{}')
  AND movement_pattern = 'carry';

-- Locomotion (conditioning, step-up, bear crawl, etc.)
UPDATE public.exercises
SET movement_patterns = ARRAY['locomotion']
WHERE is_active = true
  AND (movement_patterns IS NULL OR movement_patterns = '{}')
  AND movement_pattern = 'locomotion';

-- Rotate -> thoracic_mobility (cat cow, t-spine, open book, thread the needle, world's greatest stretch)
UPDATE public.exercises
SET movement_patterns = ARRAY['thoracic_mobility']
WHERE is_active = true
  AND (movement_patterns IS NULL OR movement_patterns = '{}')
  AND (movement_pattern = 'rotate' OR movement_pattern = 'rotation')
  AND (slug LIKE '%cat_%' OR slug LIKE '%t_spine%' OR slug LIKE '%open_book%' OR slug LIKE '%thread%'
    OR slug LIKE '%worlds_greatest%' OR slug LIKE '%hip_90%' OR slug LIKE '%frog%' OR slug LIKE '%quadruped_rock%'
    OR slug LIKE '%prone_extension%' OR slug LIKE '%breathing_diaphragmatic%' OR slug = 'inchworm');

-- Rotate -> anti_rotation (Pallof)
UPDATE public.exercises
SET movement_patterns = ARRAY['anti_rotation']
WHERE is_active = true
  AND (movement_patterns IS NULL OR movement_patterns = '{}')
  AND (movement_pattern = 'rotate' OR movement_pattern = 'rotation')
  AND (slug LIKE '%pallof%' OR slug LIKE '%anti_rotation%');

-- Rotate -> rotation (Russian twist, wood chop, core rotation)
UPDATE public.exercises
SET movement_patterns = ARRAY['rotation']
WHERE is_active = true
  AND (movement_patterns IS NULL OR movement_patterns = '{}')
  AND (movement_pattern = 'rotate' OR movement_pattern = 'rotation');

-- Rotate -> shoulder_stability (band dislocation, scapular slides - if any)
UPDATE public.exercises
SET movement_patterns = ARRAY['shoulder_stability']
WHERE is_active = true
  AND (movement_patterns IS NULL OR movement_patterns = '{}')
  AND (movement_pattern = 'rotate' OR movement_pattern = 'pull')
  AND (slug LIKE '%dislocation%' OR slug LIKE '%scapular_slide%');

-- ============== 2) Sync movement_pattern from first movement_patterns element ==============
-- Legacy mapping: squat, hinge -> same; lunge -> squat; horizontal_push, vertical_push -> push; horizontal_pull, vertical_pull -> pull;
-- carry -> carry; rotation, anti_rotation, thoracic_mobility -> rotate; locomotion, shoulder_stability -> locomotion (shoulder_stability -> pull in code; use pull)
UPDATE public.exercises e
SET movement_pattern = CASE
  WHEN p.first_pattern = 'squat' OR p.first_pattern = 'hinge' OR p.first_pattern = 'carry' OR p.first_pattern = 'locomotion' THEN p.first_pattern
  WHEN p.first_pattern = 'lunge' THEN 'squat'
  WHEN p.first_pattern IN ('horizontal_push','vertical_push') THEN 'push'
  WHEN p.first_pattern IN ('horizontal_pull','vertical_pull','shoulder_stability') THEN 'pull'
  WHEN p.first_pattern IN ('rotation','anti_rotation','thoracic_mobility') THEN 'rotate'
  ELSE e.movement_pattern
END
FROM (
  SELECT id, (movement_patterns)[1] AS first_pattern
  FROM public.exercises
  WHERE is_active = true AND movement_patterns IS NOT NULL AND array_length(movement_patterns, 1) > 0
) p
WHERE e.id = p.id;

-- ============== 3) Normalize invalid movement_pattern to valid legacy ==============
-- Ensure only: squat, hinge, push, pull, carry, rotate, locomotion
UPDATE public.exercises
SET movement_pattern = CASE
  WHEN movement_patterns @> ARRAY['rotation'] OR movement_patterns @> ARRAY['anti_rotation'] OR movement_patterns @> ARRAY['thoracic_mobility'] THEN 'rotate'
  WHEN movement_patterns @> ARRAY['squat'] OR movement_patterns @> ARRAY['lunge'] THEN 'squat'
  WHEN movement_patterns @> ARRAY['hinge'] THEN 'hinge'
  WHEN movement_patterns @> ARRAY['horizontal_push'] OR movement_patterns @> ARRAY['vertical_push'] THEN 'push'
  WHEN movement_patterns @> ARRAY['horizontal_pull'] OR movement_patterns @> ARRAY['vertical_pull'] OR movement_patterns @> ARRAY['shoulder_stability'] THEN 'pull'
  WHEN movement_patterns @> ARRAY['carry'] THEN 'carry'
  WHEN movement_patterns @> ARRAY['locomotion'] THEN 'locomotion'
  ELSE 'push'
END
WHERE is_active = true
  AND movement_pattern IS NOT NULL
  AND movement_pattern != ''
  AND movement_pattern NOT IN ('squat','hinge','push','pull','carry','rotate','locomotion')
  AND movement_patterns IS NOT NULL
  AND array_length(movement_patterns, 1) > 0;

-- Fallback: any remaining with movement_patterns but still wrong legacy
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
  AND array_length(e.movement_patterns, 1) > 0;
