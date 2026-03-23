-- Classification & filter findability: conditioning intent tags, tag maps, ontology gaps, aliases.
-- Idempotent. See lib/ontology/muscleSlugs.ts and data/goalSubFocus/conditioningSubFocus.ts.

-- ============== 1) Conditioning intent tags (direct match in attribute_tags / exercise_tag_map) ==============
INSERT INTO public.exercise_tags (slug, name, tag_group, sort_order, weight)
VALUES
  ('zone2_aerobic_base', 'Zone 2 aerobic base', 'general', 200, 1.0),
  ('intervals_hiit', 'Intervals / HIIT', 'general', 201, 1.0),
  ('threshold_tempo', 'Threshold / tempo', 'general', 202, 1.0),
  ('quad_focused', 'Quad-focused', 'general', 203, 0.9),
  ('posterior_chain', 'Posterior chain', 'general', 204, 0.9)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tag_group = EXCLUDED.tag_group,
  sort_order = EXCLUDED.sort_order,
  weight = COALESCE(EXCLUDED.weight, public.exercise_tags.weight);

-- Zone 2 steady / aerobic base exercises
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id
FROM public.exercises e
CROSS JOIN public.exercise_tags t
WHERE t.slug = 'zone2_aerobic_base'
  AND e.is_active = true
  AND e.slug IN (
    'zone2_bike',
    'zone2_treadmill',
    'zone2_rower',
    'zone2_stair_climber',
    'rower_steady',
    'incline_treadmill_walk',
    'treadmill_incline_walk',
    'ski_erg_steady'
  )
ON CONFLICT DO NOTHING;

-- Intervals / HIIT
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id
FROM public.exercises e
CROSS JOIN public.exercise_tags t
WHERE t.slug = 'intervals_hiit'
  AND e.is_active = true
  AND e.slug IN (
    'rower_intervals',
    'rower_intervals_30_30',
    'assault_bike_intervals',
    'burpee',
    'mountain_climber',
    'battle_ropes',
    'battle_rope_waves',
    'jump_rope_double_unders'
  )
ON CONFLICT DO NOTHING;

-- Threshold / tempo (moderate-hard sustained pieces)
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id
FROM public.exercises e
CROSS JOIN public.exercise_tags t
WHERE t.slug = 'threshold_tempo'
  AND e.is_active = true
  AND e.slug IN (
    'tempo_run',
    'threshold_bike',
    'row_threshold',
    'ski_erg_tempo'
  )
ON CONFLICT DO NOTHING;

-- ============== 2) High-traffic compounds: ensure ontology when still null / empty ==============
UPDATE public.exercises SET primary_movement_family = 'upper_push'
WHERE slug IN ('bench_press_barbell', 'db_bench', 'push_up', 'incline_bench_barbell')
  AND primary_movement_family IS NULL;

UPDATE public.exercises SET primary_movement_family = 'upper_pull'
WHERE slug IN ('pullup', 'chinup', 'barbell_row', 'lat_pulldown')
  AND primary_movement_family IS NULL;

UPDATE public.exercises SET primary_movement_family = 'lower_body'
WHERE slug IN ('barbell_back_squat', 'front_squat', 'barbell_deadlift', 'trap_bar_deadlift', 'romanian_deadlift', 'barbell_rdl', 'leg_press_machine', 'leg_extension', 'leg_curl')
  AND primary_movement_family IS NULL;

UPDATE public.exercises SET movement_patterns = ARRAY['horizontal_push']::text[]
WHERE slug IN ('bench_press_barbell', 'db_bench', 'push_up')
  AND (movement_patterns IS NULL OR cardinality(movement_patterns) = 0);

UPDATE public.exercises SET movement_patterns = ARRAY['vertical_pull']::text[]
WHERE slug IN ('pullup', 'chinup', 'lat_pulldown')
  AND (movement_patterns IS NULL OR cardinality(movement_patterns) = 0);

UPDATE public.exercises SET movement_patterns = ARRAY['horizontal_pull']::text[]
WHERE slug = 'barbell_row'
  AND (movement_patterns IS NULL OR cardinality(movement_patterns) = 0);

UPDATE public.exercises SET movement_patterns = ARRAY['squat']::text[]
WHERE slug IN ('barbell_back_squat', 'front_squat', 'leg_press_machine', 'leg_extension')
  AND (movement_patterns IS NULL OR cardinality(movement_patterns) = 0);

UPDATE public.exercises SET movement_patterns = ARRAY['hinge']::text[]
WHERE slug IN ('barbell_deadlift', 'trap_bar_deadlift', 'romanian_deadlift', 'barbell_rdl', 'leg_curl')
  AND (movement_patterns IS NULL OR cardinality(movement_patterns) = 0);

-- ============== 3) Quad / posterior tag hints (legacy alignment + filter emphasis) ==============
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id
FROM public.exercises e
CROSS JOIN public.exercise_tags t
WHERE t.slug = 'quad_focused'
  AND e.is_active = true
  AND e.slug IN ('leg_extension', 'leg_press_machine', 'hack_squat', 'sissy_squat', 'wall_sit')
ON CONFLICT DO NOTHING;

INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id
FROM public.exercises e
CROSS JOIN public.exercise_tags t
WHERE t.slug = 'posterior_chain'
  AND e.is_active = true
  AND e.slug IN ('barbell_deadlift', 'trap_bar_deadlift', 'romanian_deadlift', 'barbell_rdl', 'rdl_dumbbell', 'leg_curl', 'back_extension', 'hip_thrust', 'kb_swing', 'good_morning')
ON CONFLICT DO NOTHING;

-- ============== 4) Aliases (search / discoverability) when empty ==============
UPDATE public.exercises SET aliases = ARRAY['OHP', 'overhead press', 'strict press']
WHERE slug = 'oh_press' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['DL', 'conventional deadlift']
WHERE slug = 'barbell_deadlift' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['RDL', 'romanian deadlift']
WHERE slug IN ('romanian_deadlift', 'barbell_rdl', 'rdl_dumbbell')
  AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);

UPDATE public.exercises SET aliases = ARRAY['front squat', 'FS']
WHERE slug = 'front_squat' AND (aliases IS NULL OR array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0);
