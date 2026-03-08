-- Idempotent seed: comprehensive tag universe + large exercise library (150+ exercises) with rich tagging.
-- Run after 20250302100000 (weight column + RPC). Uses ON CONFLICT throughout.

-- ============== TAG UNIVERSE ==============
-- Tag groups: movement_pattern, muscle, modality, equipment, energy, joint_stress, contraindication, sport, general
INSERT INTO public.exercise_tags (slug, name, tag_group, sort_order, weight)
VALUES
  -- movement_pattern (weight 1.2 for ranking)
  ('squat', 'Squat', 'movement_pattern', 1, 1.2),
  ('hinge', 'Hinge', 'movement_pattern', 2, 1.2),
  ('push', 'Push', 'movement_pattern', 3, 1.2),
  ('pull', 'Pull', 'movement_pattern', 4, 1.2),
  ('carry', 'Carry', 'movement_pattern', 5, 1.2),
  ('rotate', 'Rotate', 'movement_pattern', 6, 1.2),
  ('locomotion', 'Locomotion', 'movement_pattern', 7, 1.2),
  -- modality
  ('strength', 'Strength', 'modality', 10, 1.0),
  ('hypertrophy', 'Hypertrophy', 'modality', 11, 1.0),
  ('conditioning', 'Conditioning', 'modality', 12, 1.0),
  ('mobility', 'Mobility', 'modality', 13, 1.0),
  ('power', 'Power', 'modality', 14, 1.0),
  ('recovery', 'Recovery', 'modality', 15, 1.0),
  ('endurance', 'Endurance', 'modality', 16, 1.0),
  -- energy (for soft/hard filter)
  ('energy_low', 'Low energy', 'energy', 20, 1.0),
  ('energy_medium', 'Medium energy', 'energy', 21, 1.0),
  ('energy_high', 'High energy', 'energy', 22, 1.0),
  -- muscle / body
  ('legs', 'Legs', 'muscle', 30, 1.0),
  ('core', 'Core', 'muscle', 31, 1.0),
  ('glutes', 'Glutes', 'muscle', 32, 1.0),
  ('quads', 'Quads', 'muscle', 33, 1.0),
  ('hamstrings', 'Hamstrings', 'muscle', 34, 1.0),
  ('chest', 'Chest', 'muscle', 35, 1.0),
  ('back', 'Back', 'muscle', 36, 1.0),
  ('shoulders', 'Shoulders', 'muscle', 37, 1.0),
  ('lats', 'Lats', 'muscle', 38, 1.0),
  ('triceps', 'Triceps', 'muscle', 39, 1.0),
  ('biceps', 'Biceps', 'muscle', 40, 1.0),
  ('upper_back', 'Upper back', 'muscle', 41, 1.0),
  ('calves', 'Calves', 'muscle', 42, 1.0),
  -- equipment
  ('equipment_barbell', 'Barbell', 'equipment', 50, 0.8),
  ('equipment_dumbbell', 'Dumbbell', 'equipment', 51, 0.8),
  ('equipment_kettlebell', 'Kettlebell', 'equipment', 52, 0.8),
  ('equipment_cable', 'Cable', 'equipment', 53, 0.8),
  ('equipment_bodyweight', 'Bodyweight', 'equipment', 54, 0.8),
  ('equipment_band', 'Band', 'equipment', 55, 0.8),
  ('equipment_machine', 'Machine', 'equipment', 56, 0.8),
  ('equipment_bench', 'Bench', 'equipment', 57, 0.6),
  ('equipment_pullup_bar', 'Pull-up bar', 'equipment', 58, 0.6),
  ('equipment_treadmill', 'Treadmill', 'equipment', 59, 0.6),
  ('equipment_bike', 'Bike', 'equipment', 60, 0.6),
  ('equipment_rower', 'Rower', 'equipment', 61, 0.6),
  ('equipment_trx', 'TRX', 'equipment', 62, 0.6),
  ('equipment_plyo_box', 'Plyo box', 'equipment', 63, 0.6),
  -- joint_stress / intensity
  ('joint_shoulder_overhead', 'Shoulder overhead', 'joint_stress', 70, 1.0),
  ('joint_knee_flexion', 'Knee flexion', 'joint_stress', 71, 1.0),
  ('joint_lumbar', 'Lumbar', 'joint_stress', 72, 1.0),
  ('joint_shoulder_extension', 'Shoulder extension', 'joint_stress', 73, 1.0),
  -- contraindication / friendly (safe for X)
  ('contra_knee', 'Knee concern', 'contraindication', 80, 1.0),
  ('contra_lower_back', 'Lower back concern', 'contraindication', 81, 1.0),
  ('contra_shoulder', 'Shoulder concern', 'contraindication', 82, 1.0),
  ('knee_friendly', 'Knee friendly', 'contraindication', 83, 1.0),
  ('shoulder_friendly', 'Shoulder friendly', 'contraindication', 84, 1.0),
  ('low_back_friendly', 'Lower back friendly', 'contraindication', 85, 1.0),
  -- sport
  ('sport_climbing', 'Climbing', 'sport', 90, 1.0),
  ('sport_running', 'Running', 'sport', 91, 1.0),
  ('sport_skiing', 'Skiing', 'sport', 92, 1.0),
  ('sport_hyrox', 'Hyrox', 'sport', 93, 1.0),
  ('sport_general', 'General fitness', 'sport', 94, 0.5),
  -- general / traits
  ('unilateral', 'Unilateral', 'general', 100, 0.9),
  ('bilateral', 'Bilateral', 'general', 101, 0.9),
  ('compound', 'Compound', 'general', 102, 1.0),
  ('isolation', 'Isolation', 'general', 103, 0.9),
  ('single_leg', 'Single leg', 'general', 104, 1.0),
  ('posterior_chain', 'Posterior chain', 'general', 105, 1.0),
  ('quad_focused', 'Quad focused', 'general', 106, 1.0),
  ('core_stability', 'Core stability', 'general', 107, 1.0),
  ('grip', 'Grip', 'general', 108, 0.8),
  ('scapular_control', 'Scapular control', 'general', 109, 1.0),
  ('anti_rotation', 'Anti-rotation', 'general', 110, 1.0),
  ('low_impact', 'Low impact', 'general', 111, 0.9),
  ('plyometric', 'Plyometric', 'general', 112, 1.0),
  ('thoracic_mobility', 'Thoracic mobility', 'general', 113, 1.0),
  ('hip_mobility', 'Hip mobility', 'general', 114, 1.0),
  ('balance', 'Balance', 'general', 115, 0.8)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tag_group = EXCLUDED.tag_group,
  sort_order = EXCLUDED.sort_order,
  weight = EXCLUDED.weight;

