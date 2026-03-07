-- Expand exercise library: new tags, 100+ exercises, full tagging and contraindications.
-- Idempotent. Run after 20250302100001. Uses public.exercises + exercise_tags + exercise_tag_map + exercise_contraindications.

-- ============== ADD TAGS (if missing) ==============
INSERT INTO public.exercise_tags (slug, name, tag_group, sort_order, weight)
VALUES
  ('equipment_ski_erg', 'Ski Erg', 'equipment', 64, 0.6),
  ('equipment_sled', 'Sled', 'equipment', 65, 0.6),
  ('equipment_ez_bar', 'EZ Bar', 'equipment', 66, 0.6),
  ('prehab', 'Prehab', 'modality', 17, 1.0),
  ('sport_triathlon', 'Triathlon', 'sport', 95, 0.8),
  ('sport_trail', 'Trail / Hiking', 'sport', 96, 0.8),
  ('sport_ocr', 'OCR / Hyrox', 'sport', 97, 0.8),
  ('zone2', 'Zone 2', 'general', 119, 0.8),
  ('intervals', 'Intervals', 'general', 120, 0.9),
  ('single_joint', 'Single joint', 'general', 121, 0.8)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tag_group = EXCLUDED.tag_group,
  sort_order = EXCLUDED.sort_order,
  weight = COALESCE(EXCLUDED.weight, public.exercise_tags.weight);

