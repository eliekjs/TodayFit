# Evidence review: Golf, Pickleball, Badminton, Squash, Hockey, Rugby, Volleyball (Indoor & Beach), Track Sprinting, Track & Field, Cross-Country Skiing, Flag Football, Lacrosse, Boxing, BJJ, Judo, MMA, Muay Thai, Wrestling, Surfing, Kitesurfing/Windsurfing, Paddleboarding, Bouldering, Sport/Lead Climbing, Trad Climbing, Ice Climbing, Cycling, Marathon Running, Rowing, Swimming, and per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for exercise selection (golf, pickleball, badminton, squash, hockey, rugby, volleyball_indoor, volleyball_beach, track_sprinting, track_field, xc_skiing, flag_football, lacrosse, boxing, bjj, judo, mma, muay_thai, wrestling, surfing, kite_wind_surf, sup, rock_bouldering, rock_sport_lead, rock_trad, ice_climbing, cycling_road, cycling_mtb, marathon_running, rowing_erg, swimming_open_water sub-focuses; vertical jump tag alignment)  
**Agent run:** workout-logic-research-integration-agent

---

## 1. Research question

What exercises and training attributes best support golf, pickleball, badminton, squash, hockey, rugby, indoor and beach volleyball, track sprinting, track & field, cross-country skiing, flag football, lacrosse, boxing, Brazilian Jiu-Jitsu, judo, MMA, Muay Thai, wrestling, surfing, kitesurfing/windsurfing, paddleboarding, bouldering, sport/lead climbing, trad climbing, ice climbing, cycling (road and mountain), marathon running, rowing (racing/erg), and swimming performance, and how should the app select exercises when the user chooses these sports (or vertical jump / dunk)? How do we ensure sport-specific exercises dominate over generic full-body strength?

---

## 2. Sources

| Source | Type (Tier) | Link / DOI | Key claim(s) |
|--------|-------------|------------|-------------|
| 4 Steps to More Rotational Power in Golf (TPI) | Practitioner / consensus | mytpi.com | Rotational power progresses: single-leg rotational taps → split-stance anti-rotation scoop toss → rotational med-ball scoop toss/shot put. T-spine and hip separation matter. |
| Effect of isolated core training on golf swing (LWW/ACSM) | Journal (Tier 2) | PubMed 23698248 | 8-week core training: ~3.6% club-head speed, 61% muscular endurance, reduced variability. |
| 5 Exercises for Thoracic Spine Mobility in Golf (TPI) | Practitioner | mytpi.com | T-spine mobility critical; limited T-spine → lumbar compensation, injury risk. |
| Golf fitness: hip rotation, core, T-spine (Utah Health, PGA, LG Performance) | Practitioner / review | healthcare.utah.edu, pga.com, lgperformance.com | Hip rotation contributes ~70% of swing power; hip + thoracic mobility reduce lower back pain; exercises: 90/90, cable chops, open books, med-ball rotational, single-leg RDL. |
| Plyometric training and vertical jump (BJSM, Frontiers) | Meta-analysis / systematic review | bjsm.bmj.com, frontiersin.org | Plyometric training improves vertical jump; squat jumps, countermovement jumps effective; combined resistance + plyometric beneficial. |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Golf performance is driven by rotational power, core control, thoracic mobility, and hip mobility/stability.**  
  Source: TPI, core training research (PubMed 23698248), golf fitness reviews.  
  Implemented: Golf added to `SPORTS_WITH_SUB_FOCUSES` with sub-focuses: rotational_power, core_rotation, thoracic_mobility, hip_mobility_stability, core_stability. `SUB_FOCUS_TAG_MAP` maps these to tags: rotation, core_anti_rotation, explosive_power, thoracic_mobility, t_spine, hip_stability, core_stability, etc.

- **Vertical jump selection should strongly prefer plyometric and explosive lower-body exercises.**  
  Source: Meta-analyses (BJSM, Frontiers).  
  Implemented: `vertical_jump:vertical_jump` tag map includes `explosive` (in addition to explosive_power, plyometric) so exercises tagged "explosive" in starter_exercises match; lateral_bound added to starter_exercises with plyometric/explosive tags.

### Context-dependent heuristics (implemented)

- **Default sub-focus when sport is golf and user selects none:** use "Rotational power" so tag-based ranking runs.  
  Implemented: `getPreferredExerciseNamesForSportAndGoals` defaults `subSlugs = ["rotational_power"]` when `primarySlug === "golf"` and no sub-focus provided.

- **Golf-relevant exercises in starter_exercises** so they appear in the preferred list when user selects golf.  
  Implemented: Migration `20250316100003_golf_starter_exercises_and_lateral_bound.sql` inserts cable_woodchop, pallof_hold, pallof_press, medball_rotational_throw, russian_twist, t_spine_rotation with tags alignment to SUB_FOCUS_TAG_MAP (rotation, core_anti_rotation, thoracic_mobility, etc.).

### Speculative / deferred

- Periodization (in-season vs off-season) and exact rep/set schemes for golf strength.  
  Reason deferred: scope is exercise selection and tag mapping only.

---

## 4. Comparison to previous implementation

- **Before:** Golf had `sportQualityWeights` (rotational_power, rotational_control, thoracic_mobility, hip_stability) but no sub-focus options or SUB_FOCUS_TAG_MAP entries, so sport-based exercise ranking did not strongly favor golf-specific exercises. Vertical jump could still surface generic strength if starter_exercises used "explosive" instead of "explosive_power" or if lateral-bound was missing.

- **Evidence suggests:** Golf training should emphasize rotation, core, T-spine, and hip mobility/stability with clear tag mapping; vertical jump should match both "explosive" and "explosive_power" and include lateral bound.

- **Gap closed:** (1) Golf in SPORTS_WITH_SUB_FOCUSES with five sub-focuses and full SUB_FOCUS_TAG_MAP. (2) Default golf sub-focus for tag ranking. (3) Golf starter_exercises (cable woodchop, pallof, medball rotational throw, russian twist, T-spine rotation) and lateral_bound for vertical jump. (4) vertical_jump tag map includes "explosive" for tag overlap.

---

## 5. Metadata / ontology impact

- **Sport sub-focus:** `golf` in `SPORTS_WITH_SUB_FOCUSES` (Court/Field) with sub_focuses: rotational_power, core_rotation, thoracic_mobility, hip_mobility_stability, core_stability.
- **Tag map:** `SUB_FOCUS_TAG_MAP` keys `golf:rotational_power`, `golf:core_rotation`, `golf:thoracic_mobility`, `golf:hip_mobility_stability`, `golf:core_stability` with slugs: rotation, core_anti_rotation, explosive_power, thoracic_mobility, t_spine, hip_stability, core_stability, etc.
- **Starter_exercises:** New/updated rows for lateral_bound (vertical jump); cable_woodchop, pallof_hold, pallof_press, medball_rotational_throw, russian_twist, t_spine_rotation (golf); t_spine_rotation_open_book gets thoracic_mobility tags when missing. Migration: `20250316100003_golf_starter_exercises_and_lateral_bound.sql`.
- **Selection flow:** Same as vertical jump: `getPreferredExerciseNamesForSportAndGoals` uses `getExerciseTagsForSubFocuses`; when golf with no sub-focus, default `["rotational_power"]`; generator +10 bonus for preferred names.

---

## 6. Open questions / follow-ups

- Add more golf-specific mobility exercises (e.g. 90/90, open book) to starter_exercises if not already covered by t_spine_rotation_open_book.
- Ensure sport_tag_profile (DB) includes golf tags so sport-level overlap ranking also surfaces golf exercises when sub-focus is not selected.

---

