-- Zone 2 cardio: add rower and stair climber exercises + zone2 tag for HR guidance use.
-- Idempotent; run after app_entities_seed.

-- Tag for Zone 2 cardio (if not already present)
INSERT INTO public.exercise_tags (slug, name, tag_group, sort_order)
VALUES ('zone2', 'Zone 2', 'general', 27)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, tag_group = EXCLUDED.tag_group, sort_order = EXCLUDED.sort_order;

-- New Zone 2 exercises
INSERT INTO public.exercises (slug, name, primary_muscles, equipment, modalities, is_active)
VALUES
  ('zone2_rower', 'Zone 2 Rower', ARRAY['legs','core'], ARRAY['rower'], ARRAY['conditioning'], true),
  ('zone2_stair_climber', 'Zone 2 Stair Climber', ARRAY['legs'], ARRAY['stair_climber'], ARRAY['conditioning'], true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  primary_muscles = EXCLUDED.primary_muscles,
  equipment = EXCLUDED.equipment,
  modalities = EXCLUDED.modalities,
  is_active = EXCLUDED.is_active;

-- Tag existing zone2 bike/treadmill with zone2 for consistency
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
CROSS JOIN public.exercise_tags t
WHERE e.slug IN ('zone2_bike', 'zone2_treadmill') AND t.slug = 'zone2'
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- Tag new exercises: zone2, endurance, low impact
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug IN ('zone2', 'endurance', 'low impact')
WHERE e.slug IN ('zone2_rower', 'zone2_stair_climber')
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- Contraindications
INSERT INTO public.exercise_contraindications (exercise_id, contraindication, joint)
SELECT e.id, c.contraindication, c.contraindication
FROM (VALUES ('zone2_rower', 'lower_back'), ('zone2_stair_climber', 'knee')) AS c(exercise_slug, contraindication)
JOIN public.exercises e ON e.slug = c.exercise_slug
ON CONFLICT (exercise_id, contraindication) DO NOTHING;
