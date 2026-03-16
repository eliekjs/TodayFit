-- Exercise ontology enrichment (consolidated): pairing_category, fatigue_regions, descriptions,
-- rep ranges, aliases, swap_candidates, warmup/cooldown/stability/grip/impact.
-- See docs/research/exercise-ontology-enrichment-2025.md. Builds on 20250325* audits.

-- ============== 1) Pairing_category: power/Olympic and stragglers ==============
UPDATE public.exercises SET pairing_category = 'quads'
WHERE is_active = true AND (pairing_category IS NULL OR pairing_category = '')
  AND slug IN ('thruster', 'devils_press', 'wall_ball');

UPDATE public.exercises SET pairing_category = 'shoulders'
WHERE is_active = true AND (pairing_category IS NULL OR pairing_category = '')
  AND slug IN ('push_jerk', 'split_jerk', 'push_press');

UPDATE public.exercises SET pairing_category = 'grip'
WHERE is_active = true AND (pairing_category IS NULL OR pairing_category = '')
  AND slug IN ('power_clean', 'hang_clean', 'clean_and_jerk', 'squat_clean', 'snatch', 'power_snatch', 'hang_snatch');

UPDATE public.exercises SET pairing_category = 'posterior_chain'
WHERE is_active = true AND (pairing_category IS NULL OR pairing_category = '')
  AND slug IN ('sumo_deadlift_high_pull', 'clean_pull', 'snatch_pull');

-- ============== 2) Fatigue_regions: ensure grip-heavy have forearms + grip ==============
UPDATE public.exercises e
SET fatigue_regions = (
  SELECT COALESCE(array_agg(DISTINCT r ORDER BY r), '{}')::text[]
  FROM (SELECT unnest(COALESCE(e.fatigue_regions, '{}') || ARRAY['forearms','grip']) AS r) sub
  WHERE r <> ''
)
WHERE e.is_active = true
  AND (e.pairing_category = 'grip' OR e.grip_demand = 'high')
  AND (e.fatigue_regions IS NULL OR array_length(e.fatigue_regions, 1) IS NULL OR NOT (e.fatigue_regions @> ARRAY['forearms']));

-- ============== 3) Descriptions: stub backfill where still NULL ==============
UPDATE public.exercises e
SET description = (
  e.name
  || ' is a '
  || CASE e.primary_movement_family
      WHEN 'upper_push' THEN 'upper-body push'
      WHEN 'upper_pull' THEN 'upper-body pull'
      WHEN 'lower_body' THEN 'lower-body'
      WHEN 'core' THEN 'core'
      WHEN 'mobility' THEN 'mobility'
      WHEN 'conditioning' THEN 'conditioning'
      ELSE 'compound'
    END
  || ' exercise.'
  || CASE WHEN array_length(e.primary_muscles, 1) > 0
      THEN ' Targets ' || array_to_string(e.primary_muscles, ', ') || '.'
      ELSE ''
    END
  || ' Equipment: '
  || CASE WHEN array_length(e.equipment, 1) > 0
      THEN array_to_string(e.equipment, ', ')
      ELSE 'bodyweight'
    END
  || '.'
)
WHERE e.is_active = true
  AND e.description IS NULL;

-- ============== 4) Rep ranges: main_compound 6–12 where still null ==============
UPDATE public.exercises
SET rep_range_min = 6, rep_range_max = 12
WHERE is_active = true
  AND rep_range_min IS NULL
  AND exercise_role = 'main_compound'
  AND primary_movement_family NOT IN ('mobility', 'conditioning');

