# Exercise library pruning decisions (phase 5)

- **Generated:** 2026-04-20T20:31:29.364Z
- **Catalog:** `/Users/ellie/todayfit/data/workout-exercise-catalog.json`
- **Prefill:** `/Users/ellie/todayfit/artifacts/exercise-curation-prefill.json`
- **LLM validated:** `/Users/ellie/todayfit/artifacts/exercise-curation-llm-validated.json`
- **Duplicate clusters:** `/Users/ellie/todayfit/artifacts/exercise-duplicate-clusters.json`
- **Duplicate aggressiveness:** aggressive

## Summary

| Metric | Count |
| --- | ---: |
| Total exercises | 4016 |
| Recommendation: keep_core | 2292 |
| Recommendation: keep_niche | 966 |
| Recommendation: merge_into_canonical | 522 |
| Recommendation: remove_niche_or_low_value | 212 |
| Recommendation: review | 24 |
| Projected rows retained (keep_core + keep_niche + review) | 3282 |
| Projected rows merged into canonical | 522 |
| Projected rows removed | 212 |

- **Retained share:** 81.7% · **Merged share:** 13.0% · **Removed share:** 5.3%

- **Intrinsic score quantiles (p10 / p50 / p90):** 0.589 / 0.854 / 0.933

### Top removal drivers (by `reason_code` frequency)

- `long_or_overloaded_name` — 212
- `stacked_modifiers_3plus` — 205
- `penalty_high_confusion` — 202
- `heuristic_extreme_name_burden` — 194
- `keyword_penalty_technicality_substantial` — 175
- `name_keyword_family_positional_stack_tier_moderate` — 175
- `penalty_high_technicality` — 142
- `keyword_penalty_niche_substantial` — 140
- `keyword_penalty_confusion_substantial` — 140
- `aggregate_keyword_burden_0.52` — 138
- `multiple_positional_qualifiers` — 135
- `name_keyword_family_bottoms_up_niche_tier_strong` — 105
- `name_keyword_family_exotic_implement_tier_strong` — 66
- `aggregate_keyword_burden_0.38` — 35
- `heuristic_non_clustered_low_value_unique` — 25
- `llm_keep_category_niche` — 24
- `score_below_remove_threshold` — 17
- `penalty_high_niche` — 16
- `equipment_substitutability_penalty` — 6
- `name_keyword_family_start_stop_tier_strong` — 4
- `aggregate_keyword_burden_0.61` — 2
- `name_keyword_family_gymnastics_skill_niche_tier_strong` — 1

### Top reason codes — merge

- `merge_tier_practical_merge_candidate` — 521
- `llm_keep_category_niche` — 135
- `keyword_penalty_technicality_substantial` — 100
- `aggregate_keyword_burden_0.38` — 90
- `long_or_overloaded_name` — 82
- `equipment_substitutability_penalty` — 64
- `name_keyword_family_exotic_implement_tier_strong` — 54
- `name_keyword_family_positional_stack_tier_moderate` — 51
- `multiple_positional_qualifiers` — 44
- `stacked_modifiers_3plus` — 24
- `name_keyword_family_gymnastics_skill_niche_tier_strong` — 24
- `penalty_high_niche` — 17
- `name_keyword_family_bottoms_up_niche_tier_strong` — 13
- `merge_into_cluster_dup_00171` — 12
- `canonical_target_ff_double_cable_chest_fly` — 12

### Canonical selections (largest clusters)

