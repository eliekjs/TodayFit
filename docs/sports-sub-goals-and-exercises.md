# Sports, Sub-Sport Goals, and Closely Tied Exercises

Reference list of all sports, their sub-focus (sub-goal) options, and exercises tied closely to each sport. Used by Sports Prep and the workout generator to bias exercise selection.

**Sources:** `data/sportSubFocus/sportsWithSubFocuses.ts`, `data/sportSubFocus/subFocusTagMap.ts`, `logic/workoutIntelligence/sportQualityWeights.ts`, Supabase migrations `*_starter_exercises*.sql`, `supabase/migrations/20250301000007_sports_canonical_seed.sql`.

---

## How it works

- **Sports** come from `public.sports` (DB) and the app’s `SPORTS_WITH_SUB_FOCUSES`.
- **Sub-goals** are the sub-focus options per sport (e.g. “Finger Strength”, “Aerobic Base”). They map to **tag slugs** in `SUB_FOCUS_TAG_MAP` (e.g. `finger_strength` → `finger_strength`, `grip`, `isometric_strength`).
- **Exercises** are tied to sports by:
  1. **Starter exercises** in DB: `starter_exercises` rows get tags (e.g. `pulling_strength`, `running`, `climbing`) via migrations; ranking matches sport/sub-focus tag weights to these tags.
  2. **Sport quality weights** in `sportQualityWeights.ts`: each sport has weights on training qualities (e.g. pulling_strength, grip_strength, aerobic_base), which drive the session target vector.

The “exercises closely tied” column below is a **curated summary** of exercise slugs that are explicitly tagged for that sport in migrations or that match the sport’s main tag profile.

---

## Mountain / Snow

| Sport | Sub-focuses (sub-goals) | Exercises closely tied |
|-------|--------------------------|-------------------------|
| **Backcountry Skiing or Splitboarding** | Uphill Endurance, Leg Strength, Downhill Stability, Core Stability, Knee Resilience | back_squat, step_up, bulgarian_split_squat, reverse_lunge, single_leg_rdl, hip_thrust, dead_bug, side_plank, cable_pallof_press, treadmill_incline_walk |
| **Downhill Skiing (Alpine)** | Leg Strength, Eccentric Control, Core Stability, Knee Resilience, Ankle Stability | back_squat, step_up, bulgarian_split_squat, reverse_lunge, single_leg_rdl, goblet_squat, dead_bug, side_plank, plank, cable_pallof_press, standing_calf_raise |
| **Snowboarding** | Leg Strength, Core Stability, Balance, Lateral Stability, Knee Resilience | back_squat, step_up, bulgarian_split_squat, reverse_lunge, single_leg_rdl, goblet_squat, dead_bug, side_plank, plank, cable_pallof_press, standing_calf_raise |
| **Cross-Country Skiing (Nordic)** | Aerobic Base, Double Pole / Upper, Leg Drive, Core Stability, Durability | treadmill_incline_walk, neutral_grip_pullup, lat_pulldown, chest_supported_row, back_squat, step_up, hip_thrust, dead_bug, side_plank, cable_pallof_press |

---

## Climbing

| Sport | Sub-focuses (sub-goals) | Exercises closely tied |
|-------|--------------------------|-------------------------|
| **Rock Climbing** (bouldering, sport/lead, trad) | Finger Strength, Pull Strength, Lock-off Strength, Core Tension, Shoulder Stability, Power / Dynamic, Trunk Endurance | pullup, neutral_grip_pullup, lat_pulldown, barbell_row, chest_supported_row, one_arm_cable_row, plank, dead_bug, cable_pallof_press, face_pull, band_pullapart, farmer_carry, scapular_pullup, wrist_extensor_curl, rower_intervals |
| **Ice Climbing** | Grip & Forearm Endurance, Pull Strength, Shoulder & Overhead, Core Tension, Lock-off Strength | pullup, neutral_grip_pullup, lat_pulldown, face_pull, band_pullapart, plank, dead_bug, cable_pallof_press, farmer_carry |

---

## Endurance

