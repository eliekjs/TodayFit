/* ============================================================
   Sports tags + starter Exercise DB (idempotent)
   - sport_tag_profile: tag vectors per sport (slugs match public.sports from canonical seed)
   - exercise_tag_taxonomy: canonical tag taxonomy (separate from existing exercise_tags)
   - starter_exercises: tag-based exercise catalog (does not replace public.exercises)
   - goal_exercise_relevance: links goals to starter_exercises for ranking
   - Safe to run multiple times (ON CONFLICT upserts)
   ============================================================ */

-- ------------------------------------------------------------
-- 0) Extensions (Supabase usually has this, but idempotent)
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- 1) Sports tag vectors
--    Keyed by sport_slug; slugs must match public.sports (canonical seed).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sport_tag_profile (
  sport_slug text PRIMARY KEY,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sport_tag_profile_tags_gin
  ON public.sport_tag_profile
  USING gin (tags);

INSERT INTO public.sport_tag_profile (sport_slug, tags)
VALUES
  -- Endurance (slugs match 20250301000007_sports_canonical_seed)
  ('road_running',                '["sport","endurance","aerobic","running","pavement","steady_state","tempo","intervals","race_pace","lower_body","calves","achilles_load","knee_load","ankle_load","impact"]'::jsonb),
  ('trail_running',               '["sport","endurance","aerobic","running","trail","hills","uneven_terrain","eccentric_load","ankle_stability","knee_load","impact","durability","descending"]'::jsonb),
  ('ultra_running',               '["sport","endurance","aerobic","running","trail","long_duration","fueling","pacing","durability","feet_care","eccentric_load","recovery_priority"]'::jsonb),
  ('hiking_backpacking',          '["sport","endurance","aerobic","hiking","trail","hills","long_duration","load_bearing_optional","lower_body","glutes","quads","ankle_stability","durability"]'::jsonb),
  ('rucking',                     '["sport","endurance","aerobic","rucking","load_bearing","walking","posture","trunk","hips","feet","durability","low_impact"]'::jsonb),
  ('cycling_road',                '["sport","endurance","aerobic","cycling","road","steady_state","tempo","threshold","lower_body","quads","glutes","low_impact"]'::jsonb),
  ('cycling_mtb',                 '["sport","endurance","aerobic","cycling","mountain_bike","anaerobic_repeats","handling_skill","hills","lower_body","power_endurance","low_impact"]'::jsonb),
  ('swimming_open_water',         '["sport","endurance","aerobic","swimming","technique","upper_body","shoulders","scapular_control","low_impact","breathing"]'::jsonb),
  ('triathlon',                   '["sport","endurance","aerobic","triathlon","swimming","cycling","running","brick_workouts","pacing","durability","recovery_priority"]'::jsonb),
  ('rowing_erg',                  '["sport","endurance","aerobic","rowing","erg","full_body","hinge","posterior_chain","trunk","low_impact","threshold"]'::jsonb),
  ('xc_skiing',                   '["sport","endurance","aerobic","nordic_skiing","full_body","upper_body","lower_body","technique","threshold","cold_exposure_optional"]'::jsonb),
  ('ocr_spartan',                 '["sport","endurance","conditioning","mixed_modal","running","carries","grip","pulling","obstacles","anaerobic_repeats","durability"]'::jsonb),
  ('hyrox',                       '["sport","endurance","conditioning","mixed_modal","running","stations","sled_optional","lunges","carry","rowing","ski_erg_optional","anaerobic_repeats"]'::jsonb),
  ('tactical_fitness',            '["sport","endurance","conditioning","calisthenics","running","rucking_optional","test_prep","work_capacity","durability","recovery_priority"]'::jsonb),

  -- Strength/Power
  ('general_strength',            '["sport","strength","max_strength","barbell","squat","bench","deadlift","hinge","pressing","bracing","low_aerobic"]'::jsonb),
  ('olympic_weightlifting',       '["sport","power","speed_strength","barbell","snatch","clean_and_jerk","triple_extension","technique","mobility","overhead","ankles","hips","wrists"]'::jsonb),
  ('crossfit',                    '["sport","strength","conditioning","mixed_modal","barbell_optional","gymnastics_optional","intervals","work_capacity","full_body","anaerobic_repeats"]'::jsonb),
  ('bodybuilding',                '["sport","hypertrophy","physique","volume","isolation","mind_muscle","pump","gym","progressive_overload","recovery_priority"]'::jsonb),
  ('strongman',                   '["sport","strength","power","carries","odd_object","grip","trunk","work_capacity","posterior_chain"]'::jsonb),
  ('track_sprinting',             '["sport","power","speed","sprinting","acceleration","max_velocity","plyometrics","hamstrings","ankles","tendons","high_neural"]'::jsonb),
  ('vertical_jump',               '["sport","power","plyometrics","jumping","triple_extension","tendon_stiffness","speed_strength","lower_body","landing_mechanics","high_neural"]'::jsonb),

  -- Mountain/Snow/Board
  ('alpine_skiing',               '["sport","mountain","snow","eccentric_load","quads","glutes","trunk","lateral_stability","knee_load","ankle_load","power_endurance","durability"]'::jsonb),
  ('backcountry_skiing',          '["sport","mountain","snow","aerobic","uphill","eccentric_load","quads","glutes","trunk","knee_load","durability","recovery_priority"]'::jsonb),
  ('snowboarding',                '["sport","mountain","snow","eccentric_load","legs","trunk","balance","lateral_stability","knee_load","ankle_load","durability"]'::jsonb),
  ('splitboarding',               '["sport","mountain","snow","aerobic","uphill","eccentric_load","legs","trunk","balance","durability","recovery_priority"]'::jsonb),
  ('mountaineering',              '["sport","mountain","aerobic","hills","load_bearing_optional","altitude_optional","long_duration","durability","ankle_stability","recovery_priority"]'::jsonb),
  ('ice_climbing',                '["sport","mountain","climbing","ice","grip","forearms","shoulders","overhead","technique","cold_exposure","high_isometric"]'::jsonb),

  -- Court/Field
  ('soccer',                      '["sport","field","intermittent","running","cutting","change_of_direction","anaerobic_repeats","aerobic_base","hamstrings","adductors","ankles","knees"]'::jsonb),
  ('basketball',                  '["sport","court","jumping","sprinting","cutting","anaerobic_repeats","calves","achilles_load","knees","ankles","lateral_stability"]'::jsonb),
  ('tennis',                      '["sport","court","lateral","change_of_direction","anaerobic_repeats","shoulders","rotational_power","wrists","forearms"]'::jsonb),
  ('pickleball',                  '["sport","court","lateral","change_of_direction","anaerobic_light","shoulders","forearms","wrists","low_to_moderate_impact"]'::jsonb),
  ('volleyball_indoor',           '["sport","court","jumping","shoulders","overhead","anaerobic_repeats","knees","ankles","landing_mechanics"]'::jsonb),
  ('volleyball_beach',            '["sport","court","sand","jumping","conditioning","ankles","knees","landing_mechanics","shoulders","overhead"]'::jsonb),
  ('flag_football',               '["sport","field","sprinting","cutting","anaerobic_repeats","hamstrings","adductors","change_of_direction"]'::jsonb),
  ('american_football',           '["sport","field","power","sprinting","collision_optional","strength","anaerobic_alactic","hamstrings","neck_optional"]'::jsonb),
  ('rugby',                       '["sport","field","contact","strength","conditioning","anaerobic_repeats","aerobic_base","trunk","neck_optional","durability"]'::jsonb),
  ('lacrosse',                    '["sport","field","intermittent","sprinting","cutting","shoulders","rotational_power","anaerobic_repeats"]'::jsonb),
  ('baseball_softball',           '["sport","field","rotational_power","throwing","shoulders","elbows","sprinting_short","skill"]'::jsonb),
  ('golf',                        '["sport","field","rotational_power","mobility","t_spine","hips","low_impact","skill"]'::jsonb),

  -- Combat/Grappling
  ('boxing',                      '["sport","combat","striking","footwork","conditioning","anaerobic_repeats","aerobic_base","shoulders","wrists","neck_optional"]'::jsonb),
  ('muay_thai',                   '["sport","combat","striking","kicks","conditioning","anaerobic_repeats","hips","shins","trunk","aerobic_base"]'::jsonb),
  ('mma',                         '["sport","combat","mixed","grappling","striking","conditioning","strength_endurance","anaerobic_repeats","mobility","durability"]'::jsonb),
  ('bjj',                         '["sport","combat","grappling","isometric","strength_endurance","mobility","hips","neck_optional","grip","anaerobic_repeats"]'::jsonb),
  ('wrestling',                   '["sport","combat","grappling","power","anaerobic_repeats","strength_endurance","neck_optional","hips","durability"]'::jsonb),
  ('judo',                        '["sport","combat","throws","grip","power","mobility","anaerobic_repeats","shoulders","hips"]'::jsonb),

  -- Water/Wind
  ('surfing',                     '["sport","water","paddling","upper_body","shoulders","trunk","pop_up","anaerobic_bursts","balance"]'::jsonb),
  ('sup',                         '["sport","water","steady_state","aerobic","balance","trunk","shoulders","low_impact"]'::jsonb),
  ('kite_wind_surf',              '["sport","water","wind","balance","trunk","grip","legs","anaerobic_bursts","endurance"]'::jsonb),

  -- Climbing
  ('rock_bouldering',             '["sport","climbing","bouldering","power","strength","finger_strength","grip","pulling","shoulder_stability","high_neural","anaerobic_alactic"]'::jsonb),
  ('rock_sport_lead',             '["sport","climbing","sport","lead","strength_endurance","grip","pulling","forearms","aerobic_support","anaerobic_repeats","pacing"]'::jsonb),
  ('rock_trad',                   '["sport","climbing","trad","endurance","route_finding","mental","grip","pulling","durability","aerobic_support"]'::jsonb)
ON CONFLICT (sport_slug) DO UPDATE SET
  tags = EXCLUDED.tags,
  updated_at = now();

-- ------------------------------------------------------------
-- 2) Canonical exercise tag taxonomy
--    Named exercise_tag_taxonomy to avoid overwriting existing public.exercise_tags.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exercise_tag_taxonomy (
  slug text PRIMARY KEY,
  tag_type text NOT NULL,
  display_name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true
);