| Cluster | Phase 5 canonical | Members | Phase 4 canonical | Changed? |
| --- | --- | ---: | --- | :---: |
| `dup_00171` | `ff_double_cable_chest_fly` | 13 | `ff_double_cable_chest_fly` | no |
| `dup_00153` | `ff_cable_rope_staggered_stance_high_to_low_chop` | 11 | `ff_cable_rope_half_kneeling_high_to_low_chop` | yes |
| `dup_00059` | `ff_ring_straddle_front_lever_pull_up` | 9 | `ff_bar_advanced_tuck_front_lever_pull_up` | yes |
| `dup_00230` | `ff_single_arm_dumbbell_windmill` | 9 | `ff_single_arm_barbell_windmill` | yes |
| `dup_00154` | `ff_dumbbell_isometric_split_squat_low_to_high_chop` | 8 | `ff_dumbbell_isometric_split_squat_low_to_high_chop` | no |
| `dup_00054` | `ff_alternating_single_arm_kettlebell_around_the_world` | 7 | `ff_single_arm_kettlebell_around_the_world` | yes |
| `dup_00169` | `ff_macebell_single_leg_standing_bent_knee_360` | 7 | `ff_macebell_single_leg_standing_bent_knee_360` | no |
| `dup_00028` | `push_ups` | 6 | `clap_push_ups` | yes |
| `dup_00050` | `ff_double_indian_club_inner_heart_shaped_swing` | 6 | `ff_double_indian_club_inner_heart_shaped_swing` | no |
| `dup_00052` | `ff_single_arm_kettlebell_side_swing` | 6 | `ff_clubbell_side_to_side_swing` | yes |
| `dup_00093` | `ff_barbell_hang_squat_clean_to_thruster` | 6 | `ff_barbell_hang_power_clean_to_squat_jerk` | yes |
| `dup_00120` | `ff_stability_ball_reverse_hyperextension` | 6 | `ff_bodyweight_bent_knee_reverse_hyperextension` | yes |
| `dup_00121` | `ff_bodyweight_crunch` | 6 | `ff_bodyweight_bicycle_crunch` | yes |
| `dup_00130` | `ff_bodyweight_single_leg_glute_bridge` | 6 | `ff_bodyweight_single_leg_foot_elevated_glute_bridge` | yes |
| `dup_00175` | `ff_double_kettlebell_front_rack_carry` | 6 | `ff_double_dumbbell_front_rack_carry` | yes |
| `dup_00192` | `ff_heavy_sandbag_over_the_shoulder` | 6 | `ff_heavy_sandbag_alternating_hang_shoulder_clean` | yes |
| `dup_00210` | `ff_resistance_band_reverse_grip_bicep_curl` | 6 | `ff_resistance_band_alternating_bicep_curl` | yes |
| `dup_00212` | `ff_superband_shoulder_dislocates` | 6 | `ff_resistance_band_alternating_shoulder_dislocates` | yes |
| `dup_00233` | `ff_single_arm_dumbbell_copenhagen_plank` | 6 | `ff_single_arm_dumbbell_bent_knee_copenhagen_plank` | yes |
| `dup_00001` | `goblet_squat` | 5 | `goblet_squat` | no |
| `dup_00026` | `bulgarian_split_squats` | 5 | `bulgarian_split_squats` | no |
| `dup_00053` | `ff_alternating_single_arm_dumbbell_plank_pull_through` | 5 | `ff_alternating_single_arm_dumbbell_feet_elevated_plank_pull_through` | yes |
| `dup_00073` | `ff_ring_l_sit_pull_up` | 5 | `ff_bar_l_sit_chin_up` | yes |
| `dup_00119` | `ff_bodyweight_copenhagen_plank` | 5 | `ff_bodyweight_bent_knee_copenhagen_plank` | yes |
| `dup_00147` | `ff_cable_pallof_press` | 5 | `ff_cable_half_kneeling_pallof_press` | yes |

### Family rollups (heuristic)

| Family | Exercises | Kept (proj.) | Removed/merged (proj.) | Examples |
| --- | ---: | ---: | ---: | --- |
| FF-prefixed / technical codes (`ff_technical`) | 2257 | 1847 | 410 | `ff_ab_wheel_kneeling_rollout`, `ff_ab_wheel_standing_rollout`, `ff_alternating_double_clubbell_front_flag_press`, `ff_alternating_double_clubbell_inside_circle`, `ff_alternating_double_clubbell_outside_circle` |
| Squat family (`squat`) | 666 | 526 | 140 | `approach_tuck_jump_to_low_squat`, `assisted_pistol_squat`, `back_squat`, `band_resisted_squat_jump`, `banded_hip_circle_squats` |
| Other / unclassified (`other`) | 657 | 569 | 88 | `1_arm_db_jerks`, `2_point_start`, `2_to_1_broad_jump_land_2`, `2_way_shoulder_raise`, `3_point_start` |
| Carry family (`carry`) | 134 | 116 | 18 | `farmer_carry`, `farmer_walks`, `ff_barbell_back_rack_carry`, `ff_barbell_front_rack_carry`, `ff_barbell_overhead_carry` |
| Push-up family (`push_up`) | 128 | 113 | 15 | `alternating_staggered_plyo_push_up`, `archer_push_up`, `band_push_up`, `clap_push_ups`, `close_grip_push_up` |
| Plank / core stability family (`plank_core`) | 93 | 61 | 32 | `bird_dog`, `bird_dog_row`, `dead_bug`, `dead_bugs`, `ff_alternating_single_arm_dumbbell_feet_elevated_plank_pull_through` |
| Goblet squat family (`goblet_squat`) | 37 | 34 | 3 | `3_way_goblet_squat`, `ff_dumbbell_goblet_alternating_cossack_squat`, `ff_dumbbell_goblet_alternating_pistol_squat`, `ff_dumbbell_goblet_bulgarian_split_squat`, `ff_dumbbell_goblet_cossack_squat` |
| Fly family (`fly`) | 30 | 13 | 17 | `butterfly`, `ff_bodyweight_butterfly_sit_up`, `ff_double_cable_chest_fly`, `ff_double_cable_decline_bench_chest_fly`, `ff_double_cable_high_to_low_chest_fly` |
| Chop / lift family (`chop`) | 14 | 3 | 11 | `cable_woodchops`, `ff_cable_rope_half_kneeling_high_to_low_chop`, `ff_cable_rope_half_kneeling_low_to_high_chop`, `ff_cable_rope_staggered_stance_high_to_low_chop`, `ff_cable_rope_staggered_stance_low_to_high_chop` |

