-- Threshold/tempo + upper-body power coverage: energy-system tags on steady cardio;
-- plyometric + upper_body_power on common upper explosive drills.
-- Idempotent. Complements data/goalSubFocus/conditioningSubFocus.ts (threshold_tempo, upper_body_power inference).

-- ─── 1) Ensure tags exist ─────────────────────────────────────────────────────
INSERT INTO public.exercise_tags (slug, name, tag_group, sort_order, weight)
VALUES
  ('lactate_threshold', 'Lactate threshold', 'energy_system', 45, 1.0),
  ('zone3_cardio', 'Zone 3 / tempo cardio', 'energy_system', 46, 1.0),
  ('upper_body_power', 'Upper body power (conditioning)', 'general', 205, 1.0)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tag_group = EXCLUDED.tag_group,
  sort_order = COALESCE(EXCLUDED.sort_order, public.exercise_tags.sort_order),
  weight = COALESCE(EXCLUDED.weight, public.exercise_tags.weight);

-- ─── 2) Lactate threshold + zone3 on machine cardio suitable for tempo/threshold work ──
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id
FROM public.exercises e
CROSS JOIN public.exercise_tags t
WHERE e.is_active = true
  AND t.slug = 'lactate_threshold'
  AND e.slug IN (
    'zone2_bike',
    'zone2_treadmill',
    'zone2_rower',
    'zone2_stair_climber',
    'rower_steady',
    'ski_erg_steady',
    'ski_erg',
    'assault_bike',
    'assault_bike_steady',
    'incline_treadmill_walk',
    'treadmill_incline_walk',
    'tempo_run',
    'threshold_bike',
    'row_threshold',
    'ski_erg_tempo'
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id
FROM public.exercises e
CROSS JOIN public.exercise_tags t
WHERE e.is_active = true
  AND t.slug = 'zone3_cardio'
  AND e.slug IN (
    'zone2_bike',
    'zone2_treadmill',
    'zone2_rower',
    'zone2_stair_climber',
    'rower_steady',
    'ski_erg_steady',
    'ski_erg',
    'assault_bike',
    'assault_bike_steady',
    'incline_treadmill_walk',
    'treadmill_incline_walk',
    'tempo_run',
    'threshold_bike',
    'row_threshold',
    'ski_erg_tempo'
  )
ON CONFLICT DO NOTHING;

-- ─── 3) Upper-body power: explicit intent slug + plyometric stimulus tag ────
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id
FROM public.exercises e
CROSS JOIN public.exercise_tags t
WHERE e.is_active = true
  AND t.slug = 'upper_body_power'
  AND e.slug IN (
    'medicine_ball_chest_pass',
    'battle_rope_waves',
    'battle_ropes',
    'medball_rotational_throw'
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id
FROM public.exercises e
CROSS JOIN public.exercise_tags t
WHERE e.is_active = true
  AND t.slug = 'plyometric'
  AND e.slug IN (
    'medicine_ball_chest_pass',
    'battle_rope_waves',
    'battle_ropes',
    'medball_rotational_throw'
  )
ON CONFLICT DO NOTHING;