## 7. Pickleball (same run)

**Rationale:** Pickleball is a court/paddle sport with demands similar to tennis: lateral movement, change of direction, rotational shots, shoulder and forearm load (sport_tag_profile: lateral, change_of_direction, shoulders, forearms).

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `pickleball` with sub_focuses: lateral_speed, rotational_power, shoulder_stability, core_rotation, work_capacity (same structure as tennis).
- **SUB_FOCUS_TAG_MAP:** `pickleball:lateral_speed` → agility, speed, single_leg_strength; `pickleball:rotational_power` → rotation, explosive_power; `pickleball:shoulder_stability` → shoulder_stability, scapular_control; `pickleball:core_rotation` → rotation, core_anti_rotation; `pickleball:work_capacity` → work_capacity, anaerobic_capacity.
- **Default sub-focus:** When primary sport is pickleball and none selected, default `subSlugs = ["lateral_speed"]` so tag-based ranking runs.
- **Sport quality weights:** `pickleball` added to `sportQualityWeights.ts` with rotational_power, rotational_control, scapular_stability, work_capacity, unilateral_strength, balance.
- **Starter_exercises:** Migration `20250316100004_pickleball_starter_exercises.sql` adds lateral_lunge, banded_walk with agility/single_leg/balance tags; appends agility/rotation tags to step_up, single_leg_rdl, and golf-era cable_woodchop/pallof_hold/medball_rotational_throw where missing.

---

## 8. Rugby (same run)

**Rationale:** Rugby is a contact field sport with high demands for strength (scrum, maul, tackles), work capacity, posterior chain, grip, and durability (sport_tag_profile: contact, strength, conditioning, anaerobic_repeats, aerobic_base, trunk, durability). Development plan suggested sub-focuses: strength, work capacity, tackle resilience, speed.

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `rugby` with sub_focuses: max_strength, work_capacity, posterior_chain, grip_endurance, speed_power.
- **SUB_FOCUS_TAG_MAP:** `rugby:max_strength` → max_strength, compound, squat_pattern, hinge_pattern, horizontal_push, horizontal_pull; `rugby:work_capacity` → work_capacity, anaerobic_capacity, conditioning; `rugby:posterior_chain` → posterior_chain, hinge_pattern, glute_strength, hamstrings; `rugby:grip_endurance` → grip_endurance, grip, carry; `rugby:speed_power` → explosive_power, speed, plyometric.
- **Default sub-focus:** When primary sport is rugby and none selected, default `subSlugs = ["max_strength", "work_capacity"]` so tag-based ranking runs.
- **Sport quality weights:** `rugby` added to `sportQualityWeights.ts` with max_strength, work_capacity, posterior_chain_endurance, trunk_endurance, power, grip_strength, pushing_strength, pulling_strength.
- **Starter_exercises:** Migration `20250316100005_rugby_starter_exercises.sql` adds barbell_deadlift, barbell_back_squat, bench_press_barbell, barbell_row, pullup with rugby-relevant tags (max_strength, compound, posterior_chain, grip); appends rugby tags to farmer_carry, rower_intervals, assault_bike_intervals, sled_push, kettlebell_swing, trap_bar_deadlift, romanian_deadlift, barbell_bench_press, back_squat.

---

## 9. Volleyball (Indoor) (same run)

**Rationale:** Indoor volleyball demands jumping, overhead work, landing mechanics, shoulder health, and knee/ankle resilience (sport_tag_profile: jumping, shoulders, overhead, anaerobic_repeats, knees, ankles, landing_mechanics). Research-backed exercises: barbell_back_squat, bulgarian_split_squat, calf_raise, jump_squat, box_jump, ytw, band_pullapart, face_pull, t_spine_rotation.

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `volleyball_indoor` with sub_focuses: vertical_jump, landing_mechanics, shoulder_stability, core_stability, knee_resilience.
- **SUB_FOCUS_TAG_MAP:** `volleyball_indoor:vertical_jump` → explosive_power, plyometric, power, squat_pattern; `volleyball_indoor:landing_mechanics` → eccentric_strength, knee_stability, reactive_power; `volleyball_indoor:shoulder_stability` → shoulder_stability, scapular_control; `volleyball_indoor:core_stability` → core_stability, core_anti_extension; `volleyball_indoor:knee_resilience` → knee_stability, eccentric_quad_strength, single_leg_strength.
- **Default sub-focus:** When primary sport is volleyball_indoor and none selected, default `subSlugs = ["vertical_jump", "landing_mechanics"]`.
- **Sport quality weights:** `volleyball_indoor` added to `sportQualityWeights.ts` with power, rate_of_force_development, scapular_stability, balance, unilateral_strength, core_tension.
- **Starter_exercises:** Migration `20250316100006_volleyball_indoor_starter_exercises.sql` adds ytw, band_pullapart with shoulder/scapular tags; appends volleyball tags to box_jump, jump_squat, barbell_back_squat/back_squat, bulgarian_split_squat, standing_calf_raise/calf_raise, face_pull, t_spine_rotation/t_spine_rotation_open_book.

---

## 9b. Beach Volleyball (same run)

**Rationale:** Beach volleyball shares the same primary demands as indoor (jumping, landing, overhead, shoulder health, knee/ankle resilience) with added conditioning from sand (sport_tag_profile: sand, jumping, conditioning, knees, ankles, landing_mechanics, shoulders, overhead). Same research-backed exercise set as indoor; work_capacity weighted slightly for sand.

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `volleyball_beach` with sub_focuses: vertical_jump, landing_mechanics, shoulder_stability, core_stability, knee_resilience (same as indoor).
- **SUB_FOCUS_TAG_MAP:** `volleyball_beach:*` mirrors `volleyball_indoor` (vertical_jump, landing_mechanics, shoulder_stability, core_stability, knee_resilience → same tag slugs).
- **Default sub-focus:** When primary sport is volleyball_beach and none selected, default `subSlugs = ["vertical_jump", "landing_mechanics"]`.
- **Sport quality weights:** `volleyball_beach` in `sportQualityWeights.ts` with power, rate_of_force_development, scapular_stability, balance, unilateral_strength, core_tension, work_capacity (0.35).
- **Starter_exercises:** Shares the same starter set and tag alignment as indoor (migration `20250316100006_volleyball_indoor_starter_exercises.sql`); no separate beach migration.

---

## 9c. Track Sprinting (same run)

**Rationale:** Track sprinting (100–400m) demands acceleration, max velocity, plyometrics, leg strength, and hamstring/tendon resilience (sport_tag_profile: power, speed, sprinting, acceleration, max_velocity, plyometrics, hamstrings, ankles, tendons, high_neural). Research-backed (20250310100000): squat_clean, power_snatch, box_jump, jump_squat, barbell_back_squat, nordic_curl. See also `docs/research/track-sprinting-goal.md`.

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `track_sprinting` with sub_focuses: acceleration_power, max_velocity, plyometric_power, leg_strength, hamstring_tendon_resilience.
- **SUB_FOCUS_TAG_MAP:** `track_sprinting:acceleration_power` → explosive_power, plyometric, squat_pattern; `track_sprinting:max_velocity` → explosive_power, posterior_chain, tendon_resilience; `track_sprinting:plyometric_power` → plyometric, explosive_power; `track_sprinting:leg_strength` → max_strength, squat_pattern, hinge_pattern, glute_strength, posterior_chain; `track_sprinting:hamstring_tendon_resilience` → tendon_resilience, eccentric_strength, hinge_pattern, posterior_chain.
- **Default sub-focus:** When primary sport is track_sprinting and none selected, default `subSlugs = ["acceleration_power", "plyometric_power", "leg_strength"]`.
- **Sport quality weights:** `track_sprinting` in `sportQualityWeights.ts` with power, rate_of_force_development, tendon_resilience, max_strength, unilateral_strength.
- **Starter_exercises:** Migration `20250316100020_track_sprinting_starter_exercises_tags.sql` appends explosive_power/plyometric/track_sprinting to squat_clean, box_jump, jump_squat, bounding, lateral_bound; max_strength/squat_pattern/track_sprinting to back_squat, front_squat; hinge_pattern/posterior_chain/track_sprinting to romanian_deadlift, trap_bar_deadlift, nordic_curl.