| Sport | Sub-focuses (sub-goals) | Exercises closely tied |
|-------|--------------------------|-------------------------|
| **Road Running** | Aerobic Base, Threshold, Speed Endurance, Running Economy, Leg Resilience | back_squat, trap_bar_deadlift, romanian_deadlift, bulgarian_split_squat, step_up, single_leg_rdl, reverse_lunge, hip_thrust, dead_bug, side_plank, cable_pallof_press, standing_calf_raise, tibialis_raise, treadmill_incline_walk |
| **Trail Running** | Aerobic Base, Uphill Endurance, Downhill Control, Ankle Stability, Terrain Adaptability | back_squat, step_up, single_leg_rdl, reverse_lunge, bulgarian_split_squat, hip_thrust, standing_calf_raise, tibialis_raise |
| **Marathon Running** | Aerobic Base, Threshold, Marathon Pace, Durability, Leg Resilience | bulgarian_split_squat, reverse_lunge, single_leg_rdl, standing_calf_raise, tibialis_raise, dead_bug, side_plank, cable_pallof_press, back_squat, romanian_deadlift, hip_thrust |
| **Ultra Running** | Aerobic Base, Durability, Leg Resilience, Uphill Endurance, Core Stability | (overlap with marathon + trail; zone2, single_leg_strength, eccentric_quad_strength, core_anti_extension) |
| **Cycling (Road)** | Aerobic Base, Threshold, VO2 Intervals, Leg Strength, Core Stability | (zone2, lactate_threshold, glute_strength, quads, hinge/squat, core_anti_extension) |
| **Cycling (Mountain)** | Aerobic Base, Threshold, Power Endurance, Leg Strength, Core Stability | (same movement tags as road cycling) |
| **Triathlon** | Aerobic Base, Threshold, Swim-Specific, Bike-Run Durability, Core Stability | scapular_control, shoulder_stability, pulling_strength, core_anti_extension, rower_intervals, posterior_chain, single_leg_strength |
| **Rucking** | Aerobic Base, Load Carriage & Durability, Leg Strength, Core Stability, Ankle Stability | back_squat, step_up, box_step_up, goblet_squat, single_leg_rdl, reverse_lunge, bulgarian_split_squat, hip_thrust, farmer_carry, suitcase_carry, treadmill_incline_walk, assault_bike_intervals, standing_calf_raise |
| **Spartan / OCR** | Work Capacity, Running Endurance, Grip Endurance, Leg Strength, Core Stability | rower_intervals, assault_bike_intervals, farmer_carry, sled_push, bulgarian_split_squat, reverse_lunge, single_leg_rdl, dead_bug, side_plank, cable_pallof_press |
| **Tactical Fitness** | Work Capacity, Running Endurance, Strength Endurance, Core Stability, Durability | rower_intervals, assault_bike_intervals, burpee, treadmill_incline_walk, farmer_carry, suitcase_carry, dead_bug, side_plank, plank, cable_pallof_press |

---

## Hybrid / Fitness

| Sport | Sub-focuses (sub-goals) | Exercises closely tied |
|-------|--------------------------|-------------------------|
| **Hyrox** | Work Capacity, Running Endurance, Lower Body Power, Grip Endurance, Core Stability | rower_intervals, assault_bike_intervals, sled_push, farmer_carry, dead_bug, side_plank, cable_pallof_press |
| **CrossFit** | Work Capacity, Strength, Power, Gymnastics Skill, Engine | back_squat, trap_bar_deadlift, barbell_bench_press, rower_intervals, assault_bike_intervals, sled_push, kettlebell_swing, pullup, plank, dead_bug |

---

## Strength / Power