-- ============== NEW EXERCISES (100+ additions) ==============
INSERT INTO public.exercises (slug, name, primary_muscles, secondary_muscles, equipment, modalities, movement_pattern, is_active)
VALUES
  -- Squat / lower strength
  ('safety_bar_squat', 'Safety Bar Squat', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['barbell','squat_rack'], ARRAY['strength'], 'squat', true),
  ('pistol_squat', 'Pistol Squat', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'squat', true),
  ('shrimp_squat', 'Shrimp Squat', ARRAY['legs'], ARRAY['core'], ARRAY['bodyweight'], ARRAY['strength'], 'squat', true),
  ('goblet_split_squat', 'Goblet Split Squat', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['dumbbells','kettlebells'], ARRAY['strength','hypertrophy'], 'squat', true),
  ('front_rack_lunge', 'Front Rack Lunge', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['barbell'], ARRAY['strength'], 'squat', true),
  ('lateral_step_up', 'Lateral Step-Up', ARRAY['legs'], ARRAY['core'], ARRAY['bench','dumbbells'], ARRAY['strength'], 'squat', true),
  ('belt_squat', 'Belt Squat', ARRAY['legs'], ARRAY[]::text[], ARRAY['machine'], ARRAY['strength','hypertrophy'], 'squat', true),
  ('v_squat', 'V-Squat', ARRAY['legs'], ARRAY[]::text[], ARRAY['machine'], ARRAY['strength','hypertrophy'], 'squat', true),
  ('pause_front_squat', 'Pause Front Squat', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['barbell','squat_rack'], ARRAY['strength'], 'squat', true),
  ('heels_elevated_squat', 'Heels Elevated Squat', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['barbell','dumbbells'], ARRAY['strength'], 'squat', true),

  -- Hinge
  ('deficit_deadlift', 'Deficit Deadlift', ARRAY['legs','core'], ARRAY['back'], ARRAY['barbell'], ARRAY['strength'], 'hinge', true),
  ('snatch_grip_deadlift', 'Snatch-Grip Deadlift', ARRAY['legs','back','core'], ARRAY[]::text[], ARRAY['barbell'], ARRAY['strength'], 'hinge', true),
  ('kb_deadlift', 'Kettlebell Deadlift', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['kettlebells'], ARRAY['strength'], 'hinge', true),
  ('back_extension_45', '45° Back Extension', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['machine'], ARRAY['strength'], 'hinge', true),
  ('nordic_curl', 'Nordic Hamstring Curl', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'hinge', true),
  ('kb_sumo_deadlift', 'Kettlebell Sumo Deadlift', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['kettlebells'], ARRAY['strength'], 'hinge', true),
  ('single_leg_hip_thrust', 'Single-Leg Hip Thrust', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight','barbell'], ARRAY['strength','hypertrophy'], 'hinge', true),
  ('back_extension_reverse_hyper', 'Reverse Hyper (Back Extension)', ARRAY['legs'], ARRAY['core'], ARRAY['bench'], ARRAY['strength'], 'hinge', true),
  ('stability_ball_hamstring_curl', 'Stability Ball Hamstring Curl', ARRAY['legs'], ARRAY['core'], ARRAY['bodyweight'], ARRAY['strength'], 'hinge', true),

  -- Push (chest / shoulders / triceps)
  ('dumbbell_floor_press', 'Dumbbell Floor Press', ARRAY['push'], ARRAY[]::text[], ARRAY['dumbbells'], ARRAY['strength'], 'push', true),
  ('landmine_press_one_arm', 'One-Arm Landmine Press', ARRAY['push','core'], ARRAY[]::text[], ARRAY['barbell'], ARRAY['strength'], 'push', true),
  ('bottoms_up_kb_press', 'Bottoms-Up Kettlebell Press', ARRAY['push'], ARRAY[]::text[], ARRAY['kettlebells'], ARRAY['strength'], 'push', true),
  ('seated_dumbbell_ohp', 'Seated Dumbbell Overhead Press', ARRAY['push'], ARRAY[]::text[], ARRAY['dumbbells'], ARRAY['strength','hypertrophy'], 'push', true),
  ('half_kneeling_landmine_press', 'Half-Kneeling Landmine Press', ARRAY['push','core'], ARRAY[]::text[], ARRAY['barbell'], ARRAY['strength'], 'push', true),
  ('trx_chest_press', 'TRX Chest Press', ARRAY['push','core'], ARRAY[]::text[], ARRAY['trx'], ARRAY['strength'], 'push', true),
  ('cable_crossover', 'Cable Crossover', ARRAY['push'], ARRAY[]::text[], ARRAY['cable_machine'], ARRAY['hypertrophy'], 'push', true),
  ('incline_cable_fly', 'Incline Cable Fly', ARRAY['push'], ARRAY[]::text[], ARRAY['cable_machine'], ARRAY['hypertrophy'], 'push', true),
  ('dip_assisted', 'Assisted Dip', ARRAY['push'], ARRAY[]::text[], ARRAY['bodyweight','machine'], ARRAY['strength','hypertrophy'], 'push', true),
  ('tricep_dip_bench', 'Bench Tricep Dip', ARRAY['push'], ARRAY[]::text[], ARRAY['bench','bodyweight'], ARRAY['strength'], 'push', true),
  ('cable_tricep_extension', 'Cable Tricep Extension', ARRAY['push'], ARRAY[]::text[], ARRAY['cable_machine'], ARRAY['hypertrophy'], 'push', true),
  ('db_tricep_kickback', 'Dumbbell Tricep Kickback', ARRAY['push'], ARRAY[]::text[], ARRAY['dumbbells'], ARRAY['hypertrophy'], 'push', true),
  ('close_grip_push_up', 'Close-Grip Push-up', ARRAY['push'], ARRAY['core'], ARRAY['bodyweight'], ARRAY['strength'], 'push', true),
  ('band_chest_press', 'Band Chest Press', ARRAY['push'], ARRAY[]::text[], ARRAY['bands'], ARRAY['strength'], 'push', true),
  ('band_ohp', 'Band Overhead Press', ARRAY['push'], ARRAY[]::text[], ARRAY['bands'], ARRAY['strength'], 'push', true),

  -- Pull
  ('australian_pull_up', 'Australian Pull-up', ARRAY['pull','core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'pull', true),
  ('ring_pull_up', 'Ring Pull-up', ARRAY['pull','core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'pull', true),
  ('weighted_pull_up', 'Weighted Pull-up', ARRAY['pull','core'], ARRAY[]::text[], ARRAY['pullup_bar'], ARRAY['strength'], 'pull', true),
  ('neutral_pull_up', 'Neutral-Grip Pull-up', ARRAY['pull'], ARRAY['core'], ARRAY['pullup_bar'], ARRAY['strength','hypertrophy'], 'pull', true),
  ('wide_grip_pulldown', 'Wide-Grip Lat Pulldown', ARRAY['pull'], ARRAY[]::text[], ARRAY['cable_machine'], ARRAY['hypertrophy'], 'pull', true),
  ('underhand_pulldown', 'Underhand Lat Pulldown', ARRAY['pull'], ARRAY[]::text[], ARRAY['cable_machine'], ARRAY['hypertrophy'], 'pull', true),
  ('inverted_row_feet_elevated', 'Feet-Elevated Inverted Row', ARRAY['pull','core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'pull', true),
  ('pendlay_row', 'Pendlay Row', ARRAY['pull'], ARRAY['core'], ARRAY['barbell'], ARRAY['strength'], 'pull', true),
  ('yates_row', 'Yates Row', ARRAY['pull'], ARRAY[]::text[], ARRAY['barbell'], ARRAY['strength','hypertrophy'], 'pull', true),
  ('t_bar_row', 'T-Bar Row', ARRAY['pull'], ARRAY['core'], ARRAY['barbell'], ARRAY['strength','hypertrophy'], 'pull', true),
  ('db_shrug', 'Dumbbell Shrug', ARRAY['pull'], ARRAY[]::text[], ARRAY['dumbbells'], ARRAY['strength','hypertrophy'], 'pull', true),
  ('cable_shrug', 'Cable Shrug', ARRAY['pull'], ARRAY[]::text[], ARRAY['cable_machine'], ARRAY['hypertrophy'], 'pull', true),
  ('prone_y_raise', 'Prone Y-Raise', ARRAY['pull'], ARRAY[]::text[], ARRAY['dumbbells'], ARRAY['prehab','mobility'], 'pull', true),
  ('band_row', 'Band Row', ARRAY['pull'], ARRAY[]::text[], ARRAY['bands'], ARRAY['strength'], 'pull', true),
  ('scapular_push_up', 'Scapular Push-up', ARRAY['pull','core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'push', true),
  ('wall_angel', 'Wall Angel', ARRAY['pull','push'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'push', true),

  -- Core / rotate / anti-rotation
  ('stir_the_pot', 'Stir the Pot (Plank)', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'rotate', true),
  ('rollout_ab_wheel', 'Ab Wheel Rollout', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'push', true),
  ('dead_bug_band', 'Dead Bug (Band)', ARRAY['core'], ARRAY[]::text[], ARRAY['bands','bodyweight'], ARRAY['strength'], 'rotate', true),
  ('pallof_rotation', 'Pallof Rotation', ARRAY['core'], ARRAY[]::text[], ARRAY['cable_machine','bands'], ARRAY['strength'], 'rotate', true),
  ('side_plank_raise', 'Side Plank with Hip Raise', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'rotate', true),
  ('bear_hold', 'Bear Hold', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'rotate', true),
  ('plank_shoulder_tap', 'Plank Shoulder Tap', ARRAY['core','push'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'push', true),
  ('body_saw', 'Body Saw', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight','trx'], ARRAY['strength'], 'push', true),
  ('reverse_crunch', 'Reverse Crunch', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'rotate', true),
  ('dead_bug_single_arm', 'Dead Bug Single-Arm', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength'], 'rotate', true),

  -- Carry
  ('front_rack_carry', 'Front Rack Carry', ARRAY['core','legs'], ARRAY['push'], ARRAY['barbell','kettlebells'], ARRAY['strength'], 'carry', true),
  ('trap_bar_carry', 'Trap Bar Carry', ARRAY['core','legs'], ARRAY[]::text[], ARRAY['trap_bar'], ARRAY['strength','conditioning'], 'carry', true),
  ('double_kb_front_carry', 'Double Kettlebell Front Carry', ARRAY['core','legs'], ARRAY[]::text[], ARRAY['kettlebells'], ARRAY['strength'], 'carry', true),
  ('sandbag_carry', 'Sandbag Carry', ARRAY['core','legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['strength','conditioning'], 'carry', true),
  ('suitcase_deadlift', 'Suitcase Deadlift', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['dumbbells','kettlebells'], ARRAY['strength'], 'hinge', true),

  -- Conditioning / cardio
  ('rower_steady', 'Rower Steady State', ARRAY['legs','pull','core'], ARRAY[]::text[], ARRAY['rower'], ARRAY['conditioning'], 'locomotion', true),
  ('rower_intervals_30_30', 'Rower 30/30 Intervals', ARRAY['legs','pull','core'], ARRAY[]::text[], ARRAY['rower'], ARRAY['conditioning'], 'locomotion', true),
  ('assault_bike_steady', 'Assault Bike Steady', ARRAY['legs'], ARRAY['push'], ARRAY['assault_bike'], ARRAY['conditioning'], 'locomotion', true),
  ('ski_erg_intervals', 'Ski Erg Intervals', ARRAY['legs','pull','core'], ARRAY[]::text[], ARRAY['ski_erg'], ARRAY['conditioning'], 'locomotion', true),
  ('ski_erg_steady', 'Ski Erg Steady State', ARRAY['legs','pull','core'], ARRAY[]::text[], ARRAY['ski_erg'], ARRAY['conditioning'], 'locomotion', true),
  ('treadmill_run', 'Treadmill Run', ARRAY['legs'], ARRAY[]::text[], ARRAY['treadmill'], ARRAY['conditioning'], 'locomotion', true),
  ('treadmill_intervals', 'Treadmill Intervals', ARRAY['legs'], ARRAY[]::text[], ARRAY['treadmill'], ARRAY['conditioning'], 'locomotion', true),
  ('incline_treadmill_walk', 'Incline Treadmill Walk', ARRAY['legs'], ARRAY[]::text[], ARRAY['treadmill'], ARRAY['conditioning'], 'locomotion', true),
  ('stair_climber_steady', 'Stair Climber Steady', ARRAY['legs'], ARRAY[]::text[], ARRAY['stair_climber'], ARRAY['conditioning'], 'locomotion', true),
  ('elliptical_steady', 'Elliptical Steady', ARRAY['legs'], ARRAY[]::text[], ARRAY['elliptical'], ARRAY['conditioning'], 'locomotion', true),
  ('sled_drag', 'Sled Drag', ARRAY['legs','pull'], ARRAY['core'], ARRAY['sled'], ARRAY['strength','conditioning'], 'locomotion', true),
  ('battle_rope_waves', 'Battle Rope Waves', ARRAY['push','pull','core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['conditioning'], 'push', true),
  ('jump_squat_light', 'Jump Squat (Light)', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['power','conditioning'], 'squat', true),
  ('burpee_box_jump', 'Burpee Box Jump', ARRAY['legs','push','core'], ARRAY[]::text[], ARRAY['bodyweight','plyo_box'], ARRAY['conditioning'], 'locomotion', true),
  ('devils_press', 'Devil''s Press', ARRAY['legs','push','core'], ARRAY[]::text[], ARRAY['dumbbells'], ARRAY['conditioning'], 'push', true),
  ('double_unders', 'Double Unders', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['conditioning'], 'locomotion', true),
  ('air_bike_sprint', 'Air Bike Sprint', ARRAY['legs'], ARRAY['push'], ARRAY['assault_bike'], ARRAY['conditioning'], 'locomotion', true),
  ('row_calorie_burn', 'Rower Calorie Burn', ARRAY['legs','pull','core'], ARRAY[]::text[], ARRAY['rower'], ARRAY['conditioning'], 'locomotion', true),

  -- Mobility / prehab / recovery
  ('ankle_circles', 'Ankle Circles', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('ankle_dorsiflexion_stretch', 'Ankle Dorsiflexion Stretch', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('banded_ankle_mob', 'Banded Ankle Mobility', ARRAY['legs'], ARRAY[]::text[], ARRAY['bands'], ARRAY['mobility'], 'rotate', true),
  ('tibialis_raise', 'Tibialis Raise', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight','bands'], ARRAY['prehab'], 'squat', true),
  ('standing_hip_circle', 'Standing Hip Circle', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('90_90_hip_switch', '90/90 Hip Switch', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('pigeon_stretch', 'Pigeon Stretch', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('seated_hip_internal_rotation', 'Seated Hip Internal Rotation', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('lying_hip_rotation', 'Lying Hip Rotation', ARRAY['legs','core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('quadruped_hip_circle', 'Quadruped Hip Circle', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('open_book_ts', 'Open Book (T-Spine)', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('thread_needle', 'Thread the Needle', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('prone_extension', 'Prone Extension', ARRAY['core','back'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'hinge', true),
  ('childs_pose', 'Child''s Pose', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility','recovery'], 'rotate', true),
  ('sphinx_stretch', 'Sphinx Stretch', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('lat_stretch_door', 'Lat Stretch (Door)', ARRAY['pull'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'pull', true),
  ('sleeper_stretch', 'Sleeper Stretch', ARRAY['push'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('cross_body_stretch', 'Cross-Body Shoulder Stretch', ARRAY['push'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('band_ir_er', 'Band Internal/External Rotation', ARRAY['push'], ARRAY[]::text[], ARRAY['bands'], ARRAY['prehab'], 'rotate', true),
  ('wrist_circles', 'Wrist Circles', ARRAY['pull'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['mobility'], 'rotate', true),
  ('finger_extensions', 'Finger Extensions', ARRAY['pull'], ARRAY[]::text[], ARRAY['bands'], ARRAY['prehab'], 'pull', true),
  ('foam_roll_quad', 'Foam Roll Quad', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['recovery'], 'rotate', true),
  ('foam_roll_glute', 'Foam Roll Glute', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['recovery'], 'rotate', true),
  ('foam_roll_t_spine', 'Foam Roll T-Spine', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['recovery'], 'rotate', true),
  ('breathing_box', 'Box Breathing', ARRAY['core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['recovery'], 'rotate', true),

  -- Calves / arms / isolation
  ('standing_calf_raise_single', 'Single-Leg Calf Raise', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight','dumbbells'], ARRAY['strength','hypertrophy'], 'squat', true),
  ('donkey_calf_raise', 'Donkey Calf Raise', ARRAY['legs'], ARRAY[]::text[], ARRAY['machine'], ARRAY['hypertrophy'], 'squat', true),
  ('reverse_curl_ez', 'Reverse Curl (EZ Bar)', ARRAY['pull'], ARRAY[]::text[], ARRAY['ez_bar'], ARRAY['strength'], 'pull', true),
  ('zottman_curl', 'Zottman Curl', ARRAY['pull'], ARRAY[]::text[], ARRAY['dumbbells'], ARRAY['hypertrophy'], 'pull', true),
  ('drag_curl', 'Drag Curl', ARRAY['pull'], ARRAY[]::text[], ARRAY['barbell'], ARRAY['hypertrophy'], 'pull', true),
  ('lying_leg_curl', 'Lying Leg Curl', ARRAY['legs'], ARRAY[]::text[], ARRAY['machine'], ARRAY['hypertrophy'], 'hinge', true),
  ('seated_leg_curl', 'Seated Leg Curl', ARRAY['legs'], ARRAY[]::text[], ARRAY['machine'], ARRAY['hypertrophy'], 'hinge', true),
  ('cable_lateral_raise', 'Cable Lateral Raise', ARRAY['push'], ARRAY[]::text[], ARRAY['cable_machine'], ARRAY['hypertrophy'], 'push', true),
  ('leaning_lateral_raise', 'Leaning Lateral Raise', ARRAY['push'], ARRAY[]::text[], ARRAY['dumbbells'], ARRAY['hypertrophy'], 'push', true),
  ('reverse_pec_deck', 'Reverse Pec Deck', ARRAY['pull'], ARRAY[]::text[], ARRAY['machine'], ARRAY['hypertrophy'], 'pull', true),

  -- Power / athletic
  ('box_step_up', 'Box Step-Up', ARRAY['legs'], ARRAY['core'], ARRAY['plyo_box','dumbbells'], ARRAY['strength','conditioning'], 'squat', true),
  ('lateral_bound', 'Lateral Bound', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['power'], 'locomotion', true),
  ('single_leg_hop', 'Single-Leg Hop', ARRAY['legs'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['power'], 'locomotion', true),
  ('medicine_ball_chest_pass', 'Medicine Ball Chest Pass', ARRAY['push','core'], ARRAY[]::text[], ARRAY['bodyweight'], ARRAY['power'], 'push', true),
  ('kb_clean_single', 'Single-Arm Kettlebell Clean', ARRAY['legs','pull','core'], ARRAY[]::text[], ARRAY['kettlebells'], ARRAY['power'], 'hinge', true),
  ('kb_snatch', 'Kettlebell Snatch', ARRAY['legs','push','pull'], ARRAY['core'], ARRAY['kettlebells'], ARRAY['power'], 'push', true),
  ('hang_power_clean', 'Hang Power Clean', ARRAY['legs','pull'], ARRAY['core'], ARRAY['barbell'], ARRAY['power'], 'hinge', true),
  ('hang_power_snatch', 'Hang Power Snatch', ARRAY['legs','pull','push'], ARRAY['core'], ARRAY['barbell'], ARRAY['power'], 'hinge', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  equipment = EXCLUDED.equipment,
  modalities = EXCLUDED.modalities,
  movement_pattern = EXCLUDED.movement_pattern,
  is_active = EXCLUDED.is_active;

-- ============== EXERCISE_TAG_MAP for new exercises ==============
-- 1) movement_pattern -> tag
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = e.movement_pattern
WHERE e.is_active = true
  AND e.slug IN (
    'safety_bar_squat','pistol_squat','shrimp_squat','goblet_split_squat','front_rack_lunge','lateral_step_up','belt_squat','v_squat','pause_front_squat','heels_elevated_squat',
    'deficit_deadlift','snatch_grip_deadlift','kb_deadlift','back_extension_45','nordic_curl','kb_sumo_deadlift','single_leg_hip_thrust','back_extension_reverse_hyper','stability_ball_hamstring_curl',
    'dumbbell_floor_press','landmine_press_one_arm','bottoms_up_kb_press','seated_dumbbell_ohp','half_kneeling_landmine_press','trx_chest_press','cable_crossover','incline_cable_fly','dip_assisted','tricep_dip_bench','cable_tricep_extension','db_tricep_kickback','close_grip_push_up','band_chest_press','band_ohp',
    'australian_pull_up','ring_pull_up','weighted_pull_up','neutral_pull_up','wide_grip_pulldown','underhand_pulldown','inverted_row_feet_elevated','pendlay_row','yates_row','t_bar_row','db_shrug','cable_shrug','prone_y_raise','band_row','scapular_push_up','wall_angel',
    'stir_the_pot','rollout_ab_wheel','dead_bug_band','pallof_rotation','side_plank_raise','bear_hold','plank_shoulder_tap','body_saw','reverse_crunch','dead_bug_single_arm',
    'front_rack_carry','trap_bar_carry','double_kb_front_carry','sandbag_carry','suitcase_deadlift',
    'rower_steady','rower_intervals_30_30','assault_bike_steady','ski_erg_intervals','ski_erg_steady','treadmill_run','treadmill_intervals','incline_treadmill_walk','stair_climber_steady','elliptical_steady','sled_drag','battle_rope_waves','jump_squat_light','burpee_box_jump','devils_press','double_unders','air_bike_sprint','row_calorie_burn',
    'ankle_circles','ankle_dorsiflexion_stretch','banded_ankle_mob','tibialis_raise','standing_hip_circle','90_90_hip_switch','pigeon_stretch','seated_hip_internal_rotation','lying_hip_rotation','quadruped_hip_circle','open_book_ts','thread_needle','prone_extension','childs_pose','sphinx_stretch','lat_stretch_door','sleeper_stretch','cross_body_stretch','band_ir_er','wrist_circles','finger_extensions','foam_roll_quad','foam_roll_glute','foam_roll_t_spine','breathing_box',
    'standing_calf_raise_single','donkey_calf_raise','reverse_curl_ez','zottman_curl','drag_curl','lying_leg_curl','seated_leg_curl','cable_lateral_raise','leaning_lateral_raise','reverse_pec_deck',
    'box_step_up','lateral_bound','single_leg_hop','medicine_ball_chest_pass','kb_clean_single','kb_snatch','hang_power_clean','hang_power_snatch'
  )
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- 2) modalities -> tags
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
CROSS JOIN LATERAL unnest(e.modalities) AS mod(s)
JOIN public.exercise_tags t ON t.slug = mod.s
WHERE e.is_active = true
  AND e.slug IN (
    'safety_bar_squat','pistol_squat','shrimp_squat','goblet_split_squat','front_rack_lunge','lateral_step_up','belt_squat','v_squat','pause_front_squat','heels_elevated_squat',
    'deficit_deadlift','snatch_grip_deadlift','kb_deadlift','back_extension_45','nordic_curl','kb_sumo_deadlift','single_leg_hip_thrust','back_extension_reverse_hyper','stability_ball_hamstring_curl',
    'dumbbell_floor_press','landmine_press_one_arm','bottoms_up_kb_press','seated_dumbbell_ohp','half_kneeling_landmine_press','trx_chest_press','cable_crossover','incline_cable_fly','dip_assisted','tricep_dip_bench','cable_tricep_extension','db_tricep_kickback','close_grip_push_up','band_chest_press','band_ohp',
    'australian_pull_up','ring_pull_up','weighted_pull_up','neutral_pull_up','wide_grip_pulldown','underhand_pulldown','inverted_row_feet_elevated','pendlay_row','yates_row','t_bar_row','db_shrug','cable_shrug','prone_y_raise','band_row','scapular_push_up','wall_angel',
    'stir_the_pot','rollout_ab_wheel','dead_bug_band','pallof_rotation','side_plank_raise','bear_hold','plank_shoulder_tap','body_saw','reverse_crunch','dead_bug_single_arm',
    'front_rack_carry','trap_bar_carry','double_kb_front_carry','sandbag_carry','suitcase_deadlift',
    'rower_steady','rower_intervals_30_30','assault_bike_steady','ski_erg_intervals','ski_erg_steady','treadmill_run','treadmill_intervals','incline_treadmill_walk','stair_climber_steady','elliptical_steady','sled_drag','battle_rope_waves','jump_squat_light','burpee_box_jump','devils_press','double_unders','air_bike_sprint','row_calorie_burn',
    'ankle_circles','ankle_dorsiflexion_stretch','banded_ankle_mob','tibialis_raise','standing_hip_circle','90_90_hip_switch','pigeon_stretch','seated_hip_internal_rotation','lying_hip_rotation','quadruped_hip_circle','open_book_ts','thread_needle','prone_extension','childs_pose','sphinx_stretch','lat_stretch_door','sleeper_stretch','cross_body_stretch','band_ir_er','wrist_circles','finger_extensions','foam_roll_quad','foam_roll_glute','foam_roll_t_spine','breathing_box',
    'standing_calf_raise_single','donkey_calf_raise','reverse_curl_ez','zottman_curl','drag_curl','lying_leg_curl','seated_leg_curl','cable_lateral_raise','leaning_lateral_raise','reverse_pec_deck',
    'box_step_up','lateral_bound','single_leg_hop','medicine_ball_chest_pass','kb_clean_single','kb_snatch','hang_power_clean','hang_power_snatch'
  )
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- 3) primary_muscles -> tags (slug must match exercise_tags)
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
CROSS JOIN LATERAL unnest(e.primary_muscles) AS mus(s)
JOIN public.exercise_tags t ON t.slug = mus.s
WHERE e.is_active = true
  AND e.slug IN (
    'safety_bar_squat','pistol_squat','shrimp_squat','goblet_split_squat','front_rack_lunge','lateral_step_up','belt_squat','v_squat','pause_front_squat','heels_elevated_squat',
    'deficit_deadlift','snatch_grip_deadlift','kb_deadlift','back_extension_45','nordic_curl','kb_sumo_deadlift','single_leg_hip_thrust','back_extension_reverse_hyper','stability_ball_hamstring_curl',
    'dumbbell_floor_press','landmine_press_one_arm','bottoms_up_kb_press','seated_dumbbell_ohp','half_kneeling_landmine_press','trx_chest_press','cable_crossover','incline_cable_fly','dip_assisted','tricep_dip_bench','cable_tricep_extension','db_tricep_kickback','close_grip_push_up','band_chest_press','band_ohp',
    'australian_pull_up','ring_pull_up','weighted_pull_up','neutral_pull_up','wide_grip_pulldown','underhand_pulldown','inverted_row_feet_elevated','pendlay_row','yates_row','t_bar_row','db_shrug','cable_shrug','prone_y_raise','band_row','scapular_push_up','wall_angel',
    'stir_the_pot','rollout_ab_wheel','dead_bug_band','pallof_rotation','side_plank_raise','bear_hold','plank_shoulder_tap','body_saw','reverse_crunch','dead_bug_single_arm',
    'front_rack_carry','trap_bar_carry','double_kb_front_carry','sandbag_carry','suitcase_deadlift',
    'rower_steady','rower_intervals_30_30','assault_bike_steady','ski_erg_intervals','ski_erg_steady','treadmill_run','treadmill_intervals','incline_treadmill_walk','stair_climber_steady','elliptical_steady','sled_drag','battle_rope_waves','jump_squat_light','burpee_box_jump','devils_press','double_unders','air_bike_sprint','row_calorie_burn',
    'ankle_circles','ankle_dorsiflexion_stretch','banded_ankle_mob','tibialis_raise','standing_hip_circle','90_90_hip_switch','pigeon_stretch','seated_hip_internal_rotation','lying_hip_rotation','quadruped_hip_circle','open_book_ts','thread_needle','prone_extension','childs_pose','sphinx_stretch','lat_stretch_door','sleeper_stretch','cross_body_stretch','band_ir_er','wrist_circles','finger_extensions','foam_roll_quad','foam_roll_glute','foam_roll_t_spine','breathing_box',
    'standing_calf_raise_single','donkey_calf_raise','reverse_curl_ez','zottman_curl','drag_curl','lying_leg_curl','seated_leg_curl','cable_lateral_raise','leaning_lateral_raise','reverse_pec_deck',
    'box_step_up','lateral_bound','single_leg_hop','medicine_ball_chest_pass','kb_clean_single','kb_snatch','hang_power_clean','hang_power_snatch'
  )
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- 4) energy tags
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = 'energy_medium'
WHERE e.is_active = true
  AND e.slug IN (
    'safety_bar_squat','pistol_squat','shrimp_squat','goblet_split_squat','front_rack_lunge','lateral_step_up','belt_squat','v_squat','pause_front_squat','heels_elevated_squat',
    'deficit_deadlift','snatch_grip_deadlift','kb_deadlift','back_extension_45','nordic_curl','kb_sumo_deadlift','single_leg_hip_thrust','back_extension_reverse_hyper','stability_ball_hamstring_curl',
    'dumbbell_floor_press','landmine_press_one_arm','bottoms_up_kb_press','seated_dumbbell_ohp','half_kneeling_landmine_press','trx_chest_press','cable_crossover','incline_cable_fly','dip_assisted','tricep_dip_bench','cable_tricep_extension','db_tricep_kickback','close_grip_push_up','band_chest_press','band_ohp',
    'australian_pull_up','ring_pull_up','weighted_pull_up','neutral_pull_up','wide_grip_pulldown','underhand_pulldown','inverted_row_feet_elevated','pendlay_row','yates_row','t_bar_row','db_shrug','cable_shrug','prone_y_raise','band_row','scapular_push_up','wall_angel',
    'stir_the_pot','rollout_ab_wheel','dead_bug_band','pallof_rotation','side_plank_raise','bear_hold','plank_shoulder_tap','body_saw','reverse_crunch','dead_bug_single_arm',
    'front_rack_carry','trap_bar_carry','double_kb_front_carry','sandbag_carry','suitcase_deadlift',
    'standing_calf_raise_single','donkey_calf_raise','reverse_curl_ez','zottman_curl','drag_curl','lying_leg_curl','seated_leg_curl','cable_lateral_raise','leaning_lateral_raise','reverse_pec_deck',
    'box_step_up'
  )
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = 'energy_high'
WHERE e.is_active = true
  AND e.slug IN (
    'rower_steady','rower_intervals_30_30','assault_bike_steady','ski_erg_intervals','ski_erg_steady','treadmill_run','treadmill_intervals','incline_treadmill_walk','stair_climber_steady','elliptical_steady','sled_drag','battle_rope_waves','jump_squat_light','burpee_box_jump','devils_press','double_unders','air_bike_sprint','row_calorie_burn',
    'lateral_bound','single_leg_hop','medicine_ball_chest_pass','kb_clean_single','kb_snatch','hang_power_clean','hang_power_snatch'
  )
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = 'energy_low'
WHERE e.is_active = true
  AND e.slug IN (
    'ankle_circles','ankle_dorsiflexion_stretch','banded_ankle_mob','tibialis_raise','standing_hip_circle','90_90_hip_switch','pigeon_stretch','seated_hip_internal_rotation','lying_hip_rotation','quadruped_hip_circle','open_book_ts','thread_needle','prone_extension','childs_pose','sphinx_stretch','lat_stretch_door','sleeper_stretch','cross_body_stretch','band_ir_er','wrist_circles','finger_extensions','foam_roll_quad','foam_roll_glute','foam_roll_t_spine','breathing_box'
  )
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- 5) compound / unilateral / core_stability
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = 'compound'
WHERE e.is_active = true
  AND array_length(e.primary_muscles, 1) > 1
  AND e.movement_pattern IN ('squat','hinge','push','pull')
  AND e.slug IN (
    'safety_bar_squat','goblet_split_squat','front_rack_lunge','belt_squat','v_squat','pause_front_squat','heels_elevated_squat',
    'deficit_deadlift','snatch_grip_deadlift','kb_deadlift','kb_sumo_deadlift','single_leg_hip_thrust',
    'dumbbell_floor_press','landmine_press_one_arm','seated_dumbbell_ohp','half_kneeling_landmine_press','trx_chest_press','dip_assisted','tricep_dip_bench','close_grip_push_up',
    'australian_pull_up','ring_pull_up','weighted_pull_up','neutral_pull_up','inverted_row_feet_elevated','pendlay_row','yates_row','t_bar_row',
    'front_rack_carry','trap_bar_carry','double_kb_front_carry','sandbag_carry','suitcase_deadlift',
    'rower_steady','rower_intervals_30_30','assault_bike_steady','ski_erg_intervals','ski_erg_steady','treadmill_run','treadmill_intervals','incline_treadmill_walk','stair_climber_steady','elliptical_steady','sled_drag','battle_rope_waves','burpee_box_jump','devils_press','air_bike_sprint','row_calorie_burn',
    'box_step_up','medicine_ball_chest_pass','kb_clean_single','kb_snatch','hang_power_clean','hang_power_snatch'
  )
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = 'unilateral'
WHERE e.is_active = true
  AND (e.slug LIKE '%single%' OR e.slug LIKE '%split%' OR e.slug LIKE '%one_arm%' OR e.slug LIKE '%one-arm%' OR e.slug LIKE '%single_leg%' OR e.slug LIKE '%single-leg%' OR e.slug LIKE '%shrimp%' OR e.slug LIKE '%pistol%' OR e.slug LIKE '%lateral_step%' OR e.slug LIKE '%goblet_split%' OR e.slug LIKE '%suitcase%' OR e.slug LIKE '%single_leg_hop%')
  AND e.slug IN (
    'pistol_squat','shrimp_squat','goblet_split_squat','front_rack_lunge','lateral_step_up','single_leg_hip_thrust','landmine_press_one_arm','half_kneeling_landmine_press','inverted_row_feet_elevated','dead_bug_single_arm','suitcase_deadlift','standing_calf_raise_single','kb_clean_single','single_leg_hop'
  )
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = 'core_stability'
WHERE e.is_active = true AND 'core' = ANY(e.primary_muscles)
  AND e.slug IN (
    'safety_bar_squat','pistol_squat','goblet_split_squat','front_rack_lunge','lateral_step_up','pause_front_squat','heels_elevated_squat',
    'deficit_deadlift','snatch_grip_deadlift','kb_deadlift','back_extension_reverse_hyper','stability_ball_hamstring_curl',
    'push_up_plus','half_kneeling_landmine_press','trx_chest_press','close_grip_push_up','plank_shoulder_tap',
    'australian_pull_up','ring_pull_up','weighted_pull_up','neutral_pull_up','inverted_row_feet_elevated','pendlay_row','t_bar_row','scapular_push_up','wall_angel',
    'stir_the_pot','rollout_ab_wheel','dead_bug_band','pallof_rotation','side_plank_raise','bear_hold','plank_shoulder_tap','body_saw','reverse_crunch','dead_bug_single_arm',
    'front_rack_carry','trap_bar_carry','double_kb_front_carry','sandbag_carry','suitcase_deadlift',
    'rower_steady','rower_intervals_30_30','ski_erg_intervals','ski_erg_steady','sled_drag','battle_rope_waves','burpee_box_jump','devils_press','row_calorie_burn',
    'standing_hip_circle','90_90_hip_switch','pigeon_stretch','lying_hip_rotation','quadruped_hip_circle','open_book_ts','thread_needle','childs_pose','sphinx_stretch','foam_roll_t_spine','breathing_box',
    'box_step_up','medicine_ball_chest_pass','kb_clean_single','kb_snatch','hang_power_clean','hang_power_snatch'
  )
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- 6) equipment tags (extended map including new equipment)
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
    ('trap_bar','equipment_barbell'),
    ('squat_rack','equipment_barbell'),
    ('ez_bar','equipment_ez_bar'),
    ('stair_climber','equipment_machine'),
    ('elliptical','equipment_machine'),
    ('ski_erg','equipment_ski_erg'),
    ('sled','equipment_sled')
)
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
CROSS JOIN LATERAL unnest(e.equipment) AS eq(s)
JOIN eq_map m ON m.eq_slug = eq.s
JOIN public.exercise_tags t ON t.slug = m.tag_slug
WHERE e.is_active = true
  AND e.slug IN (
    'safety_bar_squat','pistol_squat','shrimp_squat','goblet_split_squat','front_rack_lunge','lateral_step_up','belt_squat','v_squat','pause_front_squat','heels_elevated_squat',
    'deficit_deadlift','snatch_grip_deadlift','kb_deadlift','back_extension_45','nordic_curl','kb_sumo_deadlift','single_leg_hip_thrust','back_extension_reverse_hyper','stability_ball_hamstring_curl',
    'dumbbell_floor_press','landmine_press_one_arm','bottoms_up_kb_press','seated_dumbbell_ohp','half_kneeling_landmine_press','trx_chest_press','cable_crossover','incline_cable_fly','dip_assisted','tricep_dip_bench','cable_tricep_extension','db_tricep_kickback','close_grip_push_up','band_chest_press','band_ohp',
    'australian_pull_up','ring_pull_up','weighted_pull_up','neutral_pull_up','wide_grip_pulldown','underhand_pulldown','inverted_row_feet_elevated','pendlay_row','yates_row','t_bar_row','db_shrug','cable_shrug','prone_y_raise','band_row','scapular_push_up','wall_angel',
    'stir_the_pot','rollout_ab_wheel','dead_bug_band','pallof_rotation','side_plank_raise','bear_hold','plank_shoulder_tap','body_saw','reverse_crunch','dead_bug_single_arm',
    'front_rack_carry','trap_bar_carry','double_kb_front_carry','sandbag_carry','suitcase_deadlift',
    'rower_steady','rower_intervals_30_30','assault_bike_steady','ski_erg_intervals','ski_erg_steady','treadmill_run','treadmill_intervals','incline_treadmill_walk','stair_climber_steady','elliptical_steady','sled_drag','battle_rope_waves','jump_squat_light','burpee_box_jump','devils_press','double_unders','air_bike_sprint','row_calorie_burn',
    'ankle_circles','ankle_dorsiflexion_stretch','banded_ankle_mob','tibialis_raise','standing_hip_circle','90_90_hip_switch','pigeon_stretch','seated_hip_internal_rotation','lying_hip_rotation','quadruped_hip_circle','open_book_ts','thread_needle','prone_extension','childs_pose','sphinx_stretch','lat_stretch_door','sleeper_stretch','cross_body_stretch','band_ir_er','wrist_circles','finger_extensions','foam_roll_quad','foam_roll_glute','foam_roll_t_spine','breathing_box',
    'standing_calf_raise_single','donkey_calf_raise','reverse_curl_ez','zottman_curl','drag_curl','lying_leg_curl','seated_leg_curl','cable_lateral_raise','leaning_lateral_raise','reverse_pec_deck',
    'box_step_up','lateral_bound','single_leg_hop','medicine_ball_chest_pass','kb_clean_single','kb_snatch','hang_power_clean','hang_power_snatch'
  )
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- 7) sport / trait tags for discoverability
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id
FROM public.exercises e
JOIN (VALUES
  ('incline_treadmill_walk', 'sport_trail'),
  ('stepup', 'sport_trail'),
  ('box_step_up', 'sport_trail'),
  ('tibialis_raise', 'sport_running'),
  ('ankle_dorsiflexion_stretch', 'sport_running'),
  ('banded_ankle_mob', 'sport_running'),
  ('ski_erg_steady', 'sport_skiing'),
  ('ski_erg_intervals', 'sport_skiing'),
  ('rower_steady', 'sport_triathlon'),
  ('rower_intervals_30_30', 'sport_triathlon'),
  ('assault_bike_steady', 'sport_triathlon'),
  ('treadmill_run', 'sport_triathlon'),
  ('sled_drag', 'sport_ocr'),
  ('rower_intervals_30_30', 'sport_ocr'),
  ('burpee_box_jump', 'sport_ocr'),
  ('prone_y_raise', 'scapular_control'),
  ('scapular_push_up', 'scapular_control'),
  ('wall_angel', 'thoracic_mobility'),
  ('open_book_ts', 'thoracic_mobility'),
  ('90_90_hip_switch', 'hip_mobility'),
  ('pigeon_stretch', 'hip_mobility'),
  ('tibialis_raise', 'low_impact'),
  ('incline_treadmill_walk', 'low_impact'),
  ('elliptical_steady', 'low_impact'),
  ('rower_steady', 'zone2'),
  ('assault_bike_steady', 'zone2'),
  ('incline_treadmill_walk', 'zone2'),
  ('rower_intervals_30_30', 'intervals'),
  ('ski_erg_intervals', 'intervals'),
  ('treadmill_intervals', 'intervals')
) AS v(ex_slug, tag_slug) ON e.slug = v.ex_slug
JOIN public.exercise_tags t ON t.slug = v.tag_slug
WHERE e.is_active = true
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- ============== EXERCISE_CONTRAINDICATIONS ==============
WITH contra_rows(exercise_slug, contraindication) AS (
  VALUES
    ('safety_bar_squat', 'knee'), ('safety_bar_squat', 'lower_back'),
    ('pistol_squat', 'knee'), ('shrimp_squat', 'knee'),
    ('goblet_split_squat', 'knee'), ('front_rack_lunge', 'knee'), ('lateral_step_up', 'knee'),
    ('belt_squat', 'knee'), ('v_squat', 'knee'), ('pause_front_squat', 'knee'), ('heels_elevated_squat', 'knee'),
    ('deficit_deadlift', 'lower_back'), ('snatch_grip_deadlift', 'lower_back'), ('snatch_grip_deadlift', 'shoulder'),
    ('nordic_curl', 'knee'), ('single_leg_hip_thrust', 'lower_back'),
    ('dumbbell_floor_press', 'shoulder'), ('seated_dumbbell_ohp', 'shoulder'), ('half_kneeling_landmine_press', 'shoulder'),
    ('trx_chest_press', 'shoulder'), ('dip_assisted', 'shoulder'), ('tricep_dip_bench', 'shoulder'),
    ('weighted_pull_up', 'shoulder'), ('neutral_pull_up', 'shoulder'), ('pendlay_row', 'lower_back'),
    ('incline_treadmill_walk', 'knee'), ('treadmill_run', 'knee'), ('treadmill_intervals', 'knee'),
    ('jump_squat_light', 'knee'), ('burpee_box_jump', 'knee'), ('lateral_bound', 'knee'), ('single_leg_hop', 'knee'),
    ('hang_power_clean', 'lower_back'), ('hang_power_snatch', 'lower_back'),
    ('sleeper_stretch', 'shoulder'), ('band_ir_er', 'shoulder')
)
INSERT INTO public.exercise_contraindications (exercise_id, contraindication, joint)
SELECT e.id, c.contraindication, c.contraindication FROM contra_rows c
JOIN public.exercises e ON e.slug = c.exercise_slug
ON CONFLICT (exercise_id, contraindication) DO NOTHING;
