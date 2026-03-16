-- Exercise pairing_category audit: backfill and normalize (ontology-aligned superset logic).
-- See docs/research/exercise-pairing-category-audit.md and lib/ontology/vocabularies.ts (PAIRING_CATEGORIES).
-- Allowed: chest, shoulders, triceps, back, biceps, quads, posterior_chain, core, grip, mobility.

-- ============== 1) Normalize invalid pairing_category ==============
-- Set to NULL where not in canonical list so we can backfill.
UPDATE public.exercises
SET pairing_category = NULL
WHERE is_active = true
  AND pairing_category IS NOT NULL
  AND pairing_category != ''
  AND LOWER(TRIM(pairing_category)) NOT IN (
    'chest','shoulders','triceps','back','biceps','quads','posterior_chain','core','grip','mobility'
  );

-- ============== 2) Backfill pairing_category where NULL ==============
-- Order: grip (primary limiter) → mobility → core → upper_push (chest/shoulders/triceps) → upper_pull (back/biceps) → lower_body (quads/posterior_chain) → default by family.

-- Grip: pull-up, chin-up, hang, farmer carry, suitcase carry, renegade row
UPDATE public.exercises SET pairing_category = 'grip'
WHERE is_active = true AND (pairing_category IS NULL OR pairing_category = '')
  AND (
    slug LIKE '%pull_up%' OR slug LIKE '%pullup%' OR slug LIKE '%chin_up%' OR slug LIKE '%chinup%'
    OR slug LIKE '%hang%' OR slug LIKE '%farmer%' OR slug LIKE '%suitcase%' OR slug = 'renegade_row'
  );

-- Mobility
UPDATE public.exercises SET pairing_category = 'mobility'
WHERE is_active = true AND (pairing_category IS NULL OR pairing_category = '')
  AND (primary_movement_family = 'mobility' OR modalities && ARRAY['mobility','recovery']);

-- Core
UPDATE public.exercises SET pairing_category = 'core'
WHERE is_active = true AND (pairing_category IS NULL OR pairing_category = '')
  AND (primary_movement_family = 'core'
    OR slug IN ('plank','dead_bug','pallof_hold','side_plank','hollow_hold','arch_hold','ab_wheel','russian_twist','v_up','bicycle_crunch'));

-- Upper push: chest
UPDATE public.exercises SET pairing_category = 'chest'
WHERE is_active = true AND (pairing_category IS NULL OR pairing_category = '')
  AND primary_movement_family = 'upper_push'
  AND (primary_muscles && ARRAY['chest','pecs'] OR slug LIKE '%bench%' OR slug LIKE '%fly%'
    OR (slug LIKE '%press%' AND slug NOT LIKE '%ohp%' AND slug NOT LIKE '%shoulder%'));

-- Upper push: shoulders
UPDATE public.exercises SET pairing_category = 'shoulders'
WHERE is_active = true AND (pairing_category IS NULL OR pairing_category = '')
  AND primary_movement_family = 'upper_push'
  AND (slug LIKE '%raise%' OR slug LIKE '%ohp%' OR slug LIKE '%shoulder_press%'
    OR slug IN ('arnold_press','pike_push_up','upright_row','cuban_press'));

-- Upper push: triceps
UPDATE public.exercises SET pairing_category = 'triceps'
WHERE is_active = true AND (pairing_category IS NULL OR pairing_category = '')
  AND primary_movement_family = 'upper_push'
  AND (slug LIKE '%tricep%' OR slug LIKE '%pushdown%'
    OR slug IN ('close_grip_bench','skull_crusher','dips','overhead_tricep_extension','lying_tricep_extension'));

-- Upper pull: back
UPDATE public.exercises SET pairing_category = 'back'
WHERE is_active = true AND (pairing_category IS NULL OR pairing_category = '')
  AND primary_movement_family = 'upper_pull'
  AND (slug LIKE '%row%' OR slug LIKE '%pulldown%' OR slug LIKE '%pull%' OR slug IN ('shrug','reverse_fly'));

-- Upper pull: biceps
UPDATE public.exercises SET pairing_category = 'biceps'
WHERE is_active = true AND (pairing_category IS NULL OR pairing_category = '')
  AND primary_movement_family = 'upper_pull'
  AND slug LIKE '%curl%';

-- Lower body: quads
UPDATE public.exercises SET pairing_category = 'quads'
WHERE is_active = true AND (pairing_category IS NULL OR pairing_category = '')
  AND primary_movement_family = 'lower_body'
  AND (slug LIKE '%squat%' OR slug LIKE '%lunge%' OR slug IN ('leg_extension','leg_press_machine','hack_squat'));

-- Lower body: posterior_chain
UPDATE public.exercises SET pairing_category = 'posterior_chain'
WHERE is_active = true AND (pairing_category IS NULL OR pairing_category = '')
  AND primary_movement_family = 'lower_body'
  AND (slug LIKE '%deadlift%' OR slug LIKE '%rdl%' OR slug LIKE '%hinge%'
    OR slug IN ('hip_thrust','glute_bridge','back_extension','leg_curl','kb_swing','good_morning','reverse_hyper','ghr','kickback'));

-- Default by primary_movement_family (conditioning remains NULL)
UPDATE public.exercises SET pairing_category = COALESCE(pairing_category, CASE primary_movement_family
  WHEN 'upper_push' THEN 'chest'
  WHEN 'upper_pull' THEN 'back'
  WHEN 'lower_body' THEN 'quads'
  WHEN 'core' THEN 'core'
  WHEN 'mobility' THEN 'mobility'
  ELSE NULL
END)
WHERE is_active = true AND (pairing_category IS NULL OR pairing_category = '');