---

## 9d. Track & Field (same run)

**Rationale:** Track & Field covers sprints, jumps, throws, and middle distance. Demands align with track sprinting (acceleration, max velocity, plyometrics, leg strength, hamstring/tendon resilience) plus jumping and throwing (sport_tag_profile: power, speed, sprinting, jumping, throws, acceleration, max_velocity, plyometrics, hamstrings, ankles, tendons, high_neural). Same exercise priorities as track sprinting; sub-focuses shared for consistent ranking.

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `track_field` with sub_focuses: acceleration_power, max_velocity, plyometric_power, leg_strength, hamstring_tendon_resilience (same as track_sprinting).
- **SUB_FOCUS_TAG_MAP:** `track_field:*` mirrors `track_sprinting` (acceleration_power, max_velocity, plyometric_power, leg_strength, hamstring_tendon_resilience → same tag slugs).
- **Default sub-focus:** When primary sport is track_field and none selected, default `subSlugs = ["acceleration_power", "plyometric_power", "leg_strength"]`.
- **Sport quality weights:** `track_field` in `sportQualityWeights.ts` with power, rate_of_force_development, tendon_resilience, max_strength, unilateral_strength.
- **Starter_exercises:** Migration `20250316100029_track_field_sport_and_starter_exercises.sql` adds track_field to public.sports and sport_tag_profile; appends track_field tag to squat_clean, box_jump, jump_squat, bounding, lateral_bound, back_squat, front_squat, romanian_deadlift, trap_bar_deadlift, nordic_curl (same set as track_sprinting).

---

## 9e. Cross-Country Skiing (Nordic) (same run)

**Rationale:** Cross-country (Nordic) skiing demands aerobic base, double-pole/upper-body power, leg drive, core stability, and durability (sport_tag_profile: endurance, aerobic, nordic_skiing, full_body, upper_body, lower_body, technique, threshold). See also `docs/research/xc-skiing-nordic-goal.md`.

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `xc_skiing` with sub_focuses: aerobic_base, double_pole_upper, leg_drive, core_stability, durability.
- **SUB_FOCUS_TAG_MAP:** `xc_skiing:aerobic_base` → zone2_cardio, aerobic_base; `xc_skiing:double_pole_upper` → pulling_strength, trunk_endurance, core_anti_extension, lats, back; `xc_skiing:leg_drive` → single_leg_strength, glute_strength, posterior_chain, squat_pattern, hinge_pattern; `xc_skiing:core_stability` → core_anti_extension, core_stability, core_anti_rotation; `xc_skiing:durability` → strength_endurance, posterior_chain, core_stability.
- **Default sub-focus:** When primary sport is xc_skiing and none selected, default `subSlugs = ["double_pole_upper", "leg_drive", "core_stability"]`.
- **Sport quality weights:** `xc_skiing` in `sportQualityWeights.ts` with aerobic_base, aerobic_power, pulling_strength, core_tension, trunk_endurance, posterior_chain_endurance, unilateral_strength, max_strength, recovery.
- **Starter_exercises:** Migration `20250316100008_xc_skiing_starter_exercises_tags.sql` appends pulling_strength/xc_skiing to neutral_grip_pullup, lat_pulldown, chest_supported_row, one_arm_cable_row; single_leg_strength/glute_strength/posterior_chain/xc_skiing to back_squat, step_up, single_leg_rdl, reverse_lunge, bulgarian_split_squat, hip_thrust, romanian_deadlift, trap_bar_deadlift; core_stability/core_anti_extension/xc_skiing to dead_bug, side_plank, cable_pallof_press; zone2_cardio/aerobic_base/xc_skiing to rower_intervals, assault_bike_intervals, treadmill_incline_walk.

---

## 10. Flag Football (same run)

**Rationale:** Flag football demands sprinting, cutting, change of direction, and anaerobic repeats (sport_tag_profile: sprinting, cutting, anaerobic_repeats, hamstrings, adductors, change_of_direction). Research-backed exercises: lateral_lunge, squat_clean, box_jump.

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `flag_football` with sub_focuses: speed, change_of_direction, leg_power, hamstring_resilience, work_capacity.
- **SUB_FOCUS_TAG_MAP:** `flag_football:speed` → speed, explosive_power; `flag_football:change_of_direction` → agility, single_leg_strength, balance; `flag_football:leg_power` → explosive_power, plyometric; `flag_football:hamstring_resilience` → hamstrings, eccentric_strength; `flag_football:work_capacity` → work_capacity, anaerobic_capacity.
- **Default sub-focus:** When primary sport is flag_football and none selected, default `subSlugs = ["speed", "change_of_direction"]`.
- **Sport quality weights:** `flag_football` added to `sportQualityWeights.ts` with anaerobic_capacity, rate_of_force_development, unilateral_strength, hip_stability, work_capacity, balance.
- **Starter_exercises:** Migration `20250316100007_flag_football_starter_exercises.sql` adds squat_clean (Power Clean) with power/explosive/speed tags; appends speed/agility/explosive tags to lateral_lunge, box_jump, jump_squat and hamstrings/eccentric to single_leg_rdl, romanian_deadlift.

---

## 11. Lacrosse (same run)

**Rationale:** Lacrosse is an intermittent field sport with sprinting, cutting, stick work (shoulders, rotational power), and anaerobic repeats (sport_tag_profile: intermittent, sprinting, cutting, shoulders, rotational_power, anaerobic_repeats).

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `lacrosse` with sub_focuses: speed, change_of_direction, rotational_power, shoulder_stability, work_capacity.
- **SUB_FOCUS_TAG_MAP:** `lacrosse:speed` → speed, explosive_power; `lacrosse:change_of_direction` → agility, single_leg_strength, balance; `lacrosse:rotational_power` → rotation, explosive_power, core_anti_rotation; `lacrosse:shoulder_stability` → shoulder_stability, scapular_control; `lacrosse:work_capacity` → work_capacity, anaerobic_capacity.
- **Default sub-focus:** When primary sport is lacrosse and none selected, default `subSlugs = ["speed", "rotational_power"]`.
- **Sport quality weights:** `lacrosse` added to `sportQualityWeights.ts` with rotational_power, rotational_control, rate_of_force_development, scapular_stability, work_capacity, unilateral_strength.
- **Starter_exercises:** Migration `20250316100008_lacrosse_starter_exercises.sql` appends lacrosse-relevant tags to lateral_lunge, banded_walk, box_jump, jump_squat (speed/agility); cable_woodchop, medball_rotational_throw, russian_twist (rotation); face_pull, ytw, band_pullapart (shoulder); rower_intervals, assault_bike_intervals, sled_push (work_capacity).

---

## 12. Boxing (same run)

