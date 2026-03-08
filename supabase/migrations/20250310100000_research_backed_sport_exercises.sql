-- Research-backed sport prep: quality relevance (no transfer), sport exercise tags, exercise→sport tagging.
-- Run after: 20250301000007 (canonical sports), 20250304100000 (exercise library expansion).
-- Uses only speed_agility, power, conditioning, durability_resilience (transfer omitted by design).

-- ============== 1) SPORT_QUALITY_MAP (all canonical sports, 4 qualities only) ==============
-- Relevance: 1 = high, 2 = medium, 3 = low. No 'transfer' quality.
WITH map_rows(sport_slug, quality_slug, relevance) AS (
  VALUES
    -- Endurance
    ('road_running', 'speed_agility', 2),
    ('road_running', 'power', 2),
    ('road_running', 'conditioning', 1),
    ('road_running', 'durability_resilience', 1),
    ('trail_running', 'speed_agility', 2),
    ('trail_running', 'power', 2),
    ('trail_running', 'conditioning', 1),
    ('trail_running', 'durability_resilience', 1),
    ('ultra_running', 'speed_agility', 3),
    ('ultra_running', 'power', 3),
    ('ultra_running', 'conditioning', 1),
    ('ultra_running', 'durability_resilience', 1),
    ('hiking_backpacking', 'speed_agility', 3),
    ('hiking_backpacking', 'power', 3),
    ('hiking_backpacking', 'conditioning', 1),
    ('hiking_backpacking', 'durability_resilience', 1),
    ('rucking', 'speed_agility', 3),
    ('rucking', 'power', 3),
    ('rucking', 'conditioning', 1),
    ('rucking', 'durability_resilience', 1),
    ('cycling_road', 'speed_agility', 3),
    ('cycling_road', 'power', 2),
    ('cycling_road', 'conditioning', 1),
    ('cycling_road', 'durability_resilience', 2),
    ('cycling_mtb', 'speed_agility', 2),
    ('cycling_mtb', 'power', 2),
    ('cycling_mtb', 'conditioning', 1),
    ('cycling_mtb', 'durability_resilience', 2),
    ('swimming_open_water', 'speed_agility', 3),
    ('swimming_open_water', 'power', 2),
    ('swimming_open_water', 'conditioning', 1),
    ('swimming_open_water', 'durability_resilience', 2),
    ('triathlon', 'speed_agility', 3),
    ('triathlon', 'power', 3),
    ('triathlon', 'conditioning', 1),
    ('triathlon', 'durability_resilience', 1),
    ('rowing_erg', 'speed_agility', 3),
    ('rowing_erg', 'power', 2),
    ('rowing_erg', 'conditioning', 1),
    ('rowing_erg', 'durability_resilience', 2),
    ('xc_skiing', 'speed_agility', 2),
    ('xc_skiing', 'power', 2),
    ('xc_skiing', 'conditioning', 1),
    ('xc_skiing', 'durability_resilience', 2),
    ('ocr_spartan', 'speed_agility', 2),
    ('ocr_spartan', 'power', 2),
    ('ocr_spartan', 'conditioning', 1),
    ('ocr_spartan', 'durability_resilience', 1),
    ('hyrox', 'speed_agility', 2),
    ('hyrox', 'power', 2),
    ('hyrox', 'conditioning', 1),
    ('hyrox', 'durability_resilience', 1),
    ('tactical_fitness', 'speed_agility', 2),
    ('tactical_fitness', 'power', 2),
    ('tactical_fitness', 'conditioning', 1),
    ('tactical_fitness', 'durability_resilience', 1),
    -- Strength/Power
    ('general_strength', 'speed_agility', 3),
    ('general_strength', 'power', 1),
    ('general_strength', 'conditioning', 2),
    ('general_strength', 'durability_resilience', 1),
    ('olympic_weightlifting', 'speed_agility', 2),
    ('olympic_weightlifting', 'power', 1),
    ('olympic_weightlifting', 'conditioning', 2),
    ('olympic_weightlifting', 'durability_resilience', 1),
    ('crossfit', 'speed_agility', 2),
    ('crossfit', 'power', 1),
    ('crossfit', 'conditioning', 1),
    ('crossfit', 'durability_resilience', 1),
    ('bodybuilding', 'speed_agility', 3),
    ('bodybuilding', 'power', 2),
    ('bodybuilding', 'conditioning', 2),
    ('bodybuilding', 'durability_resilience', 2),
    ('strongman', 'speed_agility', 2),
    ('strongman', 'power', 1),
    ('strongman', 'conditioning', 2),
    ('strongman', 'durability_resilience', 1),
    ('track_sprinting', 'speed_agility', 1),
    ('track_sprinting', 'power', 1),
    ('track_sprinting', 'conditioning', 2),
    ('track_sprinting', 'durability_resilience', 2),
    ('vertical_jump', 'speed_agility', 1),
    ('vertical_jump', 'power', 1),
    ('vertical_jump', 'conditioning', 2),
    ('vertical_jump', 'durability_resilience', 2),
    -- Mountain/Snow
    ('alpine_skiing', 'speed_agility', 2),
    ('alpine_skiing', 'power', 1),
    ('alpine_skiing', 'conditioning', 2),
    ('alpine_skiing', 'durability_resilience', 1),
    ('backcountry_skiing', 'speed_agility', 2),
    ('backcountry_skiing', 'power', 2),
    ('backcountry_skiing', 'conditioning', 1),
    ('backcountry_skiing', 'durability_resilience', 1),
    ('snowboarding', 'speed_agility', 2),
    ('snowboarding', 'power', 2),
    ('snowboarding', 'conditioning', 2),
    ('snowboarding', 'durability_resilience', 1),
    ('splitboarding', 'speed_agility', 2),
    ('splitboarding', 'power', 2),
    ('splitboarding', 'conditioning', 1),
    ('splitboarding', 'durability_resilience', 1),
    ('mountaineering', 'speed_agility', 3),
    ('mountaineering', 'power', 3),
    ('mountaineering', 'conditioning', 1),
    ('mountaineering', 'durability_resilience', 1),
    ('ice_climbing', 'speed_agility', 2),
    ('ice_climbing', 'power', 2),
    ('ice_climbing', 'conditioning', 2),
    ('ice_climbing', 'durability_resilience', 1),
    -- Court/Field
    ('soccer', 'speed_agility', 1),
    ('soccer', 'power', 2),
    ('soccer', 'conditioning', 1),
    ('soccer', 'durability_resilience', 2),
    ('basketball', 'speed_agility', 1),
    ('basketball', 'power', 1),
    ('basketball', 'conditioning', 2),
    ('basketball', 'durability_resilience', 2),
    ('tennis', 'speed_agility', 1),
    ('tennis', 'power', 2),
    ('tennis', 'conditioning', 2),
    ('tennis', 'durability_resilience', 2),
    ('pickleball', 'speed_agility', 2),
    ('pickleball', 'power', 2),
    ('pickleball', 'conditioning', 2),
    ('pickleball', 'durability_resilience', 2),
    ('volleyball_indoor', 'speed_agility', 2),
    ('volleyball_indoor', 'power', 1),
    ('volleyball_indoor', 'conditioning', 2),
    ('volleyball_indoor', 'durability_resilience', 2),
    ('volleyball_beach', 'speed_agility', 2),
    ('volleyball_beach', 'power', 1),
    ('volleyball_beach', 'conditioning', 2),
    ('volleyball_beach', 'durability_resilience', 2),
    ('flag_football', 'speed_agility', 1),
    ('flag_football', 'power', 2),
    ('flag_football', 'conditioning', 1),
    ('flag_football', 'durability_resilience', 2),
    ('american_football', 'speed_agility', 1),
    ('american_football', 'power', 1),
    ('american_football', 'conditioning', 2),
    ('american_football', 'durability_resilience', 1),
    ('rugby', 'speed_agility', 2),
    ('rugby', 'power', 1),
    ('rugby', 'conditioning', 1),
    ('rugby', 'durability_resilience', 1),
    ('lacrosse', 'speed_agility', 1),
    ('lacrosse', 'power', 2),
    ('lacrosse', 'conditioning', 1),
    ('lacrosse', 'durability_resilience', 2),
    ('baseball_softball', 'speed_agility', 2),
    ('baseball_softball', 'power', 1),
    ('baseball_softball', 'conditioning', 3),
    ('baseball_softball', 'durability_resilience', 2),
    ('golf', 'speed_agility', 2),
    ('golf', 'power', 2),
    ('golf', 'conditioning', 3),
    ('golf', 'durability_resilience', 2),
    -- Combat
    ('boxing', 'speed_agility', 1),
    ('boxing', 'power', 1),
    ('boxing', 'conditioning', 1),
    ('boxing', 'durability_resilience', 2),
    ('muay_thai', 'speed_agility', 1),
    ('muay_thai', 'power', 1),
    ('muay_thai', 'conditioning', 1),
    ('muay_thai', 'durability_resilience', 2),
    ('mma', 'speed_agility', 1),
    ('mma', 'power', 1),
    ('mma', 'conditioning', 1),
    ('mma', 'durability_resilience', 1),
    ('bjj', 'speed_agility', 2),
    ('bjj', 'power', 2),
    ('bjj', 'conditioning', 1),
    ('bjj', 'durability_resilience', 1),
    ('wrestling', 'speed_agility', 1),
    ('wrestling', 'power', 1),
    ('wrestling', 'conditioning', 1),
    ('wrestling', 'durability_resilience', 1),
    ('judo', 'speed_agility', 1),
    ('judo', 'power', 1),
    ('judo', 'conditioning', 1),
    ('judo', 'durability_resilience', 1),
    -- Water/Wind
    ('surfing', 'speed_agility', 2),
    ('surfing', 'power', 2),
    ('surfing', 'conditioning', 2),
    ('surfing', 'durability_resilience', 2),
    ('sup', 'speed_agility', 3),
    ('sup', 'power', 3),
    ('sup', 'conditioning', 1),
    ('sup', 'durability_resilience', 2),
    ('kite_wind_surf', 'speed_agility', 2),
    ('kite_wind_surf', 'power', 2),
    ('kite_wind_surf', 'conditioning', 2),
    ('kite_wind_surf', 'durability_resilience', 2),
    -- Climbing
    ('rock_bouldering', 'speed_agility', 2),
    ('rock_bouldering', 'power', 1),
    ('rock_bouldering', 'conditioning', 2),
    ('rock_bouldering', 'durability_resilience', 1),
    ('rock_sport_lead', 'speed_agility', 2),
    ('rock_sport_lead', 'power', 2),
    ('rock_sport_lead', 'conditioning', 1),
    ('rock_sport_lead', 'durability_resilience', 1),
    ('rock_trad', 'speed_agility', 3),
    ('rock_trad', 'power', 2),
    ('rock_trad', 'conditioning', 1),
    ('rock_trad', 'durability_resilience', 1)
),
resolved AS (
  SELECT s.id AS sport_id, q.id AS quality_id, m.relevance
  FROM map_rows m
  JOIN public.sports s ON s.slug = m.sport_slug
  JOIN public.sport_qualities q ON q.slug = m.quality_slug
)
INSERT INTO public.sport_quality_map (sport_id, quality_id, relevance)
SELECT sport_id, quality_id, relevance FROM resolved
ON CONFLICT (sport_id, quality_id) DO UPDATE SET relevance = EXCLUDED.relevance;

