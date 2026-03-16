-- Demand levels: evidence-aligned (warmup, cooldown, stability, grip, impact).
-- See docs/research/demand-levels-audit-2025.md. Builds on 20250325000011 and 20250331000000.

-- ============== 1) Normalize: only canonical values (lowercase), else NULL ==============
UPDATE public.exercises SET warmup_relevance = CASE
  WHEN lower(trim(warmup_relevance)) IN ('none','low','medium','high') THEN lower(trim(warmup_relevance))
  ELSE NULL END
WHERE warmup_relevance IS NOT NULL;

UPDATE public.exercises SET cooldown_relevance = CASE
  WHEN lower(trim(cooldown_relevance)) IN ('none','low','medium','high') THEN lower(trim(cooldown_relevance))
  ELSE NULL END
WHERE cooldown_relevance IS NOT NULL;

UPDATE public.exercises SET stability_demand = CASE
  WHEN lower(trim(stability_demand)) IN ('none','low','medium','high') THEN lower(trim(stability_demand))
  ELSE NULL END
WHERE stability_demand IS NOT NULL;

UPDATE public.exercises SET grip_demand = CASE
  WHEN lower(trim(grip_demand)) IN ('none','low','medium','high') THEN lower(trim(grip_demand))
  ELSE NULL END
WHERE grip_demand IS NOT NULL;

UPDATE public.exercises SET impact_level = CASE
  WHEN lower(trim(impact_level)) IN ('none','low','medium','high') THEN lower(trim(impact_level))
  ELSE NULL END
WHERE impact_level IS NOT NULL;

-- ============== 2) Warmup relevance: additional prep/mobility slugs (NSCA/ACSM) ==============
UPDATE public.exercises SET warmup_relevance = 'high'
WHERE is_active = true AND (warmup_relevance IS NULL OR warmup_relevance = '')
  AND slug IN (
    'quadruped_rockback', 'scapular_slides', 'wall_slide', 'banded_walk', 'windmill',
    'supine_twist', 'reclined_figure_four', 'seated_forward_fold', 'hip_circles'
  );

-- ============== 3) Cooldown relevance: stretch slugs ==============
UPDATE public.exercises SET cooldown_relevance = 'high'
WHERE is_active = true AND (cooldown_relevance IS NULL OR cooldown_relevance = '')
  AND slug IN (
    'standing_hamstring_stretch', 'figure_four_stretch', 'standing_quad_stretch', 'calf_stretch_wall',
    'hip_flexor_stretch', 'chest_stretch_doorway', 'pec_stretch_wall', 'lat_stretch_kneeling', 'childs_pose',
    'supine_twist', 'reclined_figure_four', 'seated_forward_fold'
  );

-- ============== 4) Stability demand: unilateral / balance (NSCA progression) ==============
UPDATE public.exercises SET stability_demand = 'medium'
WHERE is_active = true AND (stability_demand IS NULL OR stability_demand = '')
  AND (slug IN ('step_back_lunge', 'curtsy_lunge', 'lateral_lunge', 'deficit_reverse_lunge')
    OR (unilateral = true AND slug LIKE '%lunge%'));

-- ============== 5) Impact level: plyometric / high-impact (ACSM/NSCA injury awareness) ==============
UPDATE public.exercises SET impact_level = 'high'
WHERE is_active = true AND (impact_level IS NULL OR impact_level = '')
  AND (slug IN ('double_unders', 'jump_rope', 'box_jump', 'jump_squat', 'jump_lunge', 'burpee', 'mountain_climber', 'tuck_jump', 'skater_jump', 'broad_jump', 'lateral_bound', 'bounding', 'running', 'sprint')
    OR slug LIKE '%jump%' OR slug LIKE '%bound%');

-- ============== 6) Main work roles: low warmup/cooldown when still null ==============
UPDATE public.exercises SET warmup_relevance = 'low'
WHERE is_active = true AND (warmup_relevance IS NULL OR warmup_relevance = '')
  AND exercise_role IN ('main_compound', 'accessory', 'isolation', 'finisher', 'conditioning', 'power', 'olympic');

UPDATE public.exercises SET cooldown_relevance = 'low'
WHERE is_active = true AND (cooldown_relevance IS NULL OR cooldown_relevance = '')
  AND exercise_role IN ('main_compound', 'accessory', 'isolation', 'finisher', 'conditioning', 'power', 'olympic');

COMMENT ON COLUMN public.exercises.warmup_relevance IS 'Suitability as warm-up: none | low | medium | high. Prefer high/medium in warmup block. See docs/research/demand-levels-audit-2025.md.';
COMMENT ON COLUMN public.exercises.cooldown_relevance IS 'Suitability as cooldown/stretch: none | low | medium | high. See docs/research/demand-levels-audit-2025.md.';
COMMENT ON COLUMN public.exercises.stability_demand IS 'Balance/stability demand: none | low | medium | high. Optional down-rank high for beginners. See docs/research/demand-levels-audit-2025.md.';
COMMENT ON COLUMN public.exercises.grip_demand IS 'Grip/forearm demand: none | low | medium | high. high/medium → superset no double grip. See docs/research/demand-levels-audit-2025.md.';
COMMENT ON COLUMN public.exercises.impact_level IS 'Joint impact (e.g. plyometric): none | low | medium | high. Down-rank high when user has knee/lower_back/ankle. See docs/research/demand-levels-audit-2025.md.';