**Rationale:** Boxing demands rotational power (punch generation), work capacity, shoulder health, leg drive/footwork, and core stability (sport_tag_profile: striking, footwork, conditioning, anaerobic_repeats, aerobic_base, shoulders, wrists). Research-backed exercises: trap_bar_deadlift, close_grip_bench, front_squat, kneeling_landmine_press, medball_slam, box_jump, db_row, band_pullapart.

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `boxing` with sub_focuses: rotational_power, work_capacity, shoulder_stability, leg_power, core_stability.
- **SUB_FOCUS_TAG_MAP:** `boxing:rotational_power` → rotation, explosive_power, core_anti_rotation; `boxing:work_capacity` → work_capacity, anaerobic_capacity, conditioning; `boxing:shoulder_stability` → shoulder_stability, scapular_control; `boxing:leg_power` → explosive_power, plyometric, squat_pattern; `boxing:core_stability` → core_stability, core_bracing, core_anti_extension.
- **Default sub-focus:** When primary sport is boxing and none selected, default `subSlugs = ["rotational_power", "work_capacity"]`.
- **Sport quality weights:** `boxing` added to `sportQualityWeights.ts` with rotational_power, power, work_capacity, rate_of_force_development, scapular_stability, core_tension.
- **Starter_exercises:** Migration `20250316100009_boxing_starter_exercises.sql` adds medball_slam, kneeling_landmine_press with boxing-relevant tags; appends rotation/explosive/core tags to trap_bar_deadlift, front_squat, box_jump; shoulder tags to band_pullapart; rotation/work_capacity to medball_rotational_throw, cable_woodchop; work_capacity to rower_intervals, assault_bike_intervals, sled_push, kettlebell_swing.

---

## 13. Brazilian Jiu-Jitsu (same run)

**Rationale:** BJJ is a grappling sport with high demands for grip, hip mobility/stability, core tension, pulling strength, and work capacity (sport_tag_profile: grappling, isometric, strength_endurance, mobility, hips, grip, anaerobic_repeats). Research-backed exercises: barbell_deadlift, rdl_dumbbell, barbell_back_squat, pullup, barbell_row, bench_press_barbell, push_up, kb_swing, farmer_carry.

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `bjj` with sub_focuses: grip_endurance, hip_stability, core_tension, pull_strength, work_capacity.
- **SUB_FOCUS_TAG_MAP:** `bjj:grip_endurance` → grip_endurance, grip, carry; `bjj:hip_stability` → hip_stability, hips, mobility; `bjj:core_tension` → core_tension, core_stability, core_anti_extension; `bjj:pull_strength` → pulling_strength, horizontal_pull, vertical_pull; `bjj:work_capacity` → work_capacity, anaerobic_capacity.
- **Default sub-focus:** When primary sport is bjj and none selected, default `subSlugs = ["grip_endurance", "hip_stability"]`.
- **Sport quality weights:** BJJ already in `sportQualityWeights.ts` (grip_strength, hip_stability, core_tension, mobility, work_capacity, anaerobic_capacity); no change.
- **Starter_exercises:** Migration `20250316100010_bjj_starter_exercises.sql` appends BJJ-relevant tags to farmer_carry (grip, carry); trap_bar_deadlift, romanian_deadlift, kettlebell_swing (posterior_chain, work_capacity); neutral_grip_pullup, pullup, lat_pulldown, chest_supported_row, one_arm_cable_row (pulling_strength, grip); dead_bug, side_plank, cable_pallof_press (core_tension); single_leg_rdl, bulgarian_split_squat, reverse_lunge (hip_stability); rower_intervals, assault_bike_intervals (work_capacity).

---

## 14. Judo (same run)

**Rationale:** Judo demands grip (kumi-kata), hip power and stability (throws), pulling strength, explosive power for throws, and work capacity for randori (sport_tag_profile: throws, grip, power, mobility, anaerobic_repeats, shoulders, hips). Research-backed exercises: barbell_deadlift, barbell_back_squat, pullup, kb_swing.

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `judo` with sub_focuses: grip_endurance, hip_stability, pull_strength, explosive_power, work_capacity.
- **SUB_FOCUS_TAG_MAP:** `judo:grip_endurance` → grip_endurance, grip, carry; `judo:hip_stability` → hip_stability, hips, mobility, glute_strength; `judo:pull_strength` → pulling_strength, horizontal_pull, vertical_pull; `judo:explosive_power` → explosive_power, power, hinge_pattern; `judo:work_capacity` → work_capacity, anaerobic_capacity.
- **Default sub-focus:** When primary sport is judo and none selected, default `subSlugs = ["grip_endurance", "explosive_power"]`.
- **Sport quality weights:** `judo` added to `sportQualityWeights.ts` with grip_strength, hip_stability, power, pulling_strength, work_capacity, rate_of_force_development.
- **Starter_exercises:** Migration `20250316100011_judo_starter_exercises.sql` adds power, hinge_pattern, hip_stability to barbell_deadlift and kettlebell_swing; pulling_strength, vertical_pull, grip to pullup; explosive_power to barbell_back_squat and kettlebell_swing; work_capacity to kettlebell_swing, rower_intervals, assault_bike_intervals; grip/carry to farmer_carry; hip_stability to single_leg_rdl, bulgarian_split_squat, reverse_lunge (when tags missing).

---

## 15. MMA (same run)

**Rationale:** MMA combines grappling and striking with high demands for grip, hip power/stability, pulling strength, explosive power (takedowns, strikes), and work capacity for rounds (sport_tag_profile: mixed, grappling, striking, conditioning, strength_endurance, anaerobic_repeats, mobility, durability). Research-backed exercises: barbell_deadlift, barbell_back_squat, pullup, kb_swing.

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `mma` with sub_focuses: grip_endurance, hip_stability, pull_strength, explosive_power, work_capacity.
- **SUB_FOCUS_TAG_MAP:** `mma:grip_endurance` → grip_endurance, grip, carry; `mma:hip_stability` → hip_stability, hips, mobility, glute_strength; `mma:pull_strength` → pulling_strength, horizontal_pull, vertical_pull; `mma:explosive_power` → explosive_power, power, hinge_pattern; `mma:work_capacity` → work_capacity, anaerobic_capacity.
- **Default sub-focus:** When primary sport is mma and none selected, default `subSlugs = ["explosive_power", "work_capacity"]`.
- **Sport quality weights:** `mma` added to `sportQualityWeights.ts` with grip_strength, hip_stability, power, pulling_strength, work_capacity, rate_of_force_development, rotational_power.
- **Starter_exercises:** Migration `20250316100012_mma_starter_exercises.sql` adds power, hinge_pattern, hip_stability to barbell_deadlift and kettlebell_swing; pulling_strength, vertical_pull, grip to pullup; explosive_power to barbell_back_squat and kettlebell_swing; work_capacity to kettlebell_swing, rower_intervals, assault_bike_intervals; grip/carry to farmer_carry; hip_stability to single_leg_rdl, bulgarian_split_squat, reverse_lunge (when tags missing).

---

## 16. Muay Thai (same run)

**Rationale:** Muay Thai is a striking art with kicks, knees, and clinch; demands rotational power, hip stability and mobility (kicks), work capacity for rounds, core stability (trunk), and leg power (sport_tag_profile: striking, kicks, conditioning, anaerobic_repeats, hips, shins, trunk, aerobic_base). Research-backed exercises: barbell_deadlift, push_up, kb_swing.

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `muay_thai` with sub_focuses: rotational_power, hip_stability, work_capacity, core_stability, leg_power.
- **SUB_FOCUS_TAG_MAP:** `muay_thai:rotational_power` → rotation, explosive_power, core_anti_rotation; `muay_thai:hip_stability` → hip_stability, hips, mobility, glute_strength; `muay_thai:work_capacity` → work_capacity, anaerobic_capacity, conditioning; `muay_thai:core_stability` → core_stability, core_bracing, core_anti_extension; `muay_thai:leg_power` → explosive_power, plyometric, squat_pattern.
- **Default sub-focus:** When primary sport is muay_thai and none selected, default `subSlugs = ["rotational_power", "work_capacity"]`.
- **Sport quality weights:** `muay_thai` added to `sportQualityWeights.ts` with rotational_power, hip_stability, power, work_capacity, rate_of_force_development, core_tension.
- **Starter_exercises:** Migration `20250316100013_muay_thai_starter_exercises.sql` adds power, hinge_pattern, hip_stability to barbell_deadlift and kettlebell_swing; rotation, explosive_power, core_stability to medball_rotational_throw, cable_woodchop; work_capacity to kettlebell_swing, rower_intervals, assault_bike_intervals; hip_stability to single_leg_rdl, bulgarian_split_squat, reverse_lunge; explosive_power, plyometric to box_jump, jump_squat (when tags missing).