INSERT INTO public.exercise_tag_taxonomy (slug, tag_type, display_name, description)
VALUES
  ('strength', 'modality', 'Strength', 'Primarily resistance training to increase force production.'),
  ('hypertrophy', 'modality', 'Hypertrophy', 'Primarily volume-focused training to increase muscle size.'),
  ('conditioning', 'modality', 'Conditioning', 'Energy system development and work capacity.'),
  ('mobility', 'modality', 'Mobility', 'Range of motion and tissue capacity work.'),
  ('prehab', 'modality', 'Prehab', 'Injury prevention / joint capacity work.'),
  ('recovery', 'modality', 'Recovery', 'Low intensity work to restore readiness.'),
  ('barbell', 'equipment', 'Barbell', NULL),
  ('dumbbell', 'equipment', 'Dumbbell', NULL),
  ('kettlebell', 'equipment', 'Kettlebell', NULL),
  ('cable', 'equipment', 'Cable', NULL),
  ('machine', 'equipment', 'Machine', NULL),
  ('bands', 'equipment', 'Bands', NULL),
  ('bodyweight', 'equipment', 'Bodyweight', NULL),
  ('sled', 'equipment', 'Sled', NULL),
  ('rower', 'equipment', 'Rower', NULL),
  ('bike', 'equipment', 'Bike', NULL),
  ('treadmill', 'equipment', 'Treadmill', NULL),
  ('ski_erg', 'equipment', 'SkiErg', NULL),
  ('pullup_bar', 'equipment', 'Pull-up Bar', NULL),
  ('squat_pattern', 'movement_pattern', 'Squat Pattern', 'Knee-dominant lower body pattern.'),
  ('hinge_pattern', 'movement_pattern', 'Hinge Pattern', 'Hip-dominant posterior chain pattern.'),
  ('lunge_pattern', 'movement_pattern', 'Lunge/Step Pattern', 'Single-leg knee/hip pattern.'),
  ('horizontal_push', 'movement_pattern', 'Horizontal Push', NULL),
  ('vertical_push', 'movement_pattern', 'Vertical Push', NULL),
  ('horizontal_pull', 'movement_pattern', 'Horizontal Pull', NULL),
  ('vertical_pull', 'movement_pattern', 'Vertical Pull', NULL),
  ('carry', 'movement_pattern', 'Carry', NULL),
  ('rotation', 'movement_pattern', 'Rotation', NULL),
  ('anti_rotation', 'movement_pattern', 'Anti-Rotation', NULL),
  ('anti_extension', 'movement_pattern', 'Anti-Extension', NULL),
  ('quads', 'body_part', 'Quads', NULL),
  ('glutes', 'body_part', 'Glutes', NULL),
  ('hamstrings', 'body_part', 'Hamstrings', NULL),
  ('calves', 'body_part', 'Calves', NULL),
  ('back', 'body_part', 'Back', NULL),
  ('lats', 'body_part', 'Lats', NULL),
  ('chest', 'body_part', 'Chest', NULL),
  ('shoulders', 'body_part', 'Shoulders', NULL),
  ('rear_delts', 'body_part', 'Rear Delts', NULL),
  ('biceps', 'body_part', 'Biceps', NULL),
  ('triceps', 'body_part', 'Triceps', NULL),
  ('forearms_grip', 'body_part', 'Forearms/Grip', NULL),
  ('core', 'body_part', 'Core', NULL),
  ('hips', 'body_part', 'Hips', NULL),
  ('ankles', 'body_part', 'Ankles', NULL),
  ('t_spine', 'body_part', 'Thoracic Spine', NULL),
  ('aerobic', 'energy_system', 'Aerobic', NULL),
  ('anaerobic', 'energy_system', 'Anaerobic', NULL),
  ('alactic', 'energy_system', 'Alactic', 'Short burst / high power output.'),
  ('avoid_shoulder_overhead', 'contraindication', 'Avoid Overhead Shoulder Loading', NULL),
  ('avoid_shoulder_extension', 'contraindication', 'Avoid Shoulder Extension', NULL),
  ('avoid_external_rotation', 'contraindication', 'Avoid External Rotation Stress', NULL),
  ('avoid_knee_deep_flexion', 'contraindication', 'Avoid Deep Knee Flexion', NULL),
  ('avoid_spine_flexion', 'contraindication', 'Avoid Loaded Spine Flexion', NULL)