| Sport | Sub-focuses (sub-goals) | Exercises closely tied |
|-------|--------------------------|-------------------------|
| **Powerlifting** | Squat, Bench, Deadlift, Accessory, Core & Bracing | back_squat, front_squat, trap_bar_deadlift, barbell_bench_press, romanian_deadlift, chest_supported_row, lat_pulldown, dead_bug, side_plank, cable_pallof_press, plank |
| **Bodybuilding** | Push (Chest/Shoulders/Triceps), Pull (Back/Biceps), Legs, Arms & Shoulders, Core & Physique | barbell_bench_press, dumbbell_bench_press, lat_pulldown, chest_supported_row, hip_thrust, hamstring_curl, cable_pallof_press, dead_bug, side_plank |
| **Track & Field / Sprinting** | Acceleration, Max Velocity, Plyometrics, Leg Strength, Hamstring & Tendon Resilience | squat_clean, box_jump, jump_squat, bounding, lateral_bound, back_squat, front_squat, romanian_deadlift, trap_bar_deadlift, nordic_curl |
| **Vertical Jump / Dunk** | Explosive jump & plyometrics, Strength foundation, Reactive & landing | box_jump, jump_squat, lateral_bound, back_squat, front_squat, single_leg_rdl, bulgarian_split_squat, nordic_curl |
| **Olympic Weightlifting** | Explosive Power, Overhead Stability, Mobility, Pull Strength, Core Bracing | (snatch, clean & jerk derivatives; pull strength, core_bracing, shoulder_stability, mobility) |
| **Powerbuilding** | Max Strength, Hypertrophy, Squat & Hinge, Press & Pull, Work Capacity | back_squat, trap_bar_deadlift, barbell_bench_press, lat_pulldown, rower_intervals |
| **Strongman** | Carries/Load, Overhead Pressing, Posterior Chain Strength, Grip/Trunk, Work Capacity | farmer_carry, suitcase_carry, trap_bar_deadlift, romanian_deadlift, plank, dead_bug, rower_intervals |

---

## Water

| Sport | Sub-focuses (sub-goals) | Exercises closely tied |
|-------|--------------------------|-------------------------|
| **Surfing** | Paddle Endurance, Pop-up Power, Core & Rotation, Shoulder Stability, Balance | cable_woodchop, medball_rotational_throw, face_pull, band_pullapart, single_leg_rdl, bulgarian_split_squat, reverse_lunge |
| **Kitesurfing / Windsurfing** | Balance, Core Stability, Grip Endurance, Leg Strength, Work Capacity | (balance, core_stability, grip_endurance, squat/lunge, rower_intervals) |
| **Paddleboarding (SUP)** | Aerobic Base, Core Stability, Balance, Shoulder Endurance | (zone2, core_stability, balance, scapular_control) |
| **Rowing** | Aerobic Base, Threshold, Posterior Chain, Core Bracing, Grip Endurance | rower_intervals, trap_bar_deadlift, romanian_deadlift, hip_thrust, plank, dead_bug, farmer_carry |
| **Swimming** | Pull Strength, Shoulder & Scapular, Core Stability, Aerobic Base, Leg/Turn Power | neutral_grip_pullup, lat_pulldown, chest_supported_row, one_arm_cable_row, scapular_pullup, face_pull, external_rotation_band, dead_bug, side_plank, cable_pallof_press, pushup_incline, landmine_press |

---

## Court / Field

| Sport | Sub-focuses (sub-goals) | Exercises closely tied |
|-------|--------------------------|-------------------------|
| **Soccer** | Aerobic Base, Speed, Change of Direction, Hamstring Resilience, Leg Power | (zone2, speed, agility, single_leg_strength, hamstrings, eccentric_strength, plyometric) |
| **Rugby** | Max Strength, Work Capacity, Posterior Chain, Grip & Durability, Speed & Power | back_squat, trap_bar_deadlift, barbell_bench_press, rower_intervals, assault_bike_intervals, farmer_carry, romanian_deadlift, hip_thrust |
| **Lacrosse** | Speed, Change of Direction, Rotational Power, Shoulder Stability, Work Capacity | lateral_lunge, reverse_lunge, bulgarian_split_squat, cable_woodchop, medball_rotational_throw, face_pull, band_pullapart, rower_intervals, assault_bike_intervals |
| **Boxing** | Rotational Power, Work Capacity, Shoulder Stability, Leg Power & Footwork, Core Stability | cable_woodchop, medball_rotational_throw, rower_intervals, assault_bike_intervals, face_pull, band_pullapart, box_jump, jump_squat, dead_bug, side_plank |
| **Basketball** | Vertical Jump, Lateral Speed, Change of Direction, Core Stability, Landing Mechanics | box_jump, jump_squat, lateral_bound, back_squat, single_leg_rdl, bulgarian_split_squat, dead_bug, side_plank, standing_calf_raise |
| **Volleyball** (indoor + beach) | Vertical Jump, Landing Mechanics, Shoulder Stability, Core Stability, Knee Resilience | box_jump, jump_squat, back_squat, bulgarian_split_squat, single_leg_rdl, standing_calf_raise, face_pull, band_pullapart, dead_bug, side_plank, t_spine_rotation |
| **Racquet & Court Sports** (Tennis, Pickleball, Badminton, Squash) | Lateral Speed, Rotational Power, Shoulder Stability, Core & Rotation, Work Capacity | lateral_lunge, reverse_lunge, bulgarian_split_squat, cable_woodchop, medball_rotational_throw, face_pull, band_pullapart, dead_bug, side_plank, cable_pallof_press, rower_intervals, assault_bike_intervals |
| **Hockey** | Speed, Change of Direction, Leg Power, Core Stability, Work Capacity | (speed, agility, single_leg_strength, balance, explosive_power, plyometric, core_stability, rower_intervals) |
| **Golf** | Rotational power, Core & rotation, Thoracic mobility, Hip mobility & stability, Core stability | cable_woodchop, medball_rotational_throw, t_spine_rotation, hip mobility drills, dead_bug, side_plank, cable_pallof_press |
| **Flag Football** | Speed, Change of Direction, Leg Power, Hamstring Resilience, Work Capacity | (speed, agility, single_leg_strength, balance, explosive_power, plyometric, hamstrings, eccentric_strength, rower_intervals) |