---

## 17. Wrestling (same run)

**Rationale:** Wrestling (folkstyle, freestyle, Greco-Roman) demands grip (ties, mat control), hip power and stability (takedowns, sprawls), pulling strength, explosive power, and work capacity for matches (sport_tag_profile: grappling, power, anaerobic_repeats, strength_endurance, neck_optional, hips, durability). Research-backed exercises: barbell_deadlift, barbell_back_squat, pullup, barbell_row, kb_swing.

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `wrestling` with sub_focuses: grip_endurance, hip_stability, pull_strength, explosive_power, work_capacity.
- **SUB_FOCUS_TAG_MAP:** `wrestling:grip_endurance` → grip_endurance, grip, carry; `wrestling:hip_stability` → hip_stability, hips, mobility, glute_strength; `wrestling:pull_strength` → pulling_strength, horizontal_pull, vertical_pull; `wrestling:explosive_power` → explosive_power, power, hinge_pattern; `wrestling:work_capacity` → work_capacity, anaerobic_capacity.
- **Default sub-focus:** When primary sport is wrestling and none selected, default `subSlugs = ["explosive_power", "work_capacity"]`.
- **Sport quality weights:** `wrestling` added to `sportQualityWeights.ts` with grip_strength, hip_stability, power, pulling_strength, work_capacity, rate_of_force_development.
- **Starter_exercises:** Migration `20250316100014_wrestling_starter_exercises.sql` adds power, hinge_pattern, hip_stability to barbell_deadlift and kettlebell_swing; pulling_strength, vertical_pull, grip to pullup; pulling_strength, horizontal_pull, grip to barbell_row; explosive_power to barbell_back_squat and kettlebell_swing; work_capacity to kettlebell_swing, rower_intervals, assault_bike_intervals; grip/carry to farmer_carry; hip_stability to single_leg_rdl, bulgarian_split_squat, reverse_lunge (when tags missing).

---

## 18. Surfing (same run)

**Rationale:** Surfing demands paddle endurance (shoulder/scapular), pop-up power (explosive prone-to-stand), core rotation, shoulder stability, and balance (sport_tag_profile: paddling, upper_body, shoulders, trunk, pop_up, anaerobic_bursts, balance). Research-backed exercises: burpee, push_up, walking_lunge, goblet_squat, plank, pike_push_up, rower, ski_erg.

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `surfing` already present with sub_focuses: paddle_endurance, pop_up_power, core_rotation, shoulder_stability, balance.
- **SUB_FOCUS_TAG_MAP:** Already present: `surfing:paddle_endurance` → scapular_control, shoulder_stability, strength_endurance; `surfing:pop_up_power` → explosive_power, core_anti_extension; `surfing:core_rotation` → rotation, core_anti_rotation; `surfing:shoulder_stability` → shoulder_stability, scapular_control; `surfing:balance` → balance, single_leg_strength.
- **Default sub-focus:** When primary sport is surfing and none selected, default `subSlugs = ["pop_up_power", "paddle_endurance"]`.
- **Sport quality weights:** Surfing already in `sportQualityWeights.ts` (paddling_endurance, thoracic_mobility, pop_up_power, balance, rotational_control, core_tension, pushing_strength); no change.
- **Starter_exercises:** Migration `20250316100015_surfing_starter_exercises.sql` adds scapular_control, shoulder_stability to rower_intervals; explosive_power, core_anti_extension to burpee; core_anti_extension, core_stability to plank; rotation, core_anti_rotation to cable_woodchop, medball_rotational_throw; shoulder_stability, scapular_control to face_pull, band_pullapart; balance, single_leg_strength to single_leg_rdl, bulgarian_split_squat, reverse_lunge (when tags missing).

---

## 19. Kitesurfing / Windsurfing (same run)

**Rationale:** Kitesurfing and windsurfing demand balance (board stance), core stability (trunk control), grip endurance (bar/rig control), leg strength (loading and stance), and work capacity for sessions (sport_tag_profile: balance, trunk, grip, legs, anaerobic_bursts, endurance).

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `kite_wind_surf` with sub_focuses: balance, core_stability, grip_endurance, leg_strength, work_capacity.
- **SUB_FOCUS_TAG_MAP:** `kite_wind_surf:balance` → balance, single_leg_strength; `kite_wind_surf:core_stability` → core_stability, core_anti_rotation, core_bracing; `kite_wind_surf:grip_endurance` → grip_endurance, grip, carry; `kite_wind_surf:leg_strength` → squat_pattern, single_leg_strength, lunge_pattern; `kite_wind_surf:work_capacity` → work_capacity, anaerobic_capacity.
- **Default sub-focus:** When primary sport is kite_wind_surf and none selected, default `subSlugs = ["balance", "core_stability"]`.
- **Sport quality weights:** `kite_wind_surf` added to `sportQualityWeights.ts` with balance, core_tension, grip_strength, work_capacity, unilateral_strength.
- **Starter_exercises:** Migration `20250316100016_kite_wind_surf_starter_exercises.sql` adds balance, single_leg_strength to single_leg_rdl, bulgarian_split_squat, reverse_lunge; core_stability, core_anti_rotation to dead_bug, side_plank, cable_pallof_press; grip, grip_endurance, carry to farmer_carry; squat_pattern, lunge_pattern to goblet_squat, reverse_lunge, bulgarian_split_squat; work_capacity, anaerobic_capacity to rower_intervals, assault_bike_intervals (when tags missing).

---

## 20. Paddleboarding (SUP) (same run)

**Rationale:** Stand-up paddleboarding demands aerobic base (steady paddling), core stability (trunk on board), balance (standing), and shoulder endurance (paddle stroke) (sport_tag_profile: steady_state, aerobic, balance, trunk, shoulders, low_impact).

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `sup` already present with sub_focuses: aerobic_base, core_stability, balance, shoulder_endurance.
- **SUB_FOCUS_TAG_MAP:** Already present: `sup:aerobic_base` → zone2_cardio, aerobic_base; `sup:core_stability` → core_stability, core_anti_rotation; `sup:balance` → balance; `sup:shoulder_endurance` → scapular_control, strength_endurance.
- **Default sub-focus:** When primary sport is sup and none selected, default `subSlugs = ["aerobic_base", "core_stability"]`.
- **Sport quality weights:** `sup` added to `sportQualityWeights.ts` with aerobic_base, balance, core_tension, paddling_endurance.
- **Starter_exercises:** Migration `20250316100017_sup_starter_exercises.sql` adds zone2_cardio, aerobic_base to rower_intervals, treadmill_incline_walk, assault_bike_intervals; core_stability, core_anti_rotation to dead_bug, side_plank, cable_pallof_press; balance to single_leg_rdl, bulgarian_split_squat, reverse_lunge; scapular_control, shoulder_stability to rower_intervals, face_pull, band_pullapart (when tags missing).

---

## 21. Bouldering (same run)