ON CONFLICT (slug) DO UPDATE SET
  tag_type = EXCLUDED.tag_type,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_active = true;

-- ------------------------------------------------------------
-- 3) Starter exercise database (separate from public.exercises)
--    public.exercises is used by the existing generator; this table
--    is for tag-based matching and goal_exercise_relevance.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.starter_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  modality text NOT NULL,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  contraindications jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS starter_exercises_slug ON public.starter_exercises(slug);
CREATE INDEX IF NOT EXISTS starter_exercises_tags_gin ON public.starter_exercises USING gin (tags);
CREATE INDEX IF NOT EXISTS starter_exercises_contraindications_gin ON public.starter_exercises USING gin (contraindications);

INSERT INTO public.starter_exercises (slug, name, modality, tags, contraindications)
VALUES
  ('back_squat', 'Back Squat', 'strength', '["strength","barbell","squat_pattern","quads","glutes","core","mobility","ankles","hips"]'::jsonb, '["avoid_knee_deep_flexion"]'::jsonb),
  ('front_squat', 'Front Squat', 'strength', '["strength","barbell","squat_pattern","quads","glutes","core","t_spine","mobility"]'::jsonb, '["avoid_knee_deep_flexion"]'::jsonb),
  ('trap_bar_deadlift', 'Trap Bar Deadlift', 'strength', '["strength","barbell","hinge_pattern","glutes","hamstrings","quads","core"]'::jsonb, '[]'::jsonb),
  ('romanian_deadlift', 'Romanian Deadlift', 'strength', '["strength","barbell","hinge_pattern","glutes","hamstrings","posterior_chain","core"]'::jsonb, '[]'::jsonb),
  ('barbell_bench_press', 'Barbell Bench Press', 'strength', '["strength","barbell","horizontal_push","chest","triceps","shoulders","core"]'::jsonb, '["avoid_shoulder_extension"]'::jsonb),
  ('dumbbell_bench_press', 'Dumbbell Bench Press', 'strength', '["strength","dumbbell","horizontal_push","chest","triceps","shoulders"]'::jsonb, '["avoid_shoulder_extension"]'::jsonb),
  ('chest_supported_row', 'Chest-Supported Row', 'strength', '["strength","dumbbell","machine","horizontal_pull","back","lats","rear_delts","biceps"]'::jsonb, '[]'::jsonb),
  ('one_arm_cable_row', '1-Arm Cable Row', 'strength', '["strength","cable","horizontal_pull","back","lats","core","anti_rotation"]'::jsonb, '[]'::jsonb),
  ('lat_pulldown', 'Lat Pulldown', 'strength', '["strength","machine","vertical_pull","lats","back","biceps"]'::jsonb, '[]'::jsonb),
  ('neutral_grip_pullup', 'Pull-up (Neutral Grip)', 'strength', '["strength","bodyweight","pullup_bar","vertical_pull","lats","back","biceps","forearms_grip"]'::jsonb, '[]'::jsonb),
  ('bulgarian_split_squat', 'Bulgarian Split Squat', 'strength', '["strength","dumbbell","lunge_pattern","quads","glutes","core","hips","balance"]'::jsonb, '["avoid_knee_deep_flexion"]'::jsonb),
  ('step_up', 'Step-Up', 'strength', '["strength","dumbbell","lunge_pattern","quads","glutes","core","hiking","ski","trail","balance"]'::jsonb, '[]'::jsonb),
  ('reverse_lunge', 'Reverse Lunge', 'strength', '["strength","dumbbell","lunge_pattern","glutes","quads","core","hips"]'::jsonb, '[]'::jsonb),
  ('single_leg_rdl', 'Single-Leg RDL', 'strength', '["strength","dumbbell","hinge_pattern","hamstrings","glutes","core","balance","ankles"]'::jsonb, '[]'::jsonb),
  ('standing_calf_raise', 'Standing Calf Raise', 'hypertrophy', '["hypertrophy","machine","calves","ankles","running","jumping"]'::jsonb, '[]'::jsonb),
  ('tibialis_raise', 'Tibialis Raise', 'prehab', '["prehab","bodyweight","bands","ankles","shins","running","trail","ski"]'::jsonb, '[]'::jsonb),
  ('hip_thrust', 'Hip Thrust', 'hypertrophy', '["hypertrophy","barbell","glutes","hinge_pattern","posterior_chain"]'::jsonb, '[]'::jsonb),
  ('hamstring_curl', 'Hamstring Curl (Machine)', 'hypertrophy', '["hypertrophy","machine","hamstrings","posterior_chain"]'::jsonb, '[]'::jsonb),
  ('cable_pallof_press', 'Pallof Press', 'prehab', '["prehab","cable","anti_rotation","core","trunk","hips"]'::jsonb, '[]'::jsonb),
  ('dead_bug', 'Dead Bug', 'prehab', '["prehab","bodyweight","anti_extension","core","trunk"]'::jsonb, '[]'::jsonb),
  ('side_plank', 'Side Plank', 'prehab', '["prehab","bodyweight","core","anti_rotation","hips","shoulders"]'::jsonb, '[]'::jsonb),
  ('scapular_pullup', 'Scapular Pull-up', 'prehab', '["prehab","bodyweight","pullup_bar","scapular_control","shoulders","back","lats","climbing"]'::jsonb, '[]'::jsonb),
  ('face_pull', 'Face Pull', 'prehab', '["prehab","cable","rear_delts","shoulders","upper_back","scapular_control","climbing"]'::jsonb, '[]'::jsonb),
  ('external_rotation_band', 'Band External Rotation', 'prehab', '["prehab","bands","shoulders","rotator_cuff","scapular_control","rehab"]'::jsonb, '["avoid_external_rotation"]'::jsonb),
  ('wrist_extensor_curl', 'Wrist Extensor Curl', 'prehab', '["prehab","dumbbell","forearms_grip","elbow_health","climbing"]'::jsonb, '[]'::jsonb),
  ('farmer_carry', 'Farmer Carry', 'strength', '["strength","dumbbell","carry","forearms_grip","trunk","posture","conditioning","rucking","ocr"]'::jsonb, '[]'::jsonb),
  ('rower_intervals', 'Rower Intervals', 'conditioning', '["conditioning","rower","anaerobic","aerobic","full_body","intervals","hyrox","ocr"]'::jsonb, '[]'::jsonb),
  ('assault_bike_intervals', 'Bike Intervals', 'conditioning', '["conditioning","bike","anaerobic","aerobic","intervals","low_impact","hyrox"]'::jsonb, '[]'::jsonb),
  ('treadmill_incline_walk', 'Incline Treadmill Walk', 'conditioning', '["conditioning","treadmill","aerobic","hills","low_impact","ski_touring","hiking","zone2"]'::jsonb, '[]'::jsonb),
  ('sled_push', 'Sled Push', 'conditioning', '["conditioning","sled","anaerobic","quads","glutes","work_capacity","hyrox"]'::jsonb, '[]'::jsonb),
  ('kettlebell_swing', 'Kettlebell Swing', 'conditioning', '["conditioning","kettlebell","hinge_pattern","posterior_chain","power","anaerobic"]'::jsonb, '["avoid_spine_flexion"]'::jsonb),
  ('ankle_dorsiflexion_mob', 'Ankle Dorsiflexion Mobility', 'mobility', '["mobility","ankles","calves","running","trail","squat_pattern","ski"]'::jsonb, '[]'::jsonb),
  ('hip_flexor_mob', 'Hip Flexor Mobility', 'mobility', '["mobility","hips","lunge_pattern","running","ski","posture"]'::jsonb, '[]'::jsonb),
  ('t_spine_rotation_open_book', 'Open Book (T-Spine Rotation)', 'mobility', '["mobility","t_spine","rotation","shoulders","breathing"]'::jsonb, '[]'::jsonb),
  ('couch_stretch', 'Couch Stretch', 'mobility', '["mobility","hips","quads","knee_flexion","running","cycling","ski"]'::jsonb, '[]'::jsonb),
  ('thoracic_extension_roller', 'Thoracic Extension on Foam Roller', 'mobility', '["mobility","t_spine","posture","overhead_optional","breathing"]'::jsonb, '[]'::jsonb),
  ('pushup_incline', 'Incline Push-up', 'strength', '["strength","bodyweight","horizontal_push","chest","triceps","core"]'::jsonb, '["avoid_shoulder_extension"]'::jsonb),
  ('landmine_press', 'Landmine Press', 'strength', '["strength","barbell","vertical_push","shoulders","triceps","core","scapular_control"]'::jsonb, '["avoid_shoulder_overhead"]'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  modality = EXCLUDED.modality,
  tags = EXCLUDED.tags,
  contraindications = EXCLUDED.contraindications,
  is_active = true;

-- ------------------------------------------------------------
-- 4) Goal–exercise relevance (links goals to starter_exercises)
--    Requires public.goals and public.starter_exercises.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.goal_exercise_relevance (
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.starter_exercises(id) ON DELETE CASCADE,
  relevance numeric NOT NULL DEFAULT 1,
  PRIMARY KEY (goal_id, exercise_id)
);