-- ============== 5) Aliases: high-value abbreviations and alternate names ==============
UPDATE public.exercises SET aliases = ARRAY['OHP', 'overhead press', 'strict press']
WHERE slug = 'oh_press' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['BP', 'bench', 'bench press']
WHERE slug = 'bench_press_barbell' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['RDL', 'Romanian deadlift']
WHERE slug IN ('barbell_rdl', 'rdl_dumbbell') AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['DL', 'deadlift', 'conventional deadlift']
WHERE slug = 'barbell_deadlift' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['BSS', 'split squat', 'Bulgarian split squat']
WHERE slug = 'bulgarian_split_squat' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['WGS', 'world''s greatest stretch', 'worlds greatest stretch']
WHERE slug = 'worlds_greatest_stretch' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['lat pulldown', 'pulldown', 'lat pull-down']
WHERE slug = 'lat_pulldown' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['leg press', 'leg press machine']
WHERE slug = 'leg_press_machine' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['goblet squat', 'goblet']
WHERE slug = 'goblet_squat' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['hip thrust', 'glute bridge weighted']
WHERE slug = 'hip_thrust' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['KB swing', 'kettlebell swing', 'Russian swing']
WHERE slug = 'kb_swing' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

-- ============== 6) Swap_candidates: additional pairs ==============
UPDATE public.exercises SET swap_candidates = ARRAY['front_squat', 'goblet_squat', 'leg_press_machine', 'thruster', 'hack_squat', 'bulgarian_split_squat']
WHERE slug = 'barbell_back_squat' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['barbell_back_squat', 'goblet_squat', 'leg_press_machine', 'bulgarian_split_squat', 'front_squat']
WHERE slug = 'front_squat' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['barbell_back_squat', 'front_squat', 'leg_press_machine', 'push_press', 'wall_ball']
WHERE slug = 'thruster' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['oh_press', 'push_press', 'db_shoulder_press', 'arnold_press', 'pike_push_up']
WHERE slug = 'db_shoulder_press' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['barbell_curl', 'hammer_curl', 'concentration_curl', 'cable_curl', 'preacher_curl']
WHERE slug = 'db_curl' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['barbell_row', 'db_row', 'lat_pulldown', 'pullup', 'cable_row']
WHERE slug = 'barbell_row' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['barbell_deadlift', 'trap_bar_deadlift', 'sumo_deadlift', 'barbell_rdl', 'rack_pull']
WHERE slug = 'barbell_deadlift' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['barbell_deadlift', 'sumo_deadlift', 'barbell_rdl', 'good_morning']
WHERE slug = 'trap_bar_deadlift' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

UPDATE public.exercises SET swap_candidates = ARRAY['bench_press_barbell', 'incline_db_press', 'db_bench', 'push_up', 'cable_fly']
WHERE slug = 'db_bench' AND (swap_candidates IS NULL OR array_length(swap_candidates, 1) IS NULL OR array_length(swap_candidates, 1) = 0);

-- ============== 7) Demand levels: stragglers ==============
UPDATE public.exercises SET warmup_relevance = 'low'
WHERE is_active = true AND (warmup_relevance IS NULL OR warmup_relevance = '')
  AND exercise_role IN ('main_compound', 'accessory', 'isolation', 'finisher', 'conditioning', 'power', 'olympic');

UPDATE public.exercises SET cooldown_relevance = 'low'
WHERE is_active = true AND (cooldown_relevance IS NULL OR cooldown_relevance = '')
  AND exercise_role IN ('main_compound', 'accessory', 'isolation', 'finisher', 'conditioning', 'power', 'olympic');

UPDATE public.exercises SET impact_level = 'high'
WHERE is_active = true AND (impact_level IS NULL OR impact_level = '')
  AND (slug LIKE '%jump%' OR slug LIKE '%bound%' OR slug IN ('burpee', 'mountain_climber', 'running', 'sprint', 'jump_rope'));

UPDATE public.exercises SET grip_demand = 'high'
WHERE is_active = true AND (grip_demand IS NULL OR grip_demand = '')
  AND slug IN ('power_clean', 'hang_clean', 'clean_and_jerk', 'squat_clean', 'snatch', 'power_snatch', 'hang_snatch', 'toes_to_bar', 'l_sit', 'hanging_leg_raise');