**Rationale:** Bouldering demands finger strength, pull strength, lockoff strength, core tension, shoulder stability, and power/dynamic movement (sport_tag_profile: bouldering, power, strength, finger_strength, grip, pulling, shoulder_stability, high_neural, anaerobic_alactic). Research-backed exercises: pullup, chinup, lat_pulldown, db_row, barbell_row, cable_row, barbell_deadlift, rdl_dumbbell, plank, dead_bug, pallof_hold, face_pull, band_pullapart, ytw, wrist_curl.

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `rock_bouldering` already present with sub_focuses: finger_strength, pull_strength, lockoff_strength, core_tension, shoulder_stability, power_dynamic.
- **SUB_FOCUS_TAG_MAP:** Already present: `rock_bouldering:finger_strength` → finger_strength, grip, isometric_strength; `rock_bouldering:pull_strength` → pulling_strength, vertical_pull, lats; `rock_bouldering:lockoff_strength` → lockoff_strength, isometric_strength; `rock_bouldering:core_tension` → core_anti_extension, core_stability; `rock_bouldering:shoulder_stability` → shoulder_stability, scapular_control; `rock_bouldering:power_dynamic` → explosive_power, plyometric.
- **Default sub-focus:** When primary sport is rock_bouldering and none selected, default `subSlugs = ["pull_strength", "core_tension"]`.
- **Sport quality weights:** rock_bouldering already in `sportQualityWeights.ts` (pulling_strength, grip_strength, lockoff_strength, scapular_stability, core_tension, forearm_endurance, power, tendon_resilience); no change.
- **Starter_exercises:** Migration `20250316100018_rock_bouldering_starter_exercises.sql` adds pulling_strength, vertical_pull, lats to pullup, neutral_grip_pullup, lat_pulldown; pulling_strength, horizontal_pull, lats to barbell_row, chest_supported_row, one_arm_cable_row; core_anti_extension, core_stability to plank, dead_bug, cable_pallof_press; shoulder_stability, scapular_control to face_pull, band_pullapart; grip to pullup, neutral_grip_pullup, farmer_carry (when tags missing).

---

## 22. Sport/Lead Climbing (same run)

**Rationale:** Sport and lead climbing demand finger strength, pull strength, lockoff strength, core tension, shoulder stability, and power/dynamic movement, with greater emphasis on strength endurance and aerobic support than bouldering (sport_tag_profile: strength_endurance, grip, pulling, forearms, aerobic_support, anaerobic_repeats, pacing). Research-backed exercises: pullup, chinup, lat_pulldown, face_pull, band_pullapart, ytw, rower.

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `rock_sport_lead` already present with sub_focuses: finger_strength, pull_strength, lockoff_strength, core_tension, shoulder_stability, power_dynamic.
- **SUB_FOCUS_TAG_MAP:** Already present: `rock_sport_lead:finger_strength` → finger_strength, grip, isometric_strength; `rock_sport_lead:pull_strength` → pulling_strength, vertical_pull, lats, back; `rock_sport_lead:lockoff_strength` → lockoff_strength, isometric_strength, pulling_strength; `rock_sport_lead:core_tension` → core_anti_extension, core_stability; `rock_sport_lead:shoulder_stability` → shoulder_stability, scapular_control, scapular_strength; `rock_sport_lead:power_dynamic` → explosive_power, plyometric.
- **Default sub-focus:** When primary sport is rock_sport_lead and none selected, default `subSlugs = ["pull_strength", "shoulder_stability"]`.
- **Sport quality weights:** rock_sport_lead already in `sportQualityWeights.ts` (pulling_strength, grip_strength, forearm_endurance, scapular_stability, core_tension, aerobic_base, anaerobic_capacity); no change.
- **Starter_exercises:** Migration `20250316100019_rock_sport_lead_starter_exercises.sql` adds pulling_strength, vertical_pull, lats to pullup, neutral_grip_pullup, lat_pulldown; pulling_strength, horizontal_pull, lats to barbell_row, chest_supported_row, one_arm_cable_row; core_anti_extension, core_stability to plank, dead_bug, cable_pallof_press; shoulder_stability, scapular_control to face_pull, band_pullapart; grip to pullup, neutral_grip_pullup, farmer_carry; aerobic_base, strength_endurance to rower_intervals (when tags missing).

---

## 23. Trad Climbing (same run)

**Rationale:** Traditional (trad) climbing demands finger strength, pull strength, lockoff strength, core tension, shoulder stability, and trunk endurance for long pitches and gear placement (sport_tag_profile: endurance, grip, pulling, durability, aerobic_support). Research-backed: pullup (shared with other climbing disciplines).

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `rock_trad` added with sub_focuses: finger_strength, pull_strength, lockoff_strength, core_tension, shoulder_stability, trunk_endurance (replacing power_dynamic with trunk_endurance for trad’s endurance emphasis).
- **SUB_FOCUS_TAG_MAP:** `rock_trad:finger_strength` → finger_strength, grip, isometric_strength; `rock_trad:pull_strength` → pulling_strength, vertical_pull, lats, back; `rock_trad:lockoff_strength` → lockoff_strength, isometric_strength, pulling_strength; `rock_trad:core_tension` → core_anti_extension, core_stability; `rock_trad:shoulder_stability` → shoulder_stability, scapular_control; `rock_trad:trunk_endurance` → core_stability, strength_endurance, aerobic_base.
- **Default sub-focus:** When primary sport is rock_trad and none selected, default `subSlugs = ["pull_strength", "trunk_endurance"]`.
- **Sport quality weights:** rock_trad already in `sportQualityWeights.ts` (pulling_strength, grip_strength, forearm_endurance, scapular_stability, aerobic_base, trunk_endurance); no change.
- **Starter_exercises:** Migration `20250316100020_rock_trad_starter_exercises.sql` adds pulling_strength, vertical_pull, lats to pullup, neutral_grip_pullup, lat_pulldown; pulling_strength, horizontal_pull, lats to barbell_row, chest_supported_row, one_arm_cable_row; core_anti_extension, core_stability to plank, dead_bug, cable_pallof_press; shoulder_stability, scapular_control to face_pull, band_pullapart; grip to pullup, neutral_grip_pullup, farmer_carry; strength_endurance, aerobic_base to rower_intervals and plank (when tags missing).

---

## 24. Ice Climbing (same run)

**Rationale:** Ice climbing demands grip and forearm endurance (tool grip), pull strength, shoulder stability and overhead work (tool placement, lockoffs), core tension, and lockoff strength (sport_tag_profile: grip, forearms, shoulders, overhead, high_isometric). Research-backed exercises: pullup, face_pull, wrist_curl, plank, oh_press.

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `ice_climbing` added with sub_focuses: grip_endurance, pull_strength, shoulder_stability, core_tension, lockoff_strength.
- **SUB_FOCUS_TAG_MAP:** `ice_climbing:grip_endurance` → grip_endurance, grip, isometric_strength; `ice_climbing:pull_strength` → pulling_strength, vertical_pull, lats; `ice_climbing:shoulder_stability` → shoulder_stability, scapular_control, vertical_push; `ice_climbing:core_tension` → core_anti_extension, core_stability; `ice_climbing:lockoff_strength` → lockoff_strength, isometric_strength.
- **Default sub-focus:** When primary sport is ice_climbing and none selected, default `subSlugs = ["grip_endurance", "pull_strength"]`.
- **Sport quality weights:** `ice_climbing` added to `sportQualityWeights.ts` with grip_strength, pulling_strength, forearm_endurance, scapular_stability, core_tension.
- **Starter_exercises:** Migration `20250316100021_ice_climbing_starter_exercises.sql` adds pulling_strength, vertical_pull, lats, grip to pullup, neutral_grip_pullup, lat_pulldown; shoulder_stability, scapular_control to face_pull, band_pullapart; vertical_push, shoulder_stability to landmine_press; core_anti_extension, core_stability to plank, dead_bug, cable_pallof_press; grip, grip_endurance to pullup, neutral_grip_pullup, farmer_carry (when tags missing).