-- ============== 2) EXERCISE_TAGS: sport tags for each canonical sport ==============
-- Only insert tags that don't already exist (we keep sport_climbing, sport_running, etc.).
INSERT INTO public.exercise_tags (slug, name, tag_group, sort_order, weight)
SELECT 'sport_' || s.slug, s.name, 'sport', 98 + (row_number() OVER (ORDER BY s.category, s.slug)), 0.9
FROM public.sports s
WHERE NOT EXISTS (SELECT 1 FROM public.exercise_tags t WHERE t.slug = 'sport_' || s.slug)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, tag_group = EXCLUDED.tag_group, sort_order = EXCLUDED.sort_order, weight = COALESCE(exercise_tags.weight, EXCLUDED.weight);

-- ============== 3) NEW EXERCISES (research-backed additions) ==============
INSERT INTO public.exercises (slug, name, primary_muscles, secondary_muscles, equipment, modalities, movement_pattern, is_active)
VALUES
  ('wall_ball', 'Wall Ball Shot', ARRAY['legs','push','core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['power','conditioning'], 'squat', true),
  ('medball_rotational_throw', 'Medicine Ball Rotational Throw', ARRAY['core'], ARRAY['legs','push'], ARRAY['bodyweight'], ARRAY['power'], 'rotate', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  equipment = EXCLUDED.equipment,
  modalities = EXCLUDED.modalities,
  movement_pattern = EXCLUDED.movement_pattern,
  is_active = EXCLUDED.is_active;

-- Base tag mappings for new exercises (movement, modality, muscles)
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = e.movement_pattern
WHERE e.slug IN ('wall_ball', 'medball_rotational_throw')
ON CONFLICT (exercise_id, tag_id) DO NOTHING;
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
CROSS JOIN LATERAL unnest(e.modalities) AS mod(s)
JOIN public.exercise_tags t ON t.slug = mod.s
WHERE e.slug IN ('wall_ball', 'medball_rotational_throw')
ON CONFLICT (exercise_id, tag_id) DO NOTHING;
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
CROSS JOIN LATERAL unnest(e.primary_muscles) AS mus(s)
JOIN public.exercise_tags t ON t.slug = mus.s
WHERE e.slug IN ('wall_ball', 'medball_rotational_throw')
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- ============== 4) EXERCISE → SPORT TAGGING (research-backed) ==============
-- Format: (exercise_slug, sport_tag_slug). sport_tag_slug = 'sport_' || sport slug.
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id
FROM (VALUES
  -- Climbing (rock_bouldering, rock_sport_lead, rock_trad)
  ('pullup', 'sport_rock_bouldering'), ('pullup', 'sport_rock_sport_lead'), ('pullup', 'sport_rock_trad'),
  ('chinup', 'sport_rock_bouldering'), ('chinup', 'sport_rock_sport_lead'),
  ('lat_pulldown', 'sport_rock_bouldering'), ('lat_pulldown', 'sport_rock_sport_lead'),
  ('db_row', 'sport_rock_bouldering'), ('barbell_row', 'sport_rock_bouldering'), ('cable_row', 'sport_rock_bouldering'),
  ('barbell_deadlift', 'sport_rock_bouldering'), ('rdl_dumbbell', 'sport_rock_bouldering'),
  ('plank', 'sport_rock_bouldering'), ('dead_bug', 'sport_rock_bouldering'), ('pallof_hold', 'sport_rock_bouldering'),
  ('face_pull', 'sport_rock_bouldering'), ('face_pull', 'sport_rock_sport_lead'), ('band_pullapart', 'sport_rock_bouldering'),
  ('ytw', 'sport_rock_bouldering'), ('wrist_curl', 'sport_rock_bouldering'), ('rower', 'sport_rock_sport_lead'),
  ('scapular_push_up', 'sport_rock_bouldering'), ('scapular_push_up', 'sport_rock_sport_lead'),
  -- Running (road, trail, ultra)
  ('barbell_back_squat', 'sport_road_running'), ('front_squat', 'sport_road_running'), ('rdl_dumbbell', 'sport_road_running'),
  ('barbell_rdl', 'sport_road_running'), ('single_leg_rdl', 'sport_road_running'), ('hip_thrust', 'sport_road_running'),
  ('glute_bridge', 'sport_road_running'), ('calf_raise', 'sport_road_running'), ('stepup', 'sport_road_running'),
  ('split_squat', 'sport_road_running'), ('lateral_lunge', 'sport_road_running'), ('box_jump', 'sport_road_running'),
  ('jump_squat', 'sport_road_running'), ('plank', 'sport_road_running'), ('dead_bug', 'sport_road_running'),
  ('pallof_hold', 'sport_road_running'), ('side_plank', 'sport_road_running'), ('tibialis_raise', 'sport_road_running'),
  ('ankle_dorsiflexion_stretch', 'sport_road_running'), ('banded_ankle_mob', 'sport_road_running'),
  ('barbell_back_squat', 'sport_trail_running'), ('single_leg_rdl', 'sport_trail_running'), ('stepup', 'sport_trail_running'),
  ('box_step_up', 'sport_trail_running'), ('incline_treadmill_walk', 'sport_trail_running'), ('lateral_lunge', 'sport_trail_running'),
  ('tibialis_raise', 'sport_trail_running'), ('ankle_dorsiflexion_stretch', 'sport_trail_running'),
  -- Skiing (alpine, backcountry, snowboarding, splitboarding)
  ('goblet_squat', 'sport_alpine_skiing'), ('barbell_back_squat', 'sport_alpine_skiing'), ('split_squat', 'sport_alpine_skiing'),
  ('bulgarian_split_squat', 'sport_alpine_skiing'), ('walking_lunge', 'sport_alpine_skiing'), ('lateral_lunge', 'sport_alpine_skiing'),
  ('single_leg_rdl', 'sport_alpine_skiing'), ('stepup', 'sport_alpine_skiing'), ('box_step_up', 'sport_alpine_skiing'),
  ('plank', 'sport_alpine_skiing'), ('side_plank', 'sport_alpine_skiing'), ('pallof_hold', 'sport_alpine_skiing'),
  ('dead_bug', 'sport_alpine_skiing'), ('bird_dog', 'sport_alpine_skiing'), ('turkish_get_up', 'sport_alpine_skiing'),
  ('ski_erg', 'sport_alpine_skiing'), ('incline_treadmill_walk', 'sport_alpine_skiing'),
  ('goblet_squat', 'sport_backcountry_skiing'), ('stepup', 'sport_backcountry_skiing'), ('box_step_up', 'sport_backcountry_skiing'),
  ('incline_treadmill_walk', 'sport_backcountry_skiing'), ('stair_climber', 'sport_backcountry_skiing'),
  ('goblet_squat', 'sport_snowboarding'), ('split_squat', 'sport_snowboarding'), ('lateral_lunge', 'sport_snowboarding'),
  ('single_leg_rdl', 'sport_snowboarding'), ('plank', 'sport_snowboarding'), ('side_plank', 'sport_snowboarding'),
  -- Hyrox / OCR
  ('barbell_back_squat', 'sport_hyrox'), ('front_squat', 'sport_hyrox'), ('rdl_dumbbell', 'sport_hyrox'), ('barbell_deadlift', 'sport_hyrox'),
  ('walking_lunge', 'sport_hyrox'), ('sled_push', 'sport_hyrox'), ('sled_drag', 'sport_hyrox'), ('farmer_carry', 'sport_hyrox'),
  ('rower', 'sport_hyrox'), ('rower_steady', 'sport_hyrox'), ('rower_intervals_30_30', 'sport_hyrox'),
  ('burpee', 'sport_hyrox'), ('burpee_box_jump', 'sport_hyrox'), ('wall_ball', 'sport_hyrox'),
  ('barbell_back_squat', 'sport_ocr_spartan'), ('walking_lunge', 'sport_ocr_spartan'), ('sled_push', 'sport_ocr_spartan'),
  ('sled_drag', 'sport_ocr_spartan'), ('farmer_carry', 'sport_ocr_spartan'), ('rower', 'sport_ocr_spartan'),
  ('burpee', 'sport_ocr_spartan'), ('burpee_box_jump', 'sport_ocr_spartan'), ('wall_ball', 'sport_ocr_spartan'),
  -- Soccer / Basketball / Court
  ('barbell_back_squat', 'sport_soccer'), ('front_squat', 'sport_soccer'), ('rdl_dumbbell', 'sport_soccer'), ('barbell_rdl', 'sport_soccer'),
  ('walking_lunge', 'sport_soccer'), ('nordic_curl', 'sport_soccer'), ('calf_raise', 'sport_soccer'),
  ('squat_clean', 'sport_soccer'), ('hang_clean', 'sport_soccer'), ('box_jump', 'sport_soccer'), ('jump_squat', 'sport_soccer'),
  ('lateral_lunge', 'sport_soccer'), ('banded_walk', 'sport_soccer'), ('stepup', 'sport_soccer'),
  ('bench_press_barbell', 'sport_soccer'), ('pullup', 'sport_soccer'), ('barbell_row', 'sport_soccer'), ('oh_press', 'sport_soccer'),
  ('face_pull', 'sport_soccer'), ('cable_woodchop', 'sport_soccer'),
  ('barbell_back_squat', 'sport_basketball'), ('bulgarian_split_squat', 'sport_basketball'), ('calf_raise', 'sport_basketball'),
  ('jump_squat', 'sport_basketball'), ('box_jump', 'sport_basketball'), ('ytw', 'sport_basketball'), ('band_pullapart', 'sport_basketball'),
  ('face_pull', 'sport_basketball'), ('t_spine_rotation', 'sport_basketball'),
  -- Tennis / Golf (rotational)
  ('cable_woodchop', 'sport_tennis'), ('pallof_hold', 'sport_tennis'), ('pallof_press', 'sport_tennis'),
  ('medball_slam', 'sport_tennis'), ('medball_rotational_throw', 'sport_tennis'), ('russian_twist', 'sport_tennis'),
  ('cable_woodchop', 'sport_golf'), ('pallof_hold', 'sport_golf'), ('medball_rotational_throw', 'sport_golf'),
  ('russian_twist', 'sport_golf'),
  -- Volleyball
  ('barbell_back_squat', 'sport_volleyball_indoor'), ('bulgarian_split_squat', 'sport_volleyball_indoor'), ('calf_raise', 'sport_volleyball_indoor'),
  ('jump_squat', 'sport_volleyball_indoor'), ('box_jump', 'sport_volleyball_indoor'),
  ('ytw', 'sport_volleyball_indoor'), ('band_pullapart', 'sport_volleyball_indoor'), ('face_pull', 'sport_volleyball_indoor'),
  ('t_spine_rotation', 'sport_volleyball_indoor'),
  ('barbell_back_squat', 'sport_volleyball_beach'), ('jump_squat', 'sport_volleyball_beach'), ('box_jump', 'sport_volleyball_beach'),
  ('face_pull', 'sport_volleyball_beach'),
  -- American football / Rugby / Flag football
  ('barbell_back_squat', 'sport_american_football'), ('trap_bar_deadlift', 'sport_american_football'), ('power_snatch', 'sport_american_football'),
  ('squat_clean', 'sport_american_football'), ('hang_clean', 'sport_american_football'), ('bench_press_barbell', 'sport_american_football'),
  ('barbell_row', 'sport_american_football'), ('pullup', 'sport_american_football'),
  ('barbell_deadlift', 'sport_rugby'), ('barbell_back_squat', 'sport_rugby'), ('bench_press_barbell', 'sport_rugby'),
  ('barbell_row', 'sport_rugby'), ('pullup', 'sport_rugby'), ('farmer_carry', 'sport_rugby'),
  ('lateral_lunge', 'sport_flag_football'), ('squat_clean', 'sport_flag_football'), ('box_jump', 'sport_flag_football'),
  -- Baseball/Softball
  ('medball_rotational_throw', 'sport_baseball_softball'), ('cable_woodchop', 'sport_baseball_softball'),
  ('pallof_press', 'sport_baseball_softball'), ('barbell_row', 'sport_baseball_softball'),
  -- BJJ / Wrestling / MMA / Boxing
  ('barbell_deadlift', 'sport_bjj'), ('rdl_dumbbell', 'sport_bjj'), ('barbell_back_squat', 'sport_bjj'),
  ('pullup', 'sport_bjj'), ('barbell_row', 'sport_bjj'), ('bench_press_barbell', 'sport_bjj'), ('push_up', 'sport_bjj'),
  ('kb_swing', 'sport_bjj'), ('single_arm_swing', 'sport_bjj'), ('kb_clean', 'sport_bjj'), ('farmer_carry', 'sport_bjj'),
  ('barbell_deadlift', 'sport_wrestling'), ('barbell_back_squat', 'sport_wrestling'), ('pullup', 'sport_wrestling'),
  ('barbell_row', 'sport_wrestling'), ('kb_swing', 'sport_wrestling'),
  ('trap_bar_deadlift', 'sport_boxing'), ('close_grip_bench', 'sport_boxing'), ('front_squat', 'sport_boxing'),
  ('kneeling_landmine_press', 'sport_boxing'), ('medball_slam', 'sport_boxing'), ('box_jump', 'sport_boxing'),
  ('db_row', 'sport_boxing'), ('band_pullapart', 'sport_boxing'),
  ('barbell_deadlift', 'sport_mma'), ('barbell_back_squat', 'sport_mma'), ('pullup', 'sport_mma'), ('kb_swing', 'sport_mma'),
  ('barbell_deadlift', 'sport_judo'), ('barbell_back_squat', 'sport_judo'), ('pullup', 'sport_judo'), ('kb_swing', 'sport_judo'),
  ('barbell_deadlift', 'sport_muay_thai'), ('push_up', 'sport_muay_thai'), ('kb_swing', 'sport_muay_thai'),
  -- Triathlon / Swimming / Rowing / Cycling
  ('barbell_back_squat', 'sport_triathlon'), ('rdl_dumbbell', 'sport_triathlon'), ('single_leg_rdl', 'sport_triathlon'),
  ('hip_thrust', 'sport_triathlon'), ('pullup', 'sport_triathlon'), ('push_up', 'sport_triathlon'), ('plank', 'sport_triathlon'),
  ('rower', 'sport_triathlon'), ('assault_bike', 'sport_triathlon'), ('zone2_bike', 'sport_triathlon'), ('zone2_treadmill', 'sport_triathlon'),
  ('pullup', 'sport_swimming_open_water'), ('push_up', 'sport_swimming_open_water'), ('bench_press_barbell', 'sport_swimming_open_water'),
  ('plank', 'sport_swimming_open_water'), ('russian_twist', 'sport_swimming_open_water'), ('barbell_back_squat', 'sport_swimming_open_water'),
  ('rdl_dumbbell', 'sport_swimming_open_water'), ('walking_lunge', 'sport_swimming_open_water'), ('jump_squat', 'sport_swimming_open_water'),
  ('rower', 'sport_rowing_erg'), ('rower_steady', 'sport_rowing_erg'), ('rower_intervals_30_30', 'sport_rowing_erg'),
  ('barbell_back_squat', 'sport_cycling_road'), ('rdl_dumbbell', 'sport_cycling_road'), ('single_leg_rdl', 'sport_cycling_road'),
  ('zone2_bike', 'sport_cycling_road'), ('assault_bike', 'sport_cycling_road'),
  ('barbell_back_squat', 'sport_cycling_mtb'), ('rdl_dumbbell', 'sport_cycling_mtb'), ('lateral_lunge', 'sport_cycling_mtb'),
  -- Surfing
  ('burpee', 'sport_surfing'), ('push_up', 'sport_surfing'), ('walking_lunge', 'sport_surfing'), ('goblet_squat', 'sport_surfing'),
  ('plank', 'sport_surfing'), ('pike_push_up', 'sport_surfing'), ('rower', 'sport_surfing'), ('ski_erg', 'sport_surfing'),
  -- Hiking / Rucking / Mountaineering
  ('stepup', 'sport_hiking_backpacking'), ('box_step_up', 'sport_hiking_backpacking'), ('incline_treadmill_walk', 'sport_hiking_backpacking'),
  ('goblet_squat', 'sport_hiking_backpacking'), ('single_leg_rdl', 'sport_hiking_backpacking'), ('farmer_carry', 'sport_hiking_backpacking'),
  ('farmer_carry', 'sport_rucking'), ('suitcase_carry', 'sport_rucking'), ('stepup', 'sport_rucking'),
  ('incline_treadmill_walk', 'sport_mountaineering'), ('stepup', 'sport_mountaineering'), ('farmer_carry', 'sport_mountaineering'),
  -- Track sprinting / Vertical jump
  ('squat_clean', 'sport_track_sprinting'), ('power_snatch', 'sport_track_sprinting'), ('box_jump', 'sport_track_sprinting'),
  ('jump_squat', 'sport_track_sprinting'), ('barbell_back_squat', 'sport_track_sprinting'), ('nordic_curl', 'sport_track_sprinting'),
  ('barbell_back_squat', 'sport_vertical_jump'), ('jump_squat', 'sport_vertical_jump'), ('box_jump', 'sport_vertical_jump'),
  ('bulgarian_split_squat', 'sport_vertical_jump'), ('calf_raise', 'sport_vertical_jump'),
  -- XC skiing
  ('ski_erg', 'sport_xc_skiing'), ('ski_erg_steady', 'sport_xc_skiing'), ('ski_erg_intervals', 'sport_xc_skiing'),
  ('rower', 'sport_xc_skiing'), ('incline_treadmill_walk', 'sport_xc_skiing'),
  -- Tactical
  ('pullup', 'sport_tactical_fitness'), ('push_up', 'sport_tactical_fitness'), ('burpee', 'sport_tactical_fitness'),
  ('rower', 'sport_tactical_fitness'), ('farmer_carry', 'sport_tactical_fitness'),
  -- Ice climbing
  ('pullup', 'sport_ice_climbing'), ('face_pull', 'sport_ice_climbing'), ('wrist_curl', 'sport_ice_climbing'),
  ('plank', 'sport_ice_climbing'), ('oh_press', 'sport_ice_climbing')
) AS v(ex_slug, tag_slug)
JOIN public.exercises e ON e.slug = v.ex_slug AND e.is_active = true
JOIN public.exercise_tags t ON t.slug = v.tag_slug
ON CONFLICT (exercise_id, tag_id) DO NOTHING;