-- Legacy tag slugs (from existing seed) - ensure they exist with tag_group
INSERT INTO public.exercise_tags (slug, name, tag_group, sort_order, weight)
VALUES
  ('quad-focused', 'Quad focused', 'general', 106, 1.0),
  ('posterior chain', 'Posterior chain', 'general', 105, 1.0),
  ('single-leg', 'Single leg', 'general', 104, 1.0),
  ('core stability', 'Core stability', 'general', 107, 1.0),
  ('shoulder-friendly', 'Shoulder friendly', 'contraindication', 84, 1.0),
  ('lat-focused', 'Lat focused', 'muscle', 38, 1.0),
  ('spine-friendly', 'Spine friendly', 'general', 85, 1.0),
  ('uphill conditioning', 'Uphill conditioning', 'general', 116, 0.8),
  ('posture', 'Posture', 'general', 117, 0.8),
  ('shoulder stability', 'Shoulder stability', 'general', 118, 1.0),
  ('grip strength', 'Grip strength', 'general', 108, 1.0)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, tag_group = EXCLUDED.tag_group, sort_order = EXCLUDED.sort_order, weight = COALESCE(EXCLUDED.weight, public.exercise_tags.weight);

-- ============== EXERCISES (expand existing + many new; upsert by slug) ==============
INSERT INTO public.exercises (slug, name, primary_muscles, secondary_muscles, equipment, modalities, movement_pattern, is_active)
VALUES
  ('goblet_squat', 'Goblet Squat', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['dumbbells'], ARRAY['strength','hypertrophy'], 'squat', true),
  ('rdl_dumbbell', 'Dumbbell Romanian Deadlift', ARRAY['legs'], ARRAY['core'], ARRAY['dumbbells'], ARRAY['strength','hypertrophy'], 'hinge', true),
  ('split_squat', 'Rear-Foot Elevated Split Squat', ARRAY['legs'], ARRAY[]::text[], ARRAY['bench','dumbbells'], ARRAY['strength','hypertrophy'], 'squat', true),
  ('bench_press_barbell', 'Barbell Bench Press', ARRAY['push'], ARRAY['core'], ARRAY['barbell','bench','squat_rack'], ARRAY['strength','hypertrophy'], 'push', true),
  ('db_bench', 'Dumbbell Bench Press', ARRAY['push'], ARRAY[]::text[], ARRAY['dumbbells','bench'], ARRAY['strength','hypertrophy'], 'push', true),
  ('oh_press', 'Standing Overhead Press', ARRAY['push','core'], ARRAY[]::text[], ARRAY['barbell'], ARRAY['strength','hypertrophy'], 'push', true),
  ('pullup', 'Pull-up or Assisted Pull-up', ARRAY['pull'], ARRAY['core'], ARRAY['pullup_bar'], ARRAY['strength','hypertrophy'], 'pull', true),
  ('lat_pulldown', 'Lat Pulldown', ARRAY['pull'], ARRAY[]::text[], ARRAY['cable_machine'], ARRAY['strength','hypertrophy'], 'pull', true),
  ('db_row', 'Single-Arm Dumbbell Row', ARRAY['pull','core'], ARRAY[]::text[], ARRAY['dumbbells','bench'], ARRAY['strength','hypertrophy'], 'pull', true),
  ('plank', 'Plank Hold', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'rotate', true),
  ('dead_bug', 'Dead Bug', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength','mobility'], 'rotate', true),
  ('hip_thrust', 'Hip Thrust', ARRAY['legs'], ARRAY['core'], ARRAY['barbell','bench'], ARRAY['strength','hypertrophy'], 'hinge', true),
  ('kb_swing', 'Kettlebell Swing', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['kettlebells'], ARRAY['power','conditioning'], 'hinge', true),
  ('farmer_carry', 'Farmer Carry', ARRAY['core','legs'], ARRAY[]::text[], ARRAY['dumbbells','kettlebells'], ARRAY['strength','conditioning'], 'carry', true),
  ('band_pullapart', 'Band Pull-Apart', ARRAY['pull'], ARRAY[]::text[], ARRAY['bands'], ARRAY['mobility','hypertrophy'], 'pull', true),
  ('face_pull', 'Cable Face Pull', ARRAY['pull'], ARRAY[]::text[], ARRAY['cable_machine'], ARRAY['mobility','hypertrophy'], 'pull', true),
  ('walking_lunge', 'Walking Lunge', ARRAY['legs'], ARRAY['core'], ARRAY['bodyweight','dumbbells'], ARRAY['strength','conditioning'], 'locomotion', true),
  ('stepup', 'Step-up', ARRAY['legs'], ARRAY[]::text[], ARRAY['bench'], ARRAY['strength','conditioning'], 'squat', true),
  ('cat_camel', 'Cat-Camel', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('t_spine_rotation', 'Quadruped T-Spine Rotation', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('zone2_bike', 'Zone 2 Bike', ARRAY['legs'], ARRAY[]::text[], ARRAY['assault_bike'], ARRAY['conditioning'], 'locomotion', true),
  ('zone2_treadmill', 'Zone 2 Treadmill', ARRAY['legs'], ARRAY[]::text[], ARRAY['treadmill'], ARRAY['conditioning'], 'locomotion', true),
  ('leg_press_machine', 'Leg Press', ARRAY['legs'], ARRAY[]::text[], ARRAY['leg_press'], ARRAY['strength','hypertrophy'], 'squat', true),
  ('barbell_back_squat', 'Barbell Back Squat', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['barbell','squat_rack'], ARRAY['strength','power'], 'squat', true),
  ('front_squat', 'Front Squat', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['barbell','squat_rack'], ARRAY['strength'], 'squat', true),
  ('box_squat', 'Box Squat', ARRAY['legs'], ARRAY['core'], ARRAY['barbell','squat_rack','plyo_box'], ARRAY['strength'], 'squat', true),
  ('pause_squat', 'Pause Squat', ARRAY['legs'], ARRAY['core'], ARRAY['barbell','squat_rack'], ARRAY['strength'], 'squat', true),
  ('bulgarian_split_squat', 'Bulgarian Split Squat', ARRAY['legs'], ARRAY[]::text[], ARRAY['dumbbells','bench'], ARRAY['strength','hypertrophy'], 'squat', true),
  ('leg_extension', 'Leg Extension', ARRAY['legs'], ARRAY[]::text[], ARRAY['leg_extension'], ARRAY['hypertrophy'], 'squat', true),
  ('hack_squat', 'Hack Squat', ARRAY['legs'], ARRAY[]::text[], ARRAY['machine'], ARRAY['strength','hypertrophy'], 'squat', true),
  ('barbell_rdl', 'Barbell Romanian Deadlift', ARRAY['legs'], ARRAY['core'], ARRAY['barbell'], ARRAY['strength','hypertrophy'], 'hinge', true),
  ('barbell_deadlift', 'Barbell Deadlift', ARRAY['legs','core'], ARRAY['pull'], ARRAY['barbell'], ARRAY['strength','power'], 'hinge', true),
  ('trap_bar_deadlift', 'Trap Bar Deadlift', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['trap_bar'], ARRAY['strength','power'], 'hinge', true),
  ('good_morning', 'Good Morning', ARRAY['legs'], ARRAY['core'], ARRAY['barbell'], ARRAY['strength'], 'hinge', true),
  ('back_extension', 'Back Extension', ARRAY['legs'], ARRAY['core'], ARRAY['bench','bodyweight'], ARRAY['strength'], 'hinge', true),
  ('glute_bridge', 'Glute Bridge', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength','hypertrophy'], 'hinge', true),
  ('single_leg_rdl', 'Single-Leg RDL', ARRAY['legs'], ARRAY['core'], ARRAY['dumbbells'], ARRAY['strength'], 'hinge', true),
  ('incline_db_press', 'Incline Dumbbell Press', ARRAY['push'], ARRAY[]::text[], ARRAY['dumbbells','bench'], ARRAY['hypertrophy'], 'push', true),
  ('decline_bench', 'Decline Bench Press', ARRAY['push'], ARRAY[]::text[], ARRAY['barbell','bench'], ARRAY['strength','hypertrophy'], 'push', true),
  ('push_up', 'Push-up', ARRAY['push','core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'push', true),
  ('dips', 'Dips', ARRAY['push'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength','hypertrophy'], 'push', true),
  ('db_fly', 'Dumbbell Fly', ARRAY['push'], ARRAY[]::text[], ARRAY['dumbbells','bench'], ARRAY['hypertrophy'], 'push', true),
  ('cable_fly', 'Cable Fly', ARRAY['push'], ARRAY[]::text[], ARRAY['cable_machine'], ARRAY['hypertrophy'], 'push', true),
  ('db_shoulder_press', 'Dumbbell Shoulder Press', ARRAY['push'], ARRAY[]::text[], ARRAY['dumbbells'], ARRAY['strength','hypertrophy'], 'push', true),
  ('arnold_press', 'Arnold Press', ARRAY['push'], ARRAY[]::text[], ARRAY['dumbbells'], ARRAY['hypertrophy'], 'push', true),
  ('lateral_raise', 'Lateral Raise', ARRAY['push'], ARRAY[]::text[], ARRAY['dumbbells'], ARRAY['hypertrophy'], 'push', true),
  ('front_raise', 'Front Raise', ARRAY['push'], ARRAY[]::text[], ARRAY['dumbbells'], ARRAY['hypertrophy'], 'push', true),
  ('tricep_pushdown', 'Tricep Pushdown', ARRAY['push'], ARRAY[]::text[], ARRAY['cable_machine'], ARRAY['hypertrophy'], 'push', true),
  ('overhead_tricep_extension', 'Overhead Tricep Extension', ARRAY['push'], ARRAY[]::text[], ARRAY['dumbbells'], ARRAY['hypertrophy'], 'push', true),
  ('cable_row', 'Cable Seated Row', ARRAY['pull'], ARRAY[]::text[], ARRAY['cable_machine'], ARRAY['strength','hypertrophy'], 'pull', true),
  ('barbell_row', 'Barbell Row', ARRAY['pull'], ARRAY['core'], ARRAY['barbell'], ARRAY['strength','hypertrophy'], 'pull', true),
  ('chinup', 'Chin-up', ARRAY['pull'], ARRAY['core'], ARRAY['pullup_bar'], ARRAY['strength','hypertrophy'], 'pull', true),
  ('trx_row', 'TRX Row', ARRAY['pull','core'], ARRAY[]::text[], ARRAY['trx'], ARRAY['strength'], 'pull', true),
  ('pull_down_straight_arm', 'Straight-Arm Pulldown', ARRAY['pull'], ARRAY[]::text[], ARRAY['cable_machine'], ARRAY['hypertrophy'], 'pull', true),
  ('barbell_curl', 'Barbell Curl', ARRAY['pull'], ARRAY[]::text[], ARRAY['barbell'], ARRAY['hypertrophy'], 'pull', true),
  ('db_curl', 'Dumbbell Curl', ARRAY['pull'], ARRAY[]::text[], ARRAY['dumbbells'], ARRAY['hypertrophy'], 'pull', true),
  ('hammer_curl', 'Hammer Curl', ARRAY['pull'], ARRAY[]::text[], ARRAY['dumbbells'], ARRAY['hypertrophy'], 'pull', true),
  ('preacher_curl', 'Preacher Curl', ARRAY['pull'], ARRAY[]::text[], ARRAY['barbell','bench'], ARRAY['hypertrophy'], 'pull', true),
  ('pallof_hold', 'Pallof Hold', ARRAY['core'], ARRAY[]::text[], ARRAY['cable_machine','bands'], ARRAY['strength'], 'rotate', true),
  ('bird_dog', 'Bird Dog', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('dead_bug_weighted', 'Dead Bug (Weighted)', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'rotate', true),
  ('ab_wheel', 'Ab Wheel Rollout', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'push', true),
  ('hanging_leg_raise', 'Hanging Leg Raise', ARRAY['core'], ARRAY[]::text[], ARRAY['pullup_bar'], ARRAY['strength'], 'rotate', true),
  ('russian_twist', 'Russian Twist', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight','dumbbells'], ARRAY['strength'], 'rotate', true),
  ('suitcase_carry', 'Suitcase Carry', ARRAY['core'], ARRAY['legs'], ARRAY['dumbbells','kettlebells'], ARRAY['strength'], 'carry', true),
  ('waiters_carry', 'Waiter Carry', ARRAY['core','push'], ARRAY[]::text[], ARRAY['dumbbells','kettlebells'], ARRAY['strength'], 'carry', true),
  ('rower', 'Rower', ARRAY['legs','pull','core'], ARRAY[]::text[], ARRAY['rower'], ARRAY['conditioning'], 'locomotion', true),
  ('assault_bike', 'Assault Bike', ARRAY['legs'], ARRAY['push'], ARRAY['assault_bike'], ARRAY['conditioning'], 'locomotion', true),
  ('ski_erg', 'Ski Erg', ARRAY['legs','pull','core'], ARRAY[]::text[], ARRAY['ski_erg'], ARRAY['conditioning'], 'locomotion', true),
  ('jump_rope', 'Jump Rope', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['conditioning'], 'locomotion', true),
  ('box_jump', 'Box Jump', ARRAY['legs'], ARRAY[]::text[], ARRAY['plyo_box'], ARRAY['power','conditioning'], 'locomotion', true),
  ('burpee', 'Burpee', ARRAY['legs','push','core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['conditioning'], 'locomotion', true),
  ('mountain_climber', 'Mountain Climber', ARRAY['core','legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['conditioning'], 'locomotion', true),
  ('worlds_greatest_stretch', 'World''s Greatest Stretch', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'locomotion', true),
  ('hip_90_90', '90/90 Hip Switch', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('breathing_diaphragmatic', 'Diaphragmatic Breathing', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['recovery'], 'rotate', true),
  ('calf_raise', 'Calf Raise', ARRAY['legs'], ARRAY[]::text[], ARRAY['dumbbells','bodyweight'], ARRAY['strength','hypertrophy'], 'squat', true),
  ('seated_calf_raise', 'Seated Calf Raise', ARRAY['legs'], ARRAY[]::text[], ARRAY['machine'], ARRAY['hypertrophy'], 'squat', true),
  ('leg_curl', 'Leg Curl', ARRAY['legs'], ARRAY[]::text[], ARRAY['machine'], ARRAY['hypertrophy'], 'hinge', true),
  ('hip_abduction', 'Hip Abduction', ARRAY['legs'], ARRAY[]::text[], ARRAY['machine'], ARRAY['hypertrophy'], 'push', true),
  ('hip_adduction', 'Hip Adduction', ARRAY['legs'], ARRAY[]::text[], ARRAY['machine'], ARRAY['hypertrophy'], 'push', true),
  ('wrist_curl', 'Wrist Curl', ARRAY['pull'], ARRAY[]::text[], ARRAY['dumbbells','barbell'], ARRAY['strength'], 'pull', true),
  ('reverse_fly', 'Reverse Fly', ARRAY['pull'], ARRAY[]::text[], ARRAY['dumbbells','cable_machine'], ARRAY['hypertrophy'], 'pull', true),
  ('shrug', 'Shrug', ARRAY['pull'], ARRAY[]::text[], ARRAY['dumbbells','barbell'], ARRAY['strength','hypertrophy'], 'pull', true),
  ('landmine_row', 'Landmine Row', ARRAY['pull'], ARRAY['core'], ARRAY['barbell'], ARRAY['strength'], 'pull', true),
  ('chest_press_machine', 'Chest Press Machine', ARRAY['push'], ARRAY[]::text[], ARRAY['machine'], ARRAY['strength','hypertrophy'], 'push', true),
  ('pec_deck', 'Pec Deck Fly', ARRAY['push'], ARRAY[]::text[], ARRAY['machine'], ARRAY['hypertrophy'], 'push', true),
  ('lat_pulldown_single_arm', 'Single-Arm Lat Pulldown', ARRAY['pull'], ARRAY[]::text[], ARRAY['cable_machine'], ARRAY['hypertrophy'], 'pull', true),
  ('incline_bench_barbell', 'Incline Barbell Bench', ARRAY['push'], ARRAY[]::text[], ARRAY['barbell','bench'], ARRAY['strength','hypertrophy'], 'push', true),
  ('close_grip_bench', 'Close-Grip Bench Press', ARRAY['push'], ARRAY[]::text[], ARRAY['barbell','bench'], ARRAY['strength','hypertrophy'], 'push', true),
  ('skull_crusher', 'Skull Crusher', ARRAY['push'], ARRAY[]::text[], ARRAY['barbell','bench'], ARRAY['hypertrophy'], 'push', true),
  ('cable_row_wide', 'Wide-Grip Cable Row', ARRAY['pull'], ARRAY[]::text[], ARRAY['cable_machine'], ARRAY['hypertrophy'], 'pull', true),
  ('reverse_grip_pulldown', 'Reverse-Grip Pulldown', ARRAY['pull'], ARRAY[]::text[], ARRAY['cable_machine'], ARRAY['hypertrophy'], 'pull', true),
  ('zercher_squat', 'Zercher Squat', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['barbell'], ARRAY['strength'], 'squat', true),
  ('sissy_squat', 'Sissy Squat', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['hypertrophy'], 'squat', true),
  ('goblet_lateral_lunge', 'Goblet Lateral Lunge', ARRAY['legs'], ARRAY['core'], ARRAY['dumbbells'], ARRAY['strength'], 'squat', true),
  ('curtsy_lunge', 'Curtsy Lunge', ARRAY['legs'], ARRAY[]::text[], ARRAY['dumbbells','bodyweight'], ARRAY['strength'], 'squat', true),
  ('stiff_leg_deadlift', 'Stiff-Leg Deadlift', ARRAY['legs'], ARRAY[]::text[], ARRAY['barbell','dumbbells'], ARRAY['strength'], 'hinge', true),
  ('sumo_deadlift', 'Sumo Deadlift', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['barbell'], ARRAY['strength'], 'hinge', true),
  ('kb_clean', 'Kettlebell Clean', ARRAY['legs','pull','core'], ARRAY[]::text[], ARRAY['kettlebells'], ARRAY['power'], 'hinge', true),
  ('kb_goblet_squat', 'Kettlebell Goblet Squat', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['kettlebells'], ARRAY['strength','hypertrophy'], 'squat', true),
  ('thruster', 'Thruster', ARRAY['legs','push'], ARRAY['core'], ARRAY['barbell','dumbbells'], ARRAY['power','conditioning'], 'squat', true),
  ('push_press', 'Push Press', ARRAY['push','legs'], ARRAY[]::text[], ARRAY['barbell','dumbbells'], ARRAY['power'], 'push', true),
  ('clean_and_press', 'Clean and Press', ARRAY['legs','push','pull'], ARRAY['core'], ARRAY['kettlebells','dumbbells'], ARRAY['power'], 'push', true),
  ('pike_push_up', 'Pike Push-up', ARRAY['push'], ARRAY['core'], ARRAY['bodyweight'], ARRAY['strength'], 'push', true),
  ('ring_row', 'Ring Row', ARRAY['pull'], ARRAY['core'], ARRAY['bodyweight'], ARRAY['strength'], 'pull', true),
  ('inverted_row', 'Inverted Row', ARRAY['pull'], ARRAY['core'], ARRAY['bodyweight'], ARRAY['strength'], 'pull', true),
  ('rack_pull', 'Rack Pull', ARRAY['pull','legs'], ARRAY['core'], ARRAY['barbell'], ARRAY['strength'], 'hinge', true),
  ('stair_climber', 'Stair Climber', ARRAY['legs'], ARRAY[]::text[], ARRAY['stair_climber'], ARRAY['conditioning'], 'locomotion', true),
  ('elliptical', 'Elliptical', ARRAY['legs'], ARRAY[]::text[], ARRAY['elliptical'], ARRAY['conditioning'], 'locomotion', true),
  ('battle_ropes', 'Battle Ropes', ARRAY['push','pull','core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['conditioning'], 'push', true),
  ('medball_slam', 'Medicine Ball Slam', ARRAY['core','legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['power','conditioning'], 'push', true),
  ('wall_sit', 'Wall Sit', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'squat', true),
  ('v_up', 'V-Up', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'rotate', true),
  ('bicycle_crunch', 'Bicycle Crunch', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'rotate', true),
  ('side_plank', 'Side Plank', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'rotate', true),
  ('superman', 'Superman', ARRAY['core','back'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'hinge', true),
  ('reverse_hyper', 'Reverse Hyper', ARRAY['legs'], ARRAY['core'], ARRAY['machine'], ARRAY['strength'], 'hinge', true),
  ('ghr', 'Glute-Ham Raise', ARRAY['legs'], ARRAY[]::text[], ARRAY['machine'], ARRAY['strength'], 'hinge', true),
  ('cable_woodchop', 'Cable Woodchop', ARRAY['core'], ARRAY[]::text[], ARRAY['cable_machine'], ARRAY['strength'], 'rotate', true),
  ('kneeling_landmine_press', 'Kneeling Landmine Press', ARRAY['push'], ARRAY['core'], ARRAY['barbell'], ARRAY['strength'], 'push', true),
  ('db_snatch', 'Dumbbell Snatch', ARRAY['legs','push','pull'], ARRAY['core'], ARRAY['dumbbells'], ARRAY['power'], 'push', true),
  ('jump_squat', 'Jump Squat', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['power'], 'squat', true),
  ('lateral_lunge', 'Lateral Lunge', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight','dumbbells'], ARRAY['strength'], 'squat', true),
  ('cossack_squat', 'Cossack Squat', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility','strength'], 'squat', true),
  ('frog_stretch', 'Frog Stretch', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('thread_the_needle', 'Thread the Needle', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('quadruped_rockback', 'Quadruped Rockback', ARRAY['core','legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('lying_leg_raise', 'Lying Leg Raise', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'rotate', true),
  ('scissor_kick', 'Scissor Kick', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'rotate', true),
  ('flutter_kick', 'Flutter Kick', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'rotate', true),
  ('reverse_curl', 'Reverse Curl', ARRAY['pull'], ARRAY[]::text[], ARRAY['barbell','dumbbells'], ARRAY['strength'], 'pull', true),
  ('concentration_curl', 'Concentration Curl', ARRAY['pull'], ARRAY[]::text[], ARRAY['dumbbells'], ARRAY['hypertrophy'], 'pull', true),
  ('spider_curl', 'Spider Curl', ARRAY['pull'], ARRAY[]::text[], ARRAY['dumbbells','bench'], ARRAY['hypertrophy'], 'pull', true),
  ('face_pull_band', 'Band Face Pull', ARRAY['pull'], ARRAY[]::text[], ARRAY['bands'], ARRAY['mobility'], 'pull', true),
  ('ytw', 'Y-T-W Raise', ARRAY['pull'], ARRAY[]::text[], ARRAY['dumbbells'], ARRAY['mobility'], 'pull', true),
  ('cuban_press', 'Cuban Press', ARRAY['push'], ARRAY[]::text[], ARRAY['dumbbells'], ARRAY['mobility'], 'push', true),
  ('wall_slide', 'Wall Slide', ARRAY['push'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'push', true),
  ('banded_walk', 'Banded Walk', ARRAY['legs'], ARRAY[]::text[], ARRAY['bands'], ARRAY['strength','mobility'], 'locomotion', true),
  ('clamshell', 'Clamshell', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight','bands'], ARRAY['strength'], 'rotate', true),
  ('fire_hydrant', 'Fire Hydrant', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'rotate', true),
  ('single_arm_carry', 'Single-Arm Farmer Carry', ARRAY['core','legs'], ARRAY[]::text[], ARRAY['dumbbells','kettlebells'], ARRAY['strength'], 'carry', true),
  ('overhead_carry', 'Overhead Carry', ARRAY['core','push'], ARRAY[]::text[], ARRAY['dumbbells','barbell'], ARRAY['strength'], 'carry', true),
  ('sled_push', 'Sled Push', ARRAY['legs'], ARRAY['push'], ARRAY['sled'], ARRAY['strength','conditioning'], 'locomotion', true),
  ('sled_pull', 'Sled Pull', ARRAY['pull','legs'], ARRAY[]::text[], ARRAY['sled'], ARRAY['strength','conditioning'], 'locomotion', true),
  ('stair_climb', 'Stair Climb', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['conditioning'], 'locomotion', true),
  ('high_knee', 'High Knees', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['conditioning'], 'locomotion', true),
  ('bear_crawl', 'Bear Crawl', ARRAY['core','legs','push'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['conditioning'], 'locomotion', true),
  ('crab_walk', 'Crab Walk', ARRAY['core','push'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'locomotion', true),
  ('inchworm', 'Inchworm', ARRAY['core','legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'locomotion', true),
  ('windmill', 'Windmill', ARRAY['core','legs'], ARRAY[]::text[], ARRAY['kettlebells'], ARRAY['mobility','strength'], 'rotate', true),
  ('turkish_get_up', 'Turkish Get-Up', ARRAY['core','legs','push','pull'], ARRAY[]::text[], ARRAY['kettlebells'], ARRAY['strength'], 'locomotion', true),
  ('single_arm_swing', 'Single-Arm Kettlebell Swing', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['kettlebells'], ARRAY['power'], 'hinge', true),
  ('bottoms_up_press', 'Bottoms-Up Press', ARRAY['push'], ARRAY[]::text[], ARRAY['kettlebells'], ARRAY['strength'], 'push', true),
  ('renegade_row', 'Renegade Row', ARRAY['pull','core'], ARRAY[]::text[], ARRAY['dumbbells'], ARRAY['strength'], 'pull', true),
  ('plank_to_push_up', 'Plank to Push-up', ARRAY['core','push'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'push', true),
  ('diamond_push_up', 'Diamond Push-up', ARRAY['push'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'push', true),
  ('decline_push_up', 'Decline Push-up', ARRAY['push'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'push', true),
  ('pull_up_commando', 'Commando Pull-up', ARRAY['pull'], ARRAY['core'], ARRAY['pullup_bar'], ARRAY['strength'], 'pull', true),
  ('toes_to_bar', 'Toes to Bar', ARRAY['core','pull'], ARRAY[]::text[], ARRAY['pullup_bar'], ARRAY['strength'], 'pull', true),
  ('l_sit', 'L-Sit', ARRAY['core','push'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'rotate', true),
  ('hollow_hold', 'Hollow Hold', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'rotate', true),
  ('arch_hold', 'Arch Hold', ARRAY['core','back'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'hinge', true),
  ('reverse_plank', 'Reverse Plank', ARRAY['core','push'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'rotate', true),
  ('stability_ball_rollout', 'Stability Ball Rollout', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'push', true),
  ('pallof_press', 'Pallof Press', ARRAY['core'], ARRAY[]::text[], ARRAY['cable_machine','bands'], ARRAY['strength'], 'rotate', true),
  ('chest_supported_row', 'Chest-Supported Row', ARRAY['pull'], ARRAY[]::text[], ARRAY['dumbbells','bench'], ARRAY['hypertrophy'], 'pull', true),
  ('seated_ohp', 'Seated Overhead Press', ARRAY['push'], ARRAY[]::text[], ARRAY['barbell','dumbbells'], ARRAY['strength'], 'push', true),
  ('z_press', 'Z-Press', ARRAY['push'], ARRAY['core'], ARRAY['barbell','dumbbells'], ARRAY['strength'], 'push', true),
  ('upright_row', 'Upright Row', ARRAY['push','pull'], ARRAY[]::text[], ARRAY['barbell','dumbbells'], ARRAY['hypertrophy'], 'pull', true),
  ('snatch_grip_high_pull', 'Snatch-Grip High Pull', ARRAY['pull','legs'], ARRAY[]::text[], ARRAY['barbell'], ARRAY['power'], 'pull', true),
  ('jump_lunge', 'Jump Lunge', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['power'], 'locomotion', true),
  ('lateral_box_step', 'Lateral Box Step', ARRAY['legs'], ARRAY[]::text[], ARRAY['plyo_box'], ARRAY['conditioning'], 'squat', true),
  ('step_back_lunge', 'Step-Back Lunge', ARRAY['legs'], ARRAY[]::text[], ARRAY['dumbbells'], ARRAY['strength'], 'squat', true),
  ('deficit_reverse_lunge', 'Deficit Reverse Lunge', ARRAY['legs'], ARRAY[]::text[], ARRAY['dumbbells'], ARRAY['strength'], 'squat', true),
  ('single_leg_glute_bridge', 'Single-Leg Glute Bridge', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'hinge', true),
  ('kickback', 'Kickback', ARRAY['legs'], ARRAY[]::text[], ARRAY['machine','cable_machine'], ARRAY['hypertrophy'], 'hinge', true),
  ('back_extension_reverse', 'Reverse Back Extension', ARRAY['legs'], ARRAY[]::text[], ARRAY['bench'], ARRAY['strength'], 'hinge', true),
  ('seal_row', 'Seal Row', ARRAY['pull'], ARRAY[]::text[], ARRAY['dumbbells','bench'], ARRAY['hypertrophy'], 'pull', true),
  ('cable_curl', 'Cable Curl', ARRAY['pull'], ARRAY[]::text[], ARRAY['cable_machine'], ARRAY['hypertrophy'], 'pull', true),
  ('lying_tricep_extension', 'Lying Tricep Extension', ARRAY['push'], ARRAY[]::text[], ARRAY['barbell','ez_bar'], ARRAY['hypertrophy'], 'push', true),
  ('close_grip_push_up', 'Close-Grip Push-up', ARRAY['push'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'push', true),
  ('floor_press', 'Floor Press', ARRAY['push'], ARRAY[]::text[], ARRAY['barbell','dumbbells'], ARRAY['strength'], 'push', true),
  ('pin_press', 'Pin Press', ARRAY['push'], ARRAY[]::text[], ARRAY['barbell','squat_rack'], ARRAY['strength'], 'push', true),
  ('squat_clean', 'Power Clean', ARRAY['legs','pull','core'], ARRAY[]::text[], ARRAY['barbell'], ARRAY['power'], 'hinge', true),
  ('hang_clean', 'Hang Clean', ARRAY['legs','pull'], ARRAY['core'], ARRAY['barbell'], ARRAY['power'], 'hinge', true),
  ('power_snatch', 'Power Snatch', ARRAY['legs','pull','push'], ARRAY['core'], ARRAY['barbell'], ARRAY['power'], 'hinge', true),
  ('push_jerk', 'Push Jerk', ARRAY['push','legs'], ARRAY[]::text[], ARRAY['barbell'], ARRAY['power'], 'push', true),
  ('split_jerk', 'Split Jerk', ARRAY['push','legs'], ARRAY[]::text[], ARRAY['barbell'], ARRAY['power'], 'push', true),
  ('squat_jerk', 'Squat Jerk', ARRAY['push','legs'], ARRAY[]::text[], ARRAY['barbell'], ARRAY['power'], 'push', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  equipment = EXCLUDED.equipment,
  modalities = EXCLUDED.modalities,
  movement_pattern = EXCLUDED.movement_pattern,
  is_active = EXCLUDED.is_active;

-- ============== EXERCISE_TAG_MAP (rich tagging from columns + energy) ==============
-- 1) movement_pattern -> tag
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = e.movement_pattern
WHERE e.is_active = true
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- 2) modalities -> tags
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
CROSS JOIN LATERAL unnest(e.modalities) AS mod(s)
JOIN public.exercise_tags t ON t.slug = mod.s
WHERE e.is_active = true
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- 3) primary_muscles -> tags (slug must match: legs, core, push, pull, back, etc.)
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
CROSS JOIN LATERAL unnest(e.primary_muscles) AS mus(s)
JOIN public.exercise_tags t ON t.slug = mus.s
WHERE e.is_active = true
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- 4) energy tags: default energy_medium for all; energy_high for power/conditioning; energy_low for mobility/recovery
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = 'energy_medium'
WHERE e.is_active = true
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = 'energy_high'
WHERE e.is_active = true AND (e.modalities && ARRAY['power','conditioning'] OR e.movement_pattern = 'locomotion')
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = 'energy_low'
WHERE e.is_active = true AND (e.modalities && ARRAY['mobility','recovery'])
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- 5) compound/bilateral/unilateral and other traits (by movement and muscles)
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = 'compound'
WHERE e.is_active = true AND array_length(e.primary_muscles, 1) > 1 AND e.movement_pattern IN ('squat','hinge','push','pull')
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = 'unilateral'
WHERE e.is_active = true AND (e.slug LIKE '%single%' OR e.slug LIKE '%split%' OR e.slug LIKE '%bulgarian%' OR e.slug LIKE '%one_arm%' OR e.slug LIKE '%single_arm%' OR e.slug LIKE '%single-leg%')
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = 'core_stability'
WHERE e.is_active = true AND 'core' = ANY(e.primary_muscles)
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- 6) equipment tags (map equipment array to tag slugs)
WITH eq_map(eq_slug, tag_slug) AS (
  VALUES
    ('dumbbells','equipment_dumbbell'),
    ('barbell','equipment_barbell'),
    ('kettlebells','equipment_kettlebell'),
    ('cable_machine','equipment_cable'),
    ('bodyweight','equipment_bodyweight'),
    ('bands','equipment_band'),
    ('machine','equipment_machine'),
    ('bench','equipment_bench'),
    ('pullup_bar','equipment_pullup_bar'),
    ('treadmill','equipment_treadmill'),
    ('assault_bike','equipment_bike'),
    ('rower','equipment_rower'),
    ('trx','equipment_trx'),
    ('plyo_box','equipment_plyo_box'),
    ('leg_press','equipment_machine'),
    ('leg_extension','equipment_machine'),
    ('trap_bar','equipment_barbell')
)
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
CROSS JOIN LATERAL unnest(e.equipment) AS eq(s)
JOIN eq_map m ON m.eq_slug = eq.s
JOIN public.exercise_tags t ON t.slug = m.tag_slug
WHERE e.is_active = true
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- ============== EXERCISE_CONTRAINDICATIONS (idempotent) ==============
WITH contra_rows(exercise_slug, contraindication) AS (
  VALUES
    ('goblet_squat', 'knee'), ('rdl_dumbbell', 'lower_back'), ('split_squat', 'knee'),
    ('bench_press_barbell', 'shoulder'), ('bench_press_barbell', 'wrist'),
    ('db_bench', 'shoulder'), ('oh_press', 'shoulder'), ('oh_press', 'lower_back'),
    ('pullup', 'shoulder'), ('pullup', 'elbow'), ('lat_pulldown', 'shoulder'),
    ('db_row', 'lower_back'), ('plank', 'shoulder'), ('hip_thrust', 'lower_back'),
    ('kb_swing', 'lower_back'), ('farmer_carry', 'wrist'), ('face_pull', 'shoulder'),
    ('band_pullapart', 'shoulder'), ('walking_lunge', 'knee'), ('stepup', 'knee'),
    ('zone2_bike', 'knee'), ('zone2_treadmill', 'knee'), ('leg_press_machine', 'knee'),
    ('leg_press_machine', 'lower_back'), ('barbell_back_squat', 'knee'), ('barbell_back_squat', 'lower_back'),
    ('front_squat', 'knee'), ('box_squat', 'knee'), ('bulgarian_split_squat', 'knee'),
    ('leg_extension', 'knee'), ('barbell_rdl', 'lower_back'), ('barbell_deadlift', 'lower_back'),
    ('trap_bar_deadlift', 'lower_back'), ('good_morning', 'lower_back'), ('dips', 'shoulder'),
    ('hanging_leg_raise', 'shoulder'), ('box_jump', 'knee'), ('jump_rope', 'knee'),
    ('sissy_squat', 'knee'), ('sumo_deadlift', 'lower_back'), ('stiff_leg_deadlift', 'lower_back'),
    ('rack_pull', 'lower_back'), ('toes_to_bar', 'shoulder'), ('push_press', 'shoulder'),
    ('push_jerk', 'shoulder'), ('split_jerk', 'shoulder'), ('squat_jerk', 'shoulder'),
    ('power_snatch', 'lower_back'), ('squat_clean', 'lower_back'), ('hang_clean', 'lower_back')
)
INSERT INTO public.exercise_contraindications (exercise_id, contraindication, joint)
SELECT e.id, c.contraindication, c.contraindication FROM contra_rows c
JOIN public.exercises e ON e.slug = c.exercise_slug
ON CONFLICT (exercise_id, contraindication) DO NOTHING;