---

## 25. Cycling (Road) (same run)

**Rationale:** Road cycling demands aerobic base, threshold, VO2 intervals, leg strength, and core stability (sport_tag_profile: aerobic, steady_state, tempo, threshold, lower_body, quads, glutes, low_impact). Evidence: heavy strength (e.g. half-squats, leg strength) improves cycling economy and performance; core stability supports sustained riding (see docs/research/cycling-road-goal.md).

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `cycling_road` already present with sub_focuses: aerobic_base, threshold, vo2_intervals, leg_strength, core_stability.
- **SUB_FOCUS_TAG_MAP:** Already present: `cycling_road:aerobic_base` → zone2_cardio, aerobic_base; `cycling_road:threshold` → lactate_threshold, tempo; `cycling_road:vo2_intervals` → vo2_max, anaerobic_capacity; `cycling_road:leg_strength` → glute_strength, squat_pattern, single_leg_strength; `cycling_road:core_stability` → core_stability, core_anti_rotation.
- **Default sub-focus:** When primary sport is cycling_road and none selected, default `subSlugs = ["aerobic_base", "leg_strength"]`.
- **Sport quality weights:** cycling_road already in `sportQualityWeights.ts` (aerobic_base, aerobic_power, posterior_chain_endurance, etc.); no change.
- **Starter_exercises:** Migration `20250316100003_cycling_road_starter_exercises_tags.sql` adds glute_strength, cycling to back_squat, trap_bar_deadlift, romanian_deadlift, bulgarian_split_squat, step_up, single_leg_rdl, reverse_lunge, hip_thrust; core_stability, cycling to dead_bug, side_plank, cable_pallof_press; zone2_cardio, aerobic_base, cycling to assault_bike_intervals; cycling to treadmill_incline_walk (when tags missing).

---

## 26. Cycling (Mountain) (same run)

**Rationale:** Mountain biking demands aerobic base, threshold, power endurance, leg strength, and core stability (sport_tag_profile: aerobic, mountain_bike, anaerobic_repeats, handling_skill, hills, lower_body, power_endurance, low_impact). Evidence: single-leg, posterior chain, core anti-movement support trail riding and handling (see docs/research/cycling-mountain-goal.md).

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `cycling_mtb` already present with sub_focuses: aerobic_base, threshold, power_endurance, leg_strength, core_stability.
- **SUB_FOCUS_TAG_MAP:** Already present: `cycling_mtb:aerobic_base` → zone2_cardio, aerobic_base; `cycling_mtb:threshold` → lactate_threshold, tempo; `cycling_mtb:power_endurance` → power_endurance, anaerobic_capacity; `cycling_mtb:leg_strength` → glute_strength, single_leg_strength, squat_pattern; `cycling_mtb:core_stability` → core_stability, core_anti_rotation.
- **Default sub-focus:** When primary sport is cycling_mtb and none selected, default `subSlugs = ["aerobic_base", "leg_strength"]`.
- **Sport quality weights:** cycling_mtb already in `sportQualityWeights.ts`; no change.
- **Starter_exercises:** Migration `20250316100009_cycling_mtb_starter_exercises_tags.sql` adds glute_strength, single_leg_strength, cycling_mtb to back_squat, trap_bar_deadlift, romanian_deadlift, bulgarian_split_squat, step_up, single_leg_rdl, reverse_lunge, hip_thrust, lateral_lunge; core_stability, core_anti_rotation, cycling_mtb to dead_bug, side_plank, cable_pallof_press; zone2_cardio, aerobic_base, cycling_mtb to assault_bike_intervals, rower_intervals, treadmill_incline_walk (when tags missing).

---

## 27. Marathon Running (same run)

**Rationale:** Marathon running demands aerobic base, threshold, marathon-pace work, durability (strength endurance, core), and leg resilience (eccentric, knee, calves). Strength training supports running economy and injury resilience (aligned with road-running evidence).

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `marathon_running` already present with sub_focuses: aerobic_base, threshold, marathon_pace, durability, leg_resilience.
- **SUB_FOCUS_TAG_MAP:** Already present: `marathon_running:aerobic_base` → zone2_cardio, aerobic_base; `marathon_running:threshold` → lactate_threshold, zone3_cardio; `marathon_running:marathon_pace` → zone3_cardio, aerobic_base; `marathon_running:durability` → strength_endurance, core_stability; `marathon_running:leg_resilience` → eccentric_quad_strength, knee_stability, calves.
- **Default sub-focus:** When primary sport is marathon_running and none selected, default `subSlugs = ["aerobic_base", "leg_resilience"]`.
- **Sport quality weights:** `marathon_running` added to `sportQualityWeights.ts` with aerobic_base, aerobic_power, posterior_chain_endurance, tendon_resilience, trunk_endurance.
- **Starter_exercises:** Migration `20250316100022_marathon_running_starter_exercises.sql` adds zone2_cardio, aerobic_base to treadmill_incline_walk; eccentric_quad_strength, knee_stability, single_leg_strength to bulgarian_split_squat, reverse_lunge, single_leg_rdl; calves, ankle_stability to standing_calf_raise, tibialis_raise; strength_endurance, core_stability to dead_bug, side_plank, cable_pallof_press; glute_strength, single_leg_strength to back_squat, romanian_deadlift, bulgarian_split_squat, single_leg_rdl, reverse_lunge, hip_thrust (when tags missing).

---

## 28. Rowing (Racing / Erg) (same run)

**Rationale:** Rowing (on-water racing and erg) demands aerobic base, threshold, posterior chain (leg drive, hinge), core bracing, and grip endurance (sport_tag_profile: aerobic, full_body, hinge, posterior_chain, trunk, low_impact, threshold). Evidence: leg drive + posterior chain + core + pull (see docs/research/rowing-erg-goal.md). Research-backed: rower, rower_steady, rower_intervals_30_30.

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `rowing_erg` already present with sub_focuses: aerobic_base, threshold, posterior_chain, core_bracing, grip_endurance.
- **SUB_FOCUS_TAG_MAP:** Already present: `rowing_erg:aerobic_base` → zone2_cardio, aerobic_base; `rowing_erg:threshold` → lactate_threshold, zone3_cardio; `rowing_erg:posterior_chain` → posterior_chain, hinge_pattern, glute_strength; `rowing_erg:core_bracing` → core_bracing, core_anti_extension; `rowing_erg:grip_endurance` → grip_endurance, grip.
- **Default sub-focus:** When primary sport is rowing_erg and none selected, default `subSlugs = ["aerobic_base", "posterior_chain"]`.
- **Sport quality weights:** rowing_erg already in `sportQualityWeights.ts` (aerobic_base, aerobic_power, posterior_chain_endurance, trunk_endurance, pulling_strength); no change.
- **Starter_exercises:** Migration `20250316100012_rowing_erg_starter_exercises_tags.sql` adds zone2_cardio, aerobic_base, rowing_erg to rower_intervals, rower_intervals_30_30, rower_steady, assault_bike_intervals; posterior_chain, hinge_pattern, glute_strength, rowing_erg to romanian_deadlift, trap_bar_deadlift, hip_thrust, back_squat, single_leg_rdl; core_bracing, core_anti_extension, rowing_erg to dead_bug, side_plank, plank, cable_pallof_press; grip_endurance, grip, rowing_erg to farmer_carry, chest_supported_row, one_arm_cable_row (when tags missing).