WITH m AS (
  SELECT * FROM (VALUES
    ('strength', 'back_squat', 3),
    ('strength', 'trap_bar_deadlift', 3),
    ('strength', 'barbell_bench_press', 3),
    ('strength', 'chest_supported_row', 2),
    ('muscle', 'hip_thrust', 3),
    ('muscle', 'hamstring_curl', 3),
    ('muscle', 'dumbbell_bench_press', 2),
    ('endurance', 'treadmill_incline_walk', 2),
    ('endurance', 'rower_intervals', 2),
    ('conditioning', 'assault_bike_intervals', 3),
    ('conditioning', 'rower_intervals', 3),
    ('conditioning', 'sled_push', 3),
    ('mobility', 'ankle_dorsiflexion_mob', 3),
    ('mobility', 'hip_flexor_mob', 3),
    ('mobility', 't_spine_rotation_open_book', 3),
    ('climbing', 'scapular_pullup', 3),
    ('climbing', 'face_pull', 3),
    ('climbing', 'farmer_carry', 2),
    ('trail_running', 'step_up', 3),
    ('trail_running', 'single_leg_rdl', 2),
    ('trail_running', 'standing_calf_raise', 2),
    ('ski', 'step_up', 3),
    ('ski', 'bulgarian_split_squat', 2),
    ('ski', 'tibialis_raise', 2),
    ('physique', 'trap_bar_deadlift', 2),
    ('physique', 'assault_bike_intervals', 2),
    ('resilience', 'dead_bug', 3),
    ('resilience', 'side_plank', 3),
    ('resilience', 'face_pull', 2)
  ) AS v(goal_slug, exercise_slug, relevance)
),
resolved AS (
  SELECT g.id AS goal_id, e.id AS exercise_id, (m.relevance)::numeric AS relevance
  FROM m
  JOIN public.goals g ON g.slug = m.goal_slug
  JOIN public.starter_exercises e ON e.slug = m.exercise_slug
)
INSERT INTO public.goal_exercise_relevance (goal_id, exercise_id, relevance)
SELECT goal_id, exercise_id, relevance
FROM resolved
ON CONFLICT (goal_id, exercise_id) DO UPDATE SET
  relevance = EXCLUDED.relevance;

-- RLS: catalog tables read-only for authenticated
ALTER TABLE public.sport_tag_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_tag_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.starter_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_exercise_relevance ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sport_tag_profile' AND policyname = 'sport_tag_profile_select_authenticated') THEN
    CREATE POLICY "sport_tag_profile_select_authenticated" ON public.sport_tag_profile FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exercise_tag_taxonomy' AND policyname = 'exercise_tag_taxonomy_select_authenticated') THEN
    CREATE POLICY "exercise_tag_taxonomy_select_authenticated" ON public.exercise_tag_taxonomy FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'starter_exercises' AND policyname = 'starter_exercises_select_authenticated') THEN
    CREATE POLICY "starter_exercises_select_authenticated" ON public.starter_exercises FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'goal_exercise_relevance' AND policyname = 'goal_exercise_relevance_select_authenticated') THEN
    CREATE POLICY "goal_exercise_relevance_select_authenticated" ON public.goal_exercise_relevance FOR SELECT TO authenticated USING (true);
  END IF;
END$$;