### Examples — low-value unique exercises (removed, not merged)

- `ff_single_arm_clubbell_order_foot_elevated_contralateral_knee_over_toe_split_squat` — Single Arm Clubbell Order Foot Elevated Contralateral Knee Over Toe Split Squat (intrinsic 0.285)
- `ff_single_arm_clubbell_order_foot_elevated_ipsilateral_knee_over_toe_split_squat` — Single Arm Clubbell Order Foot Elevated Ipsilateral Knee Over Toe Split Squat (intrinsic 0.285)
- `ff_single_arm_kettlebell_bottoms_up_overhead_ipsilateral_cossack_squat` — Single Arm Kettlebell Bottoms Up Overhead Ipsilateral Cossack Squat (intrinsic 0.295)
- `ff_single_arm_kettlebell_bottoms_up_overhead_ipsilateral_knee_over_toe_split_squat` — Single Arm Kettlebell Bottoms Up Overhead Ipsilateral Knee Over Toe Split Squat (intrinsic 0.304)
- `ff_single_arm_clubbell_order_ipsilateral_cossack_squat` — Single Arm Clubbell Order Ipsilateral Cossack Squat (intrinsic 0.313)
- `ff_single_arm_clubbell_order_ipsilateral_curtsy_lunge` — Single Arm Clubbell Order Ipsilateral Curtsy Lunge (intrinsic 0.331)
- `ff_single_arm_clubbell_order_ipsilateral_forward_lunge` — Single Arm Clubbell Order Ipsilateral Forward Lunge (intrinsic 0.331)
- `ff_double_clubbell_order_foot_elevated_knee_over_toe_split_squat` — Double Clubbell Order Foot Elevated Knee Over Toe Split Squat (intrinsic 0.354)
- `ff_macebell_reverse_grip_offset_bent_over_row` — Macebell Reverse Grip Offset Bent Over Row (intrinsic 0.365)
- `ff_single_arm_kettlebell_bottoms_up_decline_bench_press` — Single Arm Kettlebell Bottoms Up Decline Bench Press (intrinsic 0.370)
- `ff_single_arm_kettlebell_bottoms_up_incline_bench_press` — Single Arm Kettlebell Bottoms Up Incline Bench Press (intrinsic 0.370)
- `ff_single_arm_clubbell_order_feet_elevated_calf_raise` — Single Arm Clubbell Order Feet Elevated Calf Raise (intrinsic 0.376)
- `ff_single_arm_kettlebell_bottoms_up_half_kneeling_bent_press` — Single Arm Kettlebell Bottoms Up Half Kneeling Bent Press (intrinsic 0.394)
- `ff_single_arm_kettlebell_bottoms_up_single_leg_standing_bent_knee_contralateral_overhead_press` — Single Arm Kettlebell Bottoms Up Single Leg Standing Bent Knee Contralateral Overhead Press (intrinsic 0.398)
- `ff_single_arm_kettlebell_bottoms_up_single_leg_standing_bent_knee_ipsilateral_overhead_press` — Single Arm Kettlebell Bottoms Up Single Leg Standing Bent Knee Ipsilateral Overhead Press (intrinsic 0.398)
- `ff_alternating_double_kettlebell_bottoms_up_decline_bench_press` — Alternating Double Kettlebell Bottoms Up Decline Bench Press (intrinsic 0.398)
- `ff_single_arm_dumbbell_half_kneeling_contralateral_overhead_press` — Single Arm Dumbbell Half Kneeling Contralateral Overhead Press (intrinsic 0.400)
- `ff_single_arm_dumbbell_half_kneeling_ipsilateral_overhead_press` — Single Arm Dumbbell Half Kneeling Ipsilateral Overhead Press (intrinsic 0.400)