---

## 29. Swimming (same run)

**Rationale:** Swimming (lap and open water) demands pull strength, shoulder and scapular stability, core stability, aerobic base, and leg/turn power (sport_tag_profile: aerobic, upper_body, shoulders, scapular_control, low_impact, breathing). Evidence: dryland pull strength, scapular/shoulder stability, and core transfer to swimming (see docs/research/swimming-open-water-goal.md). Research-backed: pullup, push_up, bench_press_barbell (sport_swimming_open_water).

**Implemented:**

- **SPORTS_WITH_SUB_FOCUSES:** `swimming_open_water` added with sub_focuses: pull_strength, shoulder_scapular, core_stability, aerobic_base, leg_turn_power.
- **SUB_FOCUS_TAG_MAP:** Already present: `swimming_open_water:pull_strength` → pulling_strength, vertical_pull, horizontal_pull, lats, back; `swimming_open_water:shoulder_scapular` → scapular_control, shoulder_stability, core_anti_extension; `swimming_open_water:core_stability` → core_anti_extension, core_stability, core_anti_rotation; `swimming_open_water:aerobic_base` → zone2_cardio, aerobic_base; `swimming_open_water:leg_turn_power` → explosive_power, squat_pattern, quads, glute_strength.
- **Default sub-focus:** When primary sport is swimming_open_water and none selected, default `subSlugs = ["pull_strength", "shoulder_scapular", "core_stability"]`.
- **Sport quality weights:** swimming_open_water already in `sportQualityWeights.ts` (pulling_strength, scapular_stability, core_tension, trunk_endurance, aerobic_base, pushing_strength, power, recovery); no change.
- **Starter_exercises:** Migration `20250316100005_swimming_open_water_starter_exercises_tags.sql` adds pulling_strength, vertical_pull, swimming to neutral_grip_pullup, lat_pulldown; pulling_strength, horizontal_pull, swimming to chest_supported_row, one_arm_cable_row; scapular_control, shoulder_stability, swimming to scapular_pullup, face_pull, external_rotation_band; core_stability, core_anti_extension, swimming to dead_bug, side_plank, cable_pallof_press; swimming to pushup_incline, landmine_press (when tags missing).

---

## 30. Badminton (same run)

**Rationale:** Badminton is a court racquet sport with explosive lateral movement, overhead strokes, and rotational power (similar to tennis). sport_tag_profile: court, racquet, lateral, change_of_direction, anaerobic_repeats, shoulders, rotational_power, explosive, wrists. Sub-focuses mirror tennis: lateral_speed, rotational_power, shoulder_stability, core_rotation, work_capacity.

**Implemented:**

- **DB:** Migration `20250316100024_badminton_sport_and_starter_exercises.sql` inserts badminton into `public.sports` (Court/Field) and `sport_tag_profile`; appends badminton-relevant tags to starter_exercises (agility, speed, rotation, explosive_power, shoulder_stability, scapular_control, core_anti_rotation, core_stability, work_capacity, anaerobic_capacity) for lateral_lunge, reverse_lunge, bulgarian_split_squat, cable_woodchop, medball_rotational_throw, face_pull, band_pullapart, dead_bug, side_plank, cable_pallof_press, rower_intervals, assault_bike_intervals (when tags missing).
- **SPORTS_WITH_SUB_FOCUSES:** `badminton` added (Court/Field) with sub_focuses: lateral_speed, rotational_power, shoulder_stability, core_rotation, work_capacity.
- **SUB_FOCUS_TAG_MAP:** `badminton:lateral_speed` → agility, speed; `badminton:rotational_power` → rotation, explosive_power; `badminton:shoulder_stability` → shoulder_stability, scapular_control; `badminton:core_rotation` → rotation, core_anti_rotation; `badminton:work_capacity` → work_capacity, anaerobic_capacity.
- **Default sub-focus:** When primary sport is badminton and none selected, default `subSlugs = ["lateral_speed", "rotational_power"]`.
- **Sport quality weights:** badminton added to `sportQualityWeights.ts` (rotational_power, rotational_control, scapular_stability, work_capacity, unilateral_strength).

---

## 31. Squash (same run)

**Rationale:** Squash is a court racquet sport with lateral movement, rotation, and anaerobic bursts (similar to tennis and badminton). sport_tag_profile: court, racquet, lateral, change_of_direction, anaerobic_repeats, shoulders, rotational_power, explosive, wrists. Sub-focuses mirror tennis/badminton: lateral_speed, rotational_power, shoulder_stability, core_rotation, work_capacity.

**Implemented:**

- **DB:** Migration `20250316100025_squash_sport_and_starter_exercises.sql` inserts squash into `public.sports` (Court/Field) and `sport_tag_profile`; appends squash-relevant tags to starter_exercises (agility, speed, rotation, explosive_power, shoulder_stability, scapular_control, core_anti_rotation, core_stability, work_capacity, anaerobic_capacity) for the same court-racquet exercise slugs as badminton (when tags missing).
- **SPORTS_WITH_SUB_FOCUSES:** `squash` added (Court/Field) with sub_focuses: lateral_speed, rotational_power, shoulder_stability, core_rotation, work_capacity.
- **SUB_FOCUS_TAG_MAP:** `squash:lateral_speed` → agility, speed; `squash:rotational_power` → rotation, explosive_power; `squash:shoulder_stability` → shoulder_stability, scapular_control; `squash:core_rotation` → rotation, core_anti_rotation; `squash:work_capacity` → work_capacity, anaerobic_capacity.
- **Default sub-focus:** When primary sport is squash and none selected, default `subSlugs = ["lateral_speed", "rotational_power"]`.
- **Sport quality weights:** squash added to `sportQualityWeights.ts` (rotational_power, rotational_control, scapular_stability, work_capacity 0.6, unilateral_strength).

---

## 32. Hockey (same run)

**Rationale:** Hockey (ice hockey) demands skating power, speed, change of direction, core stability, and anaerobic work capacity. sport_tag_profile: field, skating, power, speed, change_of_direction, anaerobic_repeats, lower_body, core, work_capacity. Sub-focuses: speed, change_of_direction, leg_power, core_stability, work_capacity (aligned with flag_football and lacrosse tag maps).

**Implemented:**

- **DB:** Migration `20250316100026_hockey_sport_and_starter_exercises.sql` inserts hockey into `public.sports` (Court/Field) and `sport_tag_profile`; appends hockey-relevant tags to starter_exercises (speed, agility, explosive_power, plyometric, core_stability, core_anti_extension, work_capacity, anaerobic_capacity) for lateral_lunge, reverse_lunge, bulgarian_split_squat, box_jump, jump_squat, dead_bug, side_plank, cable_pallof_press, rower_intervals, assault_bike_intervals (when tags missing).
- **SPORTS_WITH_SUB_FOCUSES:** `hockey` added (Court/Field) with sub_focuses: speed, change_of_direction, leg_power, core_stability, work_capacity.
- **SUB_FOCUS_TAG_MAP:** `hockey:speed` → speed, explosive_power; `hockey:change_of_direction` → agility, single_leg_strength, balance; `hockey:leg_power` → explosive_power, plyometric; `hockey:core_stability` → core_stability, core_anti_extension; `hockey:work_capacity` → work_capacity, anaerobic_capacity.
- **Default sub-focus:** When primary sport is hockey and none selected, default `subSlugs = ["speed", "leg_power", "work_capacity"]`.
- **Sport quality weights:** hockey added to `sportQualityWeights.ts` (power, work_capacity, unilateral_strength, core_tension, scapular_stability).
