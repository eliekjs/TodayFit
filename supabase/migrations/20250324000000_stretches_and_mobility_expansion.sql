-- Expand stretch and mobility exercises for cooldown (stretch-only) and warmup (mobility).
-- Cooldown = stretching only, matched to body part and workout type via stretch_targets.
-- Warmup = mobility/prep exercises with mobility_targets for filter matching.
-- Idempotent: INSERT with ON CONFLICT; UPDATE for ontology fields.

-- ============== STRETCHES (cooldown: exercise_role = 'stretch', stretch_targets set) ==============
INSERT INTO public.exercises (slug, name, primary_muscles, secondary_muscles, equipment, modalities, movement_pattern, is_active)
VALUES
  ('seated_hamstring_stretch', 'Seated Hamstring Stretch', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('reclined_figure_four', 'Reclined Figure-4 Stretch', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('lat_stretch_kneeling', 'Kneeling Lat Stretch', ARRAY['pull'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('triceps_stretch_overhead', 'Overhead Triceps Stretch', ARRAY['push'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('childs_pose', 'Child''s Pose', ARRAY['core'], ARRAY['pull'], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('kneeling_hip_flexor_stretch', 'Kneeling Hip Flexor Stretch', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('piriformis_stretch_seated', 'Seated Piriformis Stretch', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('calf_stretch_standing', 'Standing Calf Stretch', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('pec_stretch_wall', 'Wall Pec Stretch', ARRAY['push'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('supine_twist', 'Supine Spinal Twist', ARRAY['core'], ARRAY['pull'], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('seated_forward_fold', 'Seated Forward Fold', ARRAY['legs'], ARRAY['core'], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('quad_stretch_side_lying', 'Side-Lying Quad Stretch', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('shoulder_cross_body_stretch', 'Cross-Body Shoulder Stretch', ARRAY['push'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('lizard_hip_flexor', 'Lizard Hip Flexor Stretch', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('thread_the_needle_stretch', 'Thread the Needle (Stretch)', ARRAY['core','push'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('frog_stretch', 'Frog Stretch', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('reclined_hand_toe_hold', 'Reclined Hand-to-Toe (Hamstring)', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('low_lunge_stretch', 'Low Lunge Stretch', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  equipment = EXCLUDED.equipment,
  modalities = EXCLUDED.modalities,
  movement_pattern = EXCLUDED.movement_pattern,
  is_active = EXCLUDED.is_active;

-- ============== MOBILITY (warmup: exercise_role = 'mobility' or 'prep', mobility_targets set) ==============
INSERT INTO public.exercises (slug, name, primary_muscles, secondary_muscles, equipment, modalities, movement_pattern, is_active)
VALUES
  ('arm_circles', 'Arm Circles', ARRAY['push'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('band_pull_apart', 'Band Pull-Apart', ARRAY['pull'], ARRAY['push'], ARRAY['bands','resistance_band'], ARRAY['mobility'], 'pull', true),
  ('leg_swings_front', 'Leg Swings (Front-Back)', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'locomotion', true),
  ('leg_swings_side', 'Leg Swings (Side)', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'locomotion', true),
  ('hip_circles', 'Hip Circles', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('ankle_circles', 'Ankle Circles', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('wrist_circles', 'Wrist Circles', ARRAY['push'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('scapular_slides', 'Scapular Slides (Wall)', ARRAY['pull'], ARRAY['push'], ARRAY['bodyweight'], ARRAY['mobility'], 'push', true),
  ('band_shoulder_dislocation', 'Band Shoulder Dislocation', ARRAY['push','pull'], ARRAY[]::text[], ARRAY['bands','resistance_band'], ARRAY['mobility'], 'rotate', true),
  ('dead_bug_prep', 'Dead Bug (Prep)', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('bird_dog_prep', 'Bird Dog (Prep)', ARRAY['core'], ARRAY['legs','pull'], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('glute_bridge_hold', 'Glute Bridge Hold', ARRAY['legs'], ARRAY['core'], ARRAY['bodyweight'], ARRAY['mobility'], 'hinge', true),
  ('inchworm', 'Inchworm', ARRAY['core','legs','pull'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'locomotion', true),
  ('lateral_lunge_shift', 'Lateral Lunge Shift', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'squat', true),
  ('open_books', 'Open Book (T-Spine)', ARRAY['core'], ARRAY['pull'], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('quadruped_rock', 'Quadruped Rock (Hip)', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('prone_extension', 'Prone Extension (Thoracic)', ARRAY['core'], ARRAY['pull'], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('wall_slide', 'Wall Slide (Shoulder)', ARRAY['push'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'push', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  equipment = EXCLUDED.equipment,
  modalities = EXCLUDED.modalities,
  movement_pattern = EXCLUDED.movement_pattern,
  is_active = EXCLUDED.is_active;

-- ============== STRETCH: ontology (exercise_role = 'stretch', stretch_targets, cooldown_relevance) ==============
UPDATE public.exercises SET
  exercise_role = 'stretch',
  primary_movement_family = 'mobility',
  stretch_targets = ARRAY['hamstrings'],
  cooldown_relevance = 'high'
WHERE slug = 'seated_hamstring_stretch';

UPDATE public.exercises SET
  exercise_role = 'stretch',
  primary_movement_family = 'mobility',
  stretch_targets = ARRAY['glutes','hip_external_rotation'],
  cooldown_relevance = 'high'
WHERE slug = 'reclined_figure_four';

UPDATE public.exercises SET
  exercise_role = 'stretch',
  primary_movement_family = 'mobility',
  stretch_targets = ARRAY['lats'],
  cooldown_relevance = 'high'
WHERE slug = 'lat_stretch_kneeling';

UPDATE public.exercises SET
  exercise_role = 'stretch',
  primary_movement_family = 'mobility',
  stretch_targets = ARRAY['shoulders'],
  cooldown_relevance = 'high'
WHERE slug = 'triceps_stretch_overhead';

UPDATE public.exercises SET
  exercise_role = 'stretch',
  primary_movement_family = 'mobility',
  stretch_targets = ARRAY['low_back','thoracic_spine'],
  cooldown_relevance = 'high'
WHERE slug = 'childs_pose';

UPDATE public.exercises SET
  exercise_role = 'stretch',
  primary_movement_family = 'mobility',
  stretch_targets = ARRAY['hip_flexors'],
  cooldown_relevance = 'high'
WHERE slug = 'kneeling_hip_flexor_stretch';

UPDATE public.exercises SET
  exercise_role = 'stretch',
  primary_movement_family = 'mobility',
  stretch_targets = ARRAY['glutes'],
  cooldown_relevance = 'high'
WHERE slug = 'piriformis_stretch_seated';

UPDATE public.exercises SET
  exercise_role = 'stretch',
  primary_movement_family = 'mobility',
  stretch_targets = ARRAY['calves'],
  cooldown_relevance = 'high'
WHERE slug = 'calf_stretch_standing';

UPDATE public.exercises SET
  exercise_role = 'stretch',
  primary_movement_family = 'mobility',
  stretch_targets = ARRAY['shoulders','thoracic_spine'],
  cooldown_relevance = 'high'
WHERE slug = 'pec_stretch_wall';

UPDATE public.exercises SET
  exercise_role = 'stretch',
  primary_movement_family = 'mobility',
  stretch_targets = ARRAY['low_back','thoracic_spine'],
  cooldown_relevance = 'high'
WHERE slug = 'supine_twist';

UPDATE public.exercises SET
  exercise_role = 'stretch',
  primary_movement_family = 'mobility',
  stretch_targets = ARRAY['hamstrings','low_back'],
  cooldown_relevance = 'high'
WHERE slug = 'seated_forward_fold';

UPDATE public.exercises SET
  exercise_role = 'stretch',
  primary_movement_family = 'mobility',
  stretch_targets = ARRAY['quadriceps'],
  cooldown_relevance = 'high'
WHERE slug = 'quad_stretch_side_lying';

UPDATE public.exercises SET
  exercise_role = 'stretch',
  primary_movement_family = 'mobility',
  stretch_targets = ARRAY['shoulders'],
  cooldown_relevance = 'high'
WHERE slug = 'shoulder_cross_body_stretch';

UPDATE public.exercises SET
  exercise_role = 'stretch',
  primary_movement_family = 'mobility',
  stretch_targets = ARRAY['hip_flexors','glutes'],
  cooldown_relevance = 'high'
WHERE slug = 'lizard_hip_flexor';

UPDATE public.exercises SET
  exercise_role = 'stretch',
  primary_movement_family = 'mobility',
  stretch_targets = ARRAY['thoracic_spine','shoulders'],
  cooldown_relevance = 'high'
WHERE slug = 'thread_the_needle_stretch';

UPDATE public.exercises SET
  exercise_role = 'stretch',
  primary_movement_family = 'mobility',
  stretch_targets = ARRAY['hip_flexors','glutes'],
  mobility_targets = ARRAY['hip_internal_rotation','hip_external_rotation'],
  cooldown_relevance = 'high'
WHERE slug = 'frog_stretch';

UPDATE public.exercises SET
  exercise_role = 'stretch',
  primary_movement_family = 'mobility',
  stretch_targets = ARRAY['hamstrings'],
  cooldown_relevance = 'high'
WHERE slug = 'reclined_hand_toe_hold';

UPDATE public.exercises SET
  exercise_role = 'stretch',
  primary_movement_family = 'mobility',
  stretch_targets = ARRAY['hip_flexors','quadriceps'],
  cooldown_relevance = 'high'
WHERE slug = 'low_lunge_stretch';

-- ============== MOBILITY: ontology (exercise_role = 'mobility' or 'prep', mobility_targets, warmup_relevance) ==============
UPDATE public.exercises SET
  exercise_role = 'mobility',
  primary_movement_family = 'mobility',
  mobility_targets = ARRAY['shoulders'],
  warmup_relevance = 'high'
WHERE slug = 'arm_circles';

UPDATE public.exercises SET
  exercise_role = 'mobility',
  primary_movement_family = 'mobility',
  mobility_targets = ARRAY['shoulders','thoracic_spine'],
  warmup_relevance = 'high'
WHERE slug = 'band_pull_apart';

UPDATE public.exercises SET
  exercise_role = 'prep',
  primary_movement_family = 'mobility',
  mobility_targets = ARRAY['hip_flexors','hamstrings'],
  warmup_relevance = 'high'
WHERE slug = 'leg_swings_front';

UPDATE public.exercises SET
  exercise_role = 'prep',
  primary_movement_family = 'mobility',
  mobility_targets = ARRAY['hip_flexors','glutes'],
  warmup_relevance = 'high'
WHERE slug = 'leg_swings_side';

UPDATE public.exercises SET
  exercise_role = 'mobility',
  primary_movement_family = 'mobility',
  mobility_targets = ARRAY['hip_internal_rotation','hip_external_rotation'],
  warmup_relevance = 'high'
WHERE slug = 'hip_circles';

UPDATE public.exercises SET
  exercise_role = 'mobility',
  primary_movement_family = 'mobility',
  mobility_targets = ARRAY['calves'],
  warmup_relevance = 'medium'
WHERE slug = 'ankle_circles';

UPDATE public.exercises SET
  exercise_role = 'mobility',
  primary_movement_family = 'mobility',
  mobility_targets = ARRAY['wrists'],
  warmup_relevance = 'medium'
WHERE slug = 'wrist_circles';

UPDATE public.exercises SET
  exercise_role = 'prep',
  primary_movement_family = 'mobility',
  mobility_targets = ARRAY['shoulders','thoracic_spine'],
  warmup_relevance = 'high'
WHERE slug = 'scapular_slides';

UPDATE public.exercises SET
  exercise_role = 'mobility',
  primary_movement_family = 'mobility',
  mobility_targets = ARRAY['shoulders','thoracic_spine'],
  warmup_relevance = 'high'
WHERE slug = 'band_shoulder_dislocation';

UPDATE public.exercises SET
  exercise_role = 'prep',
  primary_movement_family = 'mobility',
  mobility_targets = ARRAY['hip_flexors'],
  warmup_relevance = 'high'
WHERE slug = 'dead_bug_prep';

UPDATE public.exercises SET
  exercise_role = 'prep',
  primary_movement_family = 'mobility',
  mobility_targets = ARRAY['low_back','hip_flexors'],
  warmup_relevance = 'high'
WHERE slug = 'bird_dog_prep';

UPDATE public.exercises SET
  exercise_role = 'prep',
  primary_movement_family = 'mobility',
  mobility_targets = ARRAY['glutes','hip_flexors'],
  warmup_relevance = 'high'
WHERE slug = 'glute_bridge_hold';

UPDATE public.exercises SET
  exercise_role = 'prep',
  primary_movement_family = 'mobility',
  mobility_targets = ARRAY['hamstrings','calves','thoracic_spine'],
  warmup_relevance = 'high'
WHERE slug = 'inchworm';

UPDATE public.exercises SET
  exercise_role = 'prep',
  primary_movement_family = 'mobility',
  mobility_targets = ARRAY['hip_flexors','glutes','quadriceps'],
  warmup_relevance = 'high'
WHERE slug = 'lateral_lunge_shift';

UPDATE public.exercises SET
  exercise_role = 'mobility',
  primary_movement_family = 'mobility',
  mobility_targets = ARRAY['thoracic_spine'],
  warmup_relevance = 'high'
WHERE slug = 'open_books';

UPDATE public.exercises SET
  exercise_role = 'prep',
  primary_movement_family = 'mobility',
  mobility_targets = ARRAY['hip_flexors','quadriceps'],
  warmup_relevance = 'high'
WHERE slug = 'quadruped_rock';

UPDATE public.exercises SET
  exercise_role = 'mobility',
  primary_movement_family = 'mobility',
  mobility_targets = ARRAY['thoracic_spine','low_back'],
  warmup_relevance = 'high'
WHERE slug = 'prone_extension';

UPDATE public.exercises SET
  exercise_role = 'mobility',
  primary_movement_family = 'mobility',
  mobility_targets = ARRAY['shoulders','thoracic_spine'],
  warmup_relevance = 'high'
WHERE slug = 'wall_slide';

-- ============== Existing stretches: set exercise_role = 'stretch' (was 'cooldown') ==============
UPDATE public.exercises SET exercise_role = 'stretch'
WHERE slug IN (
  'standing_hamstring_stretch','figure_four_stretch','standing_quad_stretch','calf_stretch_wall',
  'hip_flexor_stretch','chest_stretch_doorway'
) AND (stretch_targets IS NOT NULL AND array_length(stretch_targets, 1) > 0);

-- ============== exercise_tag_map: tags for filter matching (modalities, muscles, energy, equipment) ==============
-- Stretches: mobility, recovery, energy_low, equipment_bodyweight
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = 'mobility'
WHERE e.slug IN (
  'seated_hamstring_stretch','reclined_figure_four','lat_stretch_kneeling','triceps_stretch_overhead','childs_pose',
  'kneeling_hip_flexor_stretch','piriformis_stretch_seated','calf_stretch_standing','pec_stretch_wall','supine_twist',
  'seated_forward_fold','quad_stretch_side_lying','shoulder_cross_body_stretch','lizard_hip_flexor','thread_the_needle_stretch',
  'frog_stretch','reclined_hand_toe_hold','low_lunge_stretch'
)
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = 'recovery'
WHERE e.slug IN (
  'seated_hamstring_stretch','reclined_figure_four','lat_stretch_kneeling','triceps_stretch_overhead','childs_pose',
  'kneeling_hip_flexor_stretch','piriformis_stretch_seated','calf_stretch_standing','pec_stretch_wall','supine_twist',
  'seated_forward_fold','quad_stretch_side_lying','shoulder_cross_body_stretch','lizard_hip_flexor','thread_the_needle_stretch',
  'frog_stretch','reclined_hand_toe_hold','low_lunge_stretch'
)
AND EXISTS (SELECT 1 FROM public.exercise_tags t2 WHERE t2.slug = 'recovery')
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = 'energy_low'
WHERE e.slug IN (
  'seated_hamstring_stretch','reclined_figure_four','lat_stretch_kneeling','triceps_stretch_overhead','childs_pose',
  'kneeling_hip_flexor_stretch','piriformis_stretch_seated','calf_stretch_standing','pec_stretch_wall','supine_twist',
  'seated_forward_fold','quad_stretch_side_lying','shoulder_cross_body_stretch','lizard_hip_flexor','thread_the_needle_stretch',
  'frog_stretch','reclined_hand_toe_hold','low_lunge_stretch'
)
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = 'equipment_bodyweight'
WHERE e.slug IN (
  'seated_hamstring_stretch','reclined_figure_four','lat_stretch_kneeling','triceps_stretch_overhead','childs_pose',
  'kneeling_hip_flexor_stretch','piriformis_stretch_seated','calf_stretch_standing','pec_stretch_wall','supine_twist',
  'seated_forward_fold','quad_stretch_side_lying','shoulder_cross_body_stretch','lizard_hip_flexor','thread_the_needle_stretch',
  'frog_stretch','reclined_hand_toe_hold','low_lunge_stretch'
)
AND EXISTS (SELECT 1 FROM public.exercise_tags t2 WHERE t2.slug = 'equipment_bodyweight')
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- Mobility: mobility, recovery, energy_low; equipment-specific where needed
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = 'mobility'
WHERE e.slug IN (
  'arm_circles','band_pull_apart','leg_swings_front','leg_swings_side','hip_circles','ankle_circles','wrist_circles',
  'scapular_slides','band_shoulder_dislocation','dead_bug_prep','bird_dog_prep','glute_bridge_hold','inchworm',
  'lateral_lunge_shift','open_books','quadruped_rock','prone_extension','wall_slide'
)
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = 'recovery'
WHERE e.slug IN (
  'arm_circles','band_pull_apart','leg_swings_front','leg_swings_side','hip_circles','ankle_circles','wrist_circles',
  'scapular_slides','band_shoulder_dislocation','dead_bug_prep','bird_dog_prep','glute_bridge_hold','inchworm',
  'lateral_lunge_shift','open_books','quadruped_rock','prone_extension','wall_slide'
)
AND EXISTS (SELECT 1 FROM public.exercise_tags t2 WHERE t2.slug = 'recovery')
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = 'energy_low'
WHERE e.slug IN (
  'arm_circles','leg_swings_front','leg_swings_side','hip_circles','ankle_circles','wrist_circles',
  'scapular_slides','dead_bug_prep','bird_dog_prep','glute_bridge_hold','inchworm','lateral_lunge_shift',
  'open_books','quadruped_rock','prone_extension','wall_slide'
)
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- Movement pattern tags for new exercises
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = e.movement_pattern
WHERE e.slug IN (
  'seated_hamstring_stretch','reclined_figure_four','lat_stretch_kneeling','triceps_stretch_overhead','childs_pose',
  'kneeling_hip_flexor_stretch','piriformis_stretch_seated','calf_stretch_standing','pec_stretch_wall','supine_twist',
  'seated_forward_fold','quad_stretch_side_lying','shoulder_cross_body_stretch','lizard_hip_flexor','thread_the_needle_stretch',
  'frog_stretch','reclined_hand_toe_hold','low_lunge_stretch',
  'arm_circles','band_pull_apart','leg_swings_front','leg_swings_side','hip_circles','ankle_circles','wrist_circles',
  'scapular_slides','band_shoulder_dislocation','dead_bug_prep','bird_dog_prep','glute_bridge_hold','inchworm',
  'lateral_lunge_shift','open_books','quadruped_rock','prone_extension','wall_slide'
)
AND EXISTS (SELECT 1 FROM public.exercise_tags t2 WHERE t2.slug = e.movement_pattern)
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- Modality tags
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
CROSS JOIN LATERAL unnest(e.modalities) AS mod(s)
JOIN public.exercise_tags t ON t.slug = mod.s
WHERE e.slug IN (
  'seated_hamstring_stretch','reclined_figure_four','lat_stretch_kneeling','triceps_stretch_overhead','childs_pose',
  'kneeling_hip_flexor_stretch','piriformis_stretch_seated','calf_stretch_standing','pec_stretch_wall','supine_twist',
  'seated_forward_fold','quad_stretch_side_lying','shoulder_cross_body_stretch','lizard_hip_flexor','thread_the_needle_stretch',
  'frog_stretch','reclined_hand_toe_hold','low_lunge_stretch',
  'arm_circles','band_pull_apart','leg_swings_front','leg_swings_side','hip_circles','ankle_circles','wrist_circles',
  'scapular_slides','band_shoulder_dislocation','dead_bug_prep','bird_dog_prep','glute_bridge_hold','inchworm',
  'lateral_lunge_shift','open_books','quadruped_rock','prone_extension','wall_slide'
)
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- Primary muscles tags (where tag exists)
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
CROSS JOIN LATERAL unnest(e.primary_muscles) AS mus(s)
JOIN public.exercise_tags t ON t.slug = mus.s
WHERE e.slug IN (
  'seated_hamstring_stretch','reclined_figure_four','lat_stretch_kneeling','triceps_stretch_overhead','childs_pose',
  'kneeling_hip_flexor_stretch','piriformis_stretch_seated','calf_stretch_standing','pec_stretch_wall','supine_twist',
  'seated_forward_fold','quad_stretch_side_lying','shoulder_cross_body_stretch','lizard_hip_flexor','thread_the_needle_stretch',
  'frog_stretch','reclined_hand_toe_hold','low_lunge_stretch',
  'arm_circles','band_pull_apart','leg_swings_front','leg_swings_side','hip_circles','ankle_circles','wrist_circles',
  'scapular_slides','band_shoulder_dislocation','dead_bug_prep','bird_dog_prep','glute_bridge_hold','inchworm',
  'lateral_lunge_shift','open_books','quadruped_rock','prone_extension','wall_slide'
)
AND EXISTS (SELECT 1 FROM public.exercise_tags t2 WHERE t2.slug = mus.s)
ON CONFLICT (exercise_id, tag_id) DO NOTHING;