### Examples — merged exercises (by heuristic family)

- **ff_technical** (302 merged)
  - `ff_ab_wheel_kneeling_rollout` → `ff_ab_wheel_standing_rollout` (practical_merge_candidate)
  - `ff_alternating_double_clubbell_pullover` → `ff_double_clubbell_pullover` (practical_merge_candidate)
  - `ff_alternating_double_clubbell_torch_press` → `ff_clubbell_torch_press` (practical_merge_candidate)
  - `ff_alternating_double_indian_club_inner_heart_shaped_swing` → `ff_double_indian_club_inner_heart_shaped_swing` (practical_merge_candidate)
- **other** (88 merged)
  - `3_point_start` → `2_point_start` (near_duplicate)
  - `90_90_hip_switch` → `hip_90_90` (practical_merge_candidate)
  - `ascending_descending_lateral_shuffle` → `lateral_power_shuffle` (practical_merge_candidate)
  - `back_pedal_to_accelerate` → `accelerate_to_back_pedal` (practical_merge_candidate)
- **squat** (39 merged)
  - `band_resisted_squat_jump` → `resisted_and_assisted_lunge_jump` (practical_merge_candidate)
  - `db_bb_iso_split_squats` → `bulgarian_split_squats` (practical_merge_candidate)
  - `db_bb_oscillatory_split_squats` → `bulgarian_split_squats` (practical_merge_candidate)
  - `db_oscillatory_bulgarian_split_squats` → `bulgarian_split_squats` (practical_merge_candidate)
- **plank_core** (32 merged)
  - `ff_alternating_single_arm_dumbbell_feet_elevated_plank_pull_through` → `ff_alternating_single_arm_dumbbell_plank_pull_through` (practical_merge_candidate)
  - `ff_alternating_single_arm_kettlebell_feet_elevated_plank_pull_through` → `ff_alternating_single_arm_dumbbell_plank_pull_through` (practical_merge_candidate)
  - `ff_alternating_single_arm_kettlebell_plank_pull_through` → `ff_alternating_single_arm_dumbbell_plank_pull_through` (practical_merge_candidate)
  - `ff_bodyweight_bent_knee_copenhagen_plank` → `ff_bodyweight_copenhagen_plank` (practical_merge_candidate)
- **fly** (17 merged)
  - `ff_double_cable_decline_bench_chest_fly` → `ff_double_cable_chest_fly` (practical_merge_candidate)
  - `ff_double_cable_high_to_low_chest_fly` → `ff_double_cable_chest_fly` (practical_merge_candidate)
  - `ff_double_cable_incline_bench_chest_fly` → `ff_double_cable_chest_fly` (practical_merge_candidate)
  - `ff_double_cable_low_to_high_chest_fly` → `ff_double_cable_chest_fly` (practical_merge_candidate)
- **carry** (16 merged)
  - `ff_barbell_front_rack_carry` → `ff_barbell_back_rack_carry` (practical_merge_candidate)
  - `ff_double_clubbell_order_carry` → `ff_clubbell_order_carry` (practical_merge_candidate)
  - `ff_double_dumbbell_front_rack_carry` → `ff_double_kettlebell_front_rack_carry` (practical_merge_candidate)
  - `ff_double_kettlebell_bottoms_up_front_rack_carry` → `ff_double_kettlebell_front_rack_carry` (practical_merge_candidate)
- **push_up** (15 merged)
  - `clap_push_ups` → `push_ups` (practical_merge_candidate)
  - `decline_push_ups` → `push_ups` (practical_merge_candidate)
  - `drop_push_ups` → `push_ups` (practical_merge_candidate)
  - `explosive_band_push_up` → `band_push_up` (practical_merge_candidate)
- **chop** (11 merged)
  - `ff_cable_rope_half_kneeling_high_to_low_chop` → `ff_cable_rope_staggered_stance_high_to_low_chop` (practical_merge_candidate)
  - `ff_cable_rope_half_kneeling_low_to_high_chop` → `ff_cable_rope_staggered_stance_high_to_low_chop` (practical_merge_candidate)
  - `ff_cable_rope_staggered_stance_low_to_high_chop` → `ff_cable_rope_staggered_stance_high_to_low_chop` (practical_merge_candidate)
  - `ff_cable_rope_tall_kneeling_high_to_low_chop` → `ff_cable_rope_staggered_stance_high_to_low_chop` (practical_merge_candidate)
- **goblet_squat** (2 merged)
  - `3_way_goblet_squat` → `goblet_squat` (practical_merge_candidate)
  - `goblet_sumo_squat` → `goblet_squat` (practical_merge_candidate)
