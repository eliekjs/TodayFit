-- Goal coverage enrichment: Endurance and Recovery goal tags.
-- Canvas audit shows: Endurance = 5 exercises, Recovery = 1 exercise with direct goal_tag.
-- These goals rely heavily on sub-focus matching but having near-zero direct goal_tag
-- coverage means the generator goal-match annotation is almost never direct.
--
-- Root cause: The adapter only puts a tag into goal_tags if it matches:
--   ["strength","hypertrophy","endurance","power","mobility","calisthenics","recovery","athleticism"]
-- So exercises need the exact slug "endurance" or "recovery" in their exercise_tags
-- to show up with a direct goal_tag match.
--
-- Evidence:
--   • ACSM (2024): Endurance goal exercises = aerobic conditioning (zone2, threshold, intervals),
--     plus strength accessories that support running economy and durability.
--   • NSCA (2024): Recovery exercises = light movement, mobility, breathing; low CNS load;
--     foam rolling, static stretching, gentle mobility drills per NSCA Recovery chapter.
-- See docs/research/coverage-enrichment-2026.md.

-- ─── 1. Ensure endurance and recovery tags exist as goal tags ─────────────────

INSERT INTO public.exercise_tags (slug, name, tag_group, sort_order, weight)
VALUES
  ('endurance', 'Endurance', 'goal', 10, 1.0),
  ('recovery',  'Recovery',  'goal', 11, 1.0)
ON CONFLICT (slug) DO UPDATE SET
  tag_group = EXCLUDED.tag_group,
  weight = COALESCE(public.exercise_tags.weight, EXCLUDED.weight);

-- ─── 2. Tag endurance exercises with 'endurance' goal tag ────────────────────

-- Primary endurance exercises: zone2 cardio, intervals, threshold work.
-- These should show as direct "endurance" goal matches (modality = conditioning,
-- but the goal_tag 'endurance' is what makes exerciseMatchesDeclaredGoal return true
-- without requiring the modality-based inference path).
WITH endurance_goal_pairs(exercise_slug) AS (
  VALUES
    ('zone2_bike'),
    ('zone2_treadmill'),
    ('zone2_rower'),
    ('zone2_stair_climber'),
    ('rower'),
    ('rower_steady'),
    ('ski_erg'),
    ('assault_bike'),
    ('assault_bike_steady'),
    ('assault_bike_intervals'),
    ('treadmill_incline_walk'),
    ('incline_treadmill_walk'),
    ('running'),
    ('sprint'),
    ('bounding'),
    ('jump_rope'),
    ('rower_intervals'),
    ('rower_intervals_30_30')
)
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id
FROM endurance_goal_pairs p
JOIN public.exercises e ON e.slug = p.exercise_slug AND e.is_active = true
JOIN public.exercise_tags t ON t.slug = 'endurance'
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- ─── 3. Tag recovery exercises with 'recovery' goal tag ─────────────────────

-- Recovery exercises: light mobility, breathing, static stretching, foam rolling.
-- These should be selectable when user has Recovery as primary goal.
-- Evidence: NSCA Recovery — low CNS load, movement quality focus.
WITH recovery_goal_pairs(exercise_slug) AS (
  VALUES
    -- Breathing / parasympathetic activation
    ('breathing_diaphragmatic'),
    ('crocodile_breathing'),
    -- Static stretching
    ('hamstring_stretch'),
    ('standing_hamstring_stretch'),
    ('seated_hamstring_stretch'),
    ('hip_flexor_stretch'),
    ('couch_stretch'),
    ('figure_four_stretch'),
    ('pigeon_pose'),
    ('quad_stretch'),
    ('calf_stretch'),
    ('doorway_chest_stretch'),
    ('cross_body_shoulder_stretch'),
    -- Gentle mobility
    ('cat_camel'),
    ('cat_cow'),
    ('child_pose'),
    ('thread_the_needle'),
    ('open_books'),
    ('t_spine_rotation'),
    ('hip_90_90'),
    ('frog_stretch'),
    ('worlds_greatest_stretch'),
    ('inchworm'),
    ('leg_swings_front'),
    ('leg_swings_side'),
    ('ankle_circles'),
    ('arm_circles'),
    ('hip_circles'),
    ('quadruped_rockback'),
    -- Foam rolling
    ('foam_roll_quads'),
    ('foam_roll_hamstrings'),
    ('foam_roll_it_band'),
    ('foam_roll_thoracic'),
    ('foam_roll_calves'),
    ('foam_roll_lats'),
    -- Light activation / prep
    ('glute_bridge'),
    ('bird_dog'),
    ('dead_bug'),
    ('prone_extension'),
    ('wall_slide'),
    -- Yoga-style
    ('downward_dog'),
    ('cobra_pose'),
    ('forward_fold')
)
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id
FROM recovery_goal_pairs p
JOIN public.exercises e ON e.slug = p.exercise_slug AND e.is_active = true
JOIN public.exercise_tags t ON t.slug = 'recovery'
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- ─── 4. Update modalities for zone2/steady exercises to include 'conditioning' ──

-- Zone2 and steady-state exercises should have conditioning modality so the
-- exerciseMatchesDeclaredGoal inference path (modality === conditioning → endurance) also works.
UPDATE public.exercises
SET modalities = array_append(modalities, 'conditioning')
WHERE slug IN (
  'zone2_bike', 'zone2_treadmill', 'zone2_rower', 'zone2_stair_climber',
  'rower_steady', 'assault_bike_steady', 'incline_treadmill_walk'
)
AND NOT (modalities @> ARRAY['conditioning']::text[])
AND is_active = true;

-- Also update mobility/recovery exercises to have recovery modality
UPDATE public.exercises
SET modalities = array_append(modalities, 'recovery')
WHERE slug IN (
  'cat_camel', 'cat_cow', 'child_pose', 'thread_the_needle', 'open_books',
  'breathing_diaphragmatic', 'foam_roll_quads', 'foam_roll_hamstrings',
  'hip_90_90', 'frog_stretch', 'pigeon_pose', 'couch_stretch',
  'worlds_greatest_stretch', 'inchworm'
)
AND NOT (modalities @> ARRAY['recovery']::text[])
AND is_active = true;