---

## Combat / Grappling

| Sport | Sub-focuses (sub-goals) | Exercises closely tied |
|-------|--------------------------|-------------------------|
| **Grappling** (BJJ, Judo, MMA, Wrestling) | Grip & Endurance, Hip Stability & Power, Pull Strength, Explosive Power, Work Capacity | farmer_carry, trap_bar_deadlift, romanian_deadlift, kettlebell_swing, neutral_grip_pullup, pullup, lat_pulldown, chest_supported_row, one_arm_cable_row, dead_bug, side_plank, cable_pallof_press, single_leg_rdl, bulgarian_split_squat, reverse_lunge, rower_intervals, assault_bike_intervals |
| **Muay Thai** | Rotational Power, Hip Stability & Kicks, Work Capacity, Core Stability, Leg Power | barbell_deadlift, kettlebell_swing, medball_rotational_throw, cable_woodchop, rower_intervals, assault_bike_intervals, single_leg_rdl, bulgarian_split_squat, reverse_lunge |

---

## DB-only / legacy sports

These exist in `public.sports` but are **inactive** after consolidation (legacy slugs map to canonical in app):

- **splitboarding** → backcountry_skiing  
- **rock_bouldering**, **rock_sport_lead**, **rock_trad** → rock_climbing  
- **volleyball_indoor**, **volleyball_beach** → volleyball  
- **track_field** → track_sprinting  
- **cycling_road**, **cycling_mtb** → cycling  
- **tennis**, **pickleball**, **badminton**, **squash** → court_racquet  
- **bjj**, **judo**, **mma**, **wrestling** → grappling  

Other DB sports not in `SPORTS_WITH_SUB_FOCUSES`: **hiking_backpacking**, **marathon_running**, **mountaineering**, **american_football**, **baseball_softball**.  

---

## Tag → exercise mapping (summary)

Sub-focus tag slugs from `SUB_FOCUS_TAG_MAP` map to exercise tags on `starter_exercises`. Exercises that carry those tags (after migrations) rank higher when the user selects that sport and sub-focus. Main tag groups:

- **Pull / grip / climbing:** `pulling_strength`, `vertical_pull`, `horizontal_pull`, `grip`, `finger_strength`, `lockoff_strength`, `scapular_control`, `shoulder_stability`  
- **Legs / running / ski:** `single_leg_strength`, `glute_strength`, `eccentric_quad_strength`, `knee_stability`, `ankle_stability`, `squat_pattern`, `hinge_pattern`, `posterior_chain`  
- **Core:** `core_stability`, `core_anti_extension`, `core_anti_rotation`, `core_bracing`, `core_tension`  
- **Conditioning:** `work_capacity`, `zone2_cardio`, `aerobic_base`, `lactate_threshold`, `zone3_cardio`, `anaerobic_capacity`  
- **Power / plyo:** `explosive_power`, `plyometric`, `max_strength`  
- **Rotation / court:** `rotation`, `agility`, `speed`  
- **Carry / rucking / OCR:** `carry`, `strength_endurance`  

For exact tag weights per sport sub-focus, see `data/sportSubFocus/subFocusTagMap.ts`. For sport-level quality weights (target vector), see `logic/workoutIntelligence/sportQualityWeights.ts`.
