-- Add exercises for warm-up/cool-down stretches, bodyweight, power, pause, and machine.
-- Idempotent: INSERT with ON CONFLICT; UPDATE for exercise_role/stretch_targets/mobility_targets.
-- Run after existing exercise migrations.

-- ============== NEW STRETCHES (warm-up / cool-down) ==============
INSERT INTO public.exercises (slug, name, primary_muscles, secondary_muscles, equipment, modalities, movement_pattern, is_active)
VALUES
  ('standing_hamstring_stretch', 'Standing Hamstring Stretch', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('figure_four_stretch', 'Figure-4 Glute Stretch', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('standing_quad_stretch', 'Standing Quad Stretch', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('calf_stretch_wall', 'Wall Calf Stretch', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('hip_flexor_stretch', 'Hip Flexor Stretch (Half-Kneeling)', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('chest_stretch_doorway', 'Doorway Chest Stretch', ARRAY['push'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  equipment = EXCLUDED.equipment,
  modalities = EXCLUDED.modalities,
  movement_pattern = EXCLUDED.movement_pattern,
  is_active = EXCLUDED.is_active;

-- ============== PAUSE VARIATIONS (not in prior seeds) ==============
INSERT INTO public.exercises (slug, name, primary_muscles, secondary_muscles, equipment, modalities, movement_pattern, is_active)
VALUES
  ('pause_deadlift', 'Pause Deadlift', ARRAY['legs','core','pull'], ARRAY[]::text[], ARRAY['barbell'], ARRAY['strength'], 'hinge', true),
  ('pause_bench', 'Pause Bench Press', ARRAY['push'], ARRAY[]::text[], ARRAY['barbell','bench','squat_rack'], ARRAY['strength'], 'push', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  equipment = EXCLUDED.equipment,
  modalities = EXCLUDED.modalities,
  movement_pattern = EXCLUDED.movement_pattern,
  is_active = EXCLUDED.is_active;

-- ============== EXERCISE_ROLE + STRETCH/MOBILITY TARGETS ==============
-- Cooldown/warmup stretches
UPDATE public.exercises SET
  exercise_role = 'cooldown',
  primary_movement_family = 'mobility',
  stretch_targets = ARRAY['hamstrings'],
  mobility_targets = ARRAY['hamstrings']
WHERE slug = 'standing_hamstring_stretch';

UPDATE public.exercises SET
  exercise_role = 'cooldown',
  primary_movement_family = 'mobility',
  stretch_targets = ARRAY['glutes'],
  mobility_targets = ARRAY['hip_external_rotation','glutes']
WHERE slug = 'figure_four_stretch';

UPDATE public.exercises SET
  exercise_role = 'cooldown',
  primary_movement_family = 'mobility',
  stretch_targets = ARRAY['quadriceps'],
  mobility_targets = ARRAY['quadriceps']
WHERE slug = 'standing_quad_stretch';

UPDATE public.exercises SET
  exercise_role = 'cooldown',
  primary_movement_family = 'mobility',
  stretch_targets = ARRAY['calves'],
  mobility_targets = ARRAY['calves']
WHERE slug = 'calf_stretch_wall';

UPDATE public.exercises SET
  exercise_role = 'cooldown',
  primary_movement_family = 'mobility',
  stretch_targets = ARRAY['hip_flexors'],
  mobility_targets = ARRAY['hip_flexors']
WHERE slug = 'hip_flexor_stretch';

UPDATE public.exercises SET
  exercise_role = 'cooldown',
  primary_movement_family = 'mobility',
  stretch_targets = ARRAY['shoulders'],
  mobility_targets = ARRAY['shoulders']
WHERE slug = 'chest_stretch_doorway';

-- Pause exercises: accessory/main
UPDATE public.exercises SET
  exercise_role = 'accessory',
  primary_movement_family = 'lower_body'
WHERE slug = 'pause_deadlift';

UPDATE public.exercises SET
  exercise_role = 'accessory',
  primary_movement_family = 'upper_push'
WHERE slug = 'pause_bench';

-- ============== EXERCISE_TAG_MAP for new exercises ==============
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = e.movement_pattern
WHERE e.slug IN (
  'standing_hamstring_stretch','figure_four_stretch','standing_quad_stretch','calf_stretch_wall','hip_flexor_stretch','chest_stretch_doorway',
  'pause_deadlift','pause_bench'
)
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
CROSS JOIN LATERAL unnest(e.modalities) AS mod(s)
JOIN public.exercise_tags t ON t.slug = mod.s
WHERE e.slug IN (
  'standing_hamstring_stretch','figure_four_stretch','standing_quad_stretch','calf_stretch_wall','hip_flexor_stretch','chest_stretch_doorway',
  'pause_deadlift','pause_bench'
)
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
CROSS JOIN LATERAL unnest(e.primary_muscles) AS mus(s)
JOIN public.exercise_tags t ON t.slug = mus.s
WHERE e.slug IN (
  'standing_hamstring_stretch','figure_four_stretch','standing_quad_stretch','calf_stretch_wall','hip_flexor_stretch','chest_stretch_doorway',
  'pause_deadlift','pause_bench'
)
AND EXISTS (SELECT 1 FROM public.exercise_tags t2 WHERE t2.slug = mus.s)
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- energy_low for mobility stretches
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = 'energy_low'
WHERE e.slug IN (
  'standing_hamstring_stretch','figure_four_stretch','standing_quad_stretch','calf_stretch_wall','hip_flexor_stretch','chest_stretch_doorway'
)
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- equipment_bodyweight for stretches
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = 'equipment_bodyweight'
WHERE e.slug IN (
  'standing_hamstring_stretch','figure_four_stretch','standing_quad_stretch','calf_stretch_wall','hip_flexor_stretch','chest_stretch_doorway'
)
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- ============== CONTRAINDICATIONS for pause exercises ==============
INSERT INTO public.exercise_contraindications (exercise_id, contraindication, joint)
SELECT e.id, c.contraindication, c.contraindication
FROM (VALUES ('pause_deadlift', 'lower_back'), ('pause_bench', 'shoulder'), ('pause_bench', 'wrist')) AS c(slug, contraindication)
JOIN public.exercises e ON e.slug = c.slug
ON CONFLICT (exercise_id, contraindication) DO NOTHING;
