# Exercise redundancy clusters (library reduction)

Generated: `2026-04-19T00:33:03.239Z`
**Aggressiveness:** `aggressive` (default: aggressive — surfaces merge candidates for review)

## Summary

| Metric | Value |
| --- | ---: |
| Total merge clusters | 265 |
| — exact_duplicate | 0 |
| — near_duplicate | 1 |
| — practical_merge_candidate | 264 |
| Input exercises | 4016 |
| Exercises in ≥1 cluster | 787 |
| Not in any cluster | 3229 |
| Rows removable (exact only) | 0 |
| Rows removable (exact + near) | 1 |
| Rows removable (all merge tiers) | 522 |
| Clusters with ≥2 `core` members | 0 |
| Dropped (oversized > 40) | 4 |
| Dropped (low internal pairwise) | 44 |
| Related-but-separate pairs recorded | 4000 |

## Thresholds and config

```json
{
  "aggressiveness": "aggressive",
  "edge_threshold": 0.52,
  "min_internal_pair_score": 0.42,
  "max_cluster_size": 40,
  "weights": {
    "name_token_jaccard": 0.2,
    "name_char_similarity": 0.14,
    "alias_overlap": 0.08,
    "movement_patterns_jaccard": 0.19,
    "equipment_match": 0.14,
    "primary_role_match": 0.09,
    "muscle_jaccard": 0.1,
    "tag_jaccard": 0.04,
    "keep_category_alignment": 0.02
  },
  "bands": {
    "high": 0.84,
    "medium": 0.68
  },
  "redundancy_tiers": {
    "exact_duplicate": 0.92,
    "near_duplicate": 0.78,
    "practical_merge_candidate": 0.52
  },
  "candidate_generation": {
    "sorted_name_window": 56,
    "window_bigram_min": 0.64,
    "token_bucket_bigram_min": 0.74,
    "min_shared_name_tokens": 1,
    "max_ids_per_token_bucket": 220,
    "max_pairs_per_me_bucket": 25000,
    "max_pairs_per_role_bucket": 18000,
    "muscle_overlap_min_ratio": 0.35
  }
}
```

### Redundancy tier cutoffs (min internal pairwise score)

- **exact_duplicate** ≥ 0.92
- **near_duplicate** ≥ 0.78
- **practical_merge_candidate** ≥ 0.52

### Factor weights

| Factor | Weight |
| --- | ---: |
| `name_token_jaccard` | 0.2 |
| `movement_patterns_jaccard` | 0.19 |
| `name_char_similarity` | 0.14 |
| `equipment_match` | 0.14 |
| `muscle_jaccard` | 0.1 |
| `primary_role_match` | 0.09 |
| `alias_overlap` | 0.08 |
| `tag_jaccard` | 0.04 |
| `keep_category_alignment` | 0.02 |

## Largest clusters

- **dup_00171** [practical_merge_candidate] — 13 members — canonical `ff_double_cable_chest_fly`
- **dup_00153** [practical_merge_candidate] — 11 members — canonical `ff_cable_rope_half_kneeling_high_to_low_chop`
- **dup_00059** [practical_merge_candidate] — 9 members — canonical `ff_bar_advanced_tuck_front_lever_pull_up`
- **dup_00230** [practical_merge_candidate] — 9 members — canonical `ff_single_arm_barbell_windmill`
- **dup_00154** [practical_merge_candidate] — 8 members — canonical `ff_dumbbell_isometric_split_squat_low_to_high_chop`
- **dup_00054** [practical_merge_candidate] — 7 members — canonical `ff_single_arm_kettlebell_around_the_world`
- **dup_00169** [practical_merge_candidate] — 7 members — canonical `ff_macebell_single_leg_standing_bent_knee_360`
- **dup_00028** [practical_merge_candidate] — 6 members — canonical `clap_push_ups`
- **dup_00050** [practical_merge_candidate] — 6 members — canonical `ff_double_indian_club_inner_heart_shaped_swing`
- **dup_00052** [practical_merge_candidate] — 6 members — canonical `ff_clubbell_side_to_side_swing`
- **dup_00093** [practical_merge_candidate] — 6 members — canonical `ff_barbell_hang_power_clean_to_squat_jerk`
- **dup_00120** [practical_merge_candidate] — 6 members — canonical `ff_bodyweight_bent_knee_reverse_hyperextension`
- **dup_00121** [practical_merge_candidate] — 6 members — canonical `ff_bodyweight_bicycle_crunch`
- **dup_00130** [practical_merge_candidate] — 6 members — canonical `ff_bodyweight_single_leg_foot_elevated_glute_bridge`
- **dup_00175** [practical_merge_candidate] — 6 members — canonical `ff_double_dumbbell_front_rack_carry`

## Sample: exact_duplicate

_None._


## Sample: practical_merge_candidate

- **dup_00171** (score 0.436): ff_double_cable_chest_fly, ff_double_cable_decline_bench_chest_fly, ff_double_cable_high_to_low_chest_fly, ff_double_cable_incline_bench_chest_fly, ff_double_cable_low_to_high_chest_fly, ff_double_cable_seated_chest_fly, ff_double_dumbbell_chest_fly, ff_double_dumbbell_decline_bench_chest_fly, ff_double_dumbbell_incline_bench_chest_fly, ff_double_kettlebell_chest_fly, ff_double_kettlebell_decline_bench_chest_fly, ff_double_kettlebell_incline_bench_chest_fly, ff_stability_ball_double_dumbbell_chest_fly
- **dup_00153** (score 0.435): ff_cable_rope_half_kneeling_high_to_low_chop, ff_cable_rope_half_kneeling_low_to_high_chop, ff_cable_rope_staggered_stance_high_to_low_chop, ff_cable_rope_staggered_stance_low_to_high_chop, ff_cable_rope_tall_kneeling_high_to_low_chop, ff_cable_rope_tall_kneeling_low_to_high_chop, ff_dumbbell_half_kneeling_low_to_high_chop, ff_kettlebell_half_kneeling_low_to_high_chop, ff_medicine_ball_half_kneeling_low_to_high_chop, ff_plate_half_kneeling_low_to_high_chop, ff_slam_ball_half_kneeling_low_to_high_chop
- **dup_00059** (score 0.453): ff_bar_advanced_tuck_front_lever_pull_up, ff_bar_dead_hang_to_front_lever_pull_up, ff_bar_full_front_lever_pull_up, ff_bar_straddle_front_lever_pull_up, ff_ring_advanced_tuck_front_lever_pull_up, ff_ring_dead_hang_to_front_lever_pull_up, ff_ring_full_front_lever_pull_up, ff_ring_straddle_front_lever_pull_up, ff_ring_tuck_front_lever_pull_up
- **dup_00230** (score 0.432): ff_single_arm_barbell_windmill, ff_single_arm_dumbbell_half_kneeling_windmill, ff_single_arm_dumbbell_windmill, ff_single_arm_kettlebell_bottoms_up_half_kneeling_windmill, ff_single_arm_kettlebell_bottoms_up_windmill, ff_single_arm_kettlebell_bottoms_up_z_press, ff_single_arm_kettlebell_half_kneeling_windmill, ff_single_arm_kettlebell_windmill, ff_single_arm_kettlebell_z_press
- **dup_00154** (score 0.540): ff_cable_rope_isometric_split_squat_high_to_low_chop, ff_cable_rope_isometric_split_squat_low_to_high_chop, ff_dumbbell_isometric_split_squat_low_to_high_chop, ff_kettlebell_isometric_split_squat_low_to_high_chop, ff_macebell_isometric_split_squat_low_to_high_chop, ff_medicine_ball_isometric_split_squat_low_to_high_chop, ff_plate_isometric_split_squat_low_to_high_chop, ff_slam_ball_isometric_split_squat_low_to_high_chop
- **dup_00054** (score 0.486): ff_alternating_single_arm_kettlebell_around_the_world, ff_alternating_single_arm_kettlebell_around_the_world_high_catch, ff_alternating_single_arm_kettlebell_half_kneeling_around_the_world_high_catch, ff_alternating_single_arm_kettlebell_tall_kneeling_around_the_world_high_catch, ff_alternating_single_arm_tall_kneeling_around_the_world, ff_single_arm_kettlebell_around_the_world, ff_single_arm_kettlebell_tall_kneeling_around_the_world
- **dup_00169** (score 0.455): ff_clubbell_single_leg_standing_bent_knee_gamma_cast, ff_clubbell_single_leg_standing_bent_knee_shield_cast, ff_macebell_single_leg_standing_bent_knee_360, ff_single_arm_clubbell_single_leg_standing_bent_knee_contralateral_shield_cast, ff_single_arm_clubbell_single_leg_standing_bent_knee_ipsilateral_shield_cast, ff_single_arm_macebell_single_leg_standing_bent_knee_contralateral_360, ff_single_arm_macebell_single_leg_standing_bent_knee_ipsilateral_360
- **dup_00028** (score 0.477): clap_push_ups, decline_push_ups, drop_push_ups, incline_push_ups, push_ups, staggered_push_ups
- **dup_00050** (score 0.483): ff_alternating_double_indian_club_inner_heart_shaped_swing, ff_alternating_double_indian_club_outer_heart_shaped_swing, ff_double_indian_club_inner_heart_shaped_swing, ff_double_indian_club_outer_heart_shaped_swing, ff_single_arm_indian_club_inner_heart_shaped_swing, ff_single_arm_indian_club_outer_heart_shaped_swing
- **dup_00052** (score 0.444): ff_alternating_single_arm_clubbell_side_to_side_swing, ff_clubbell_side_to_side_swing, ff_single_arm_clubbell_side_swing, ff_single_arm_clubbell_side_to_side_swing, ff_single_arm_kettlebell_side_swing, ff_single_arm_kettlebell_side_to_side_swing
- **dup_00093** (score 0.482): ff_barbell_hang_power_clean_to_squat_jerk, ff_barbell_hang_squat_clean_to_squat_jerk, ff_barbell_hang_squat_clean_to_thruster, ff_barbell_power_clean_to_squat_jerk, ff_barbell_squat_clean_to_squat_jerk, ff_barbell_squat_clean_to_thruster
- **dup_00120** (score 0.433): ff_bodyweight_bent_knee_reverse_hyperextension, ff_bodyweight_frog_reverse_hyperextension, ff_bodyweight_reverse_hyperextension, ff_stability_ball_bent_knee_reverse_hyperextension, ff_stability_ball_frog_reverse_hyperextension, ff_stability_ball_reverse_hyperextension
- **dup_00121** (score 0.424): ff_bodyweight_bicycle_crunch, ff_bodyweight_cocoon_crunch, ff_bodyweight_crunch, ff_bodyweight_inverted_hanging_oblique_crunch, ff_bodyweight_oblique_crunch, ff_bodyweight_reverse_crunch
- **dup_00130** (score 0.430): ff_bodyweight_glute_bridge_isometric_with_alternating_single_leg_extension, ff_bodyweight_single_leg_foot_elevated_glute_bridge, ff_bodyweight_single_leg_glute_bridge, ff_stability_ball_single_leg_foot_elevated_glute_bridge, ff_suspension_single_leg_foot_elevated_glute_bridge, ff_tire_single_leg_foot_elevated_glute_bridge
- **dup_00175** (score 0.427): ff_double_dumbbell_front_rack_carry, ff_double_kettlebell_bottoms_up_front_rack_carry, ff_double_kettlebell_front_rack_carry, ff_single_arm_dumbbell_front_rack_carry, ff_single_arm_kettlebell_bottoms_up_front_rack_carry, ff_single_arm_kettlebell_front_rack_carry
- **dup_00192** (score 0.500): ff_heavy_sandbag_alternating_hang_shoulder_clean, ff_heavy_sandbag_alternating_over_the_shoulder, ff_heavy_sandbag_alternating_shoulder_clean, ff_heavy_sandbag_hang_shoulder_clean, ff_heavy_sandbag_over_the_shoulder, ff_heavy_sandbag_shoulder_clean
- **dup_00210** (score 0.470): ff_resistance_band_alternating_bicep_curl, ff_resistance_band_alternating_hammer_curl, ff_resistance_band_alternating_reverse_grip_bicep_curl, ff_resistance_band_bicep_curl, ff_resistance_band_hammer_curl, ff_resistance_band_reverse_grip_bicep_curl
- **dup_00212** (score 0.462): ff_resistance_band_alternating_shoulder_dislocates, ff_resistance_band_prone_shoulder_dislocates, ff_resistance_band_shoulder_dislocates, ff_superband_alternating_shoulder_dislocates, ff_superband_prone_shoulder_dislocates, ff_superband_shoulder_dislocates
- **dup_00233** (score 0.484): ff_single_arm_dumbbell_bent_knee_copenhagen_plank, ff_single_arm_dumbbell_copenhagen_plank, ff_single_arm_kettlebell_bent_knee_copenhagen_plank, ff_single_arm_kettlebell_bottoms_up_bent_knee_copenhagen_plank, ff_single_arm_kettlebell_bottoms_up_copenhagen_plank, ff_single_arm_kettlebell_copenhagen_plank
- **dup_00001** (score 0.480): 3_way_goblet_squat, goblet_squat, goblet_sumo_squat, iso_extreme_sumo_squat, sumo_squat
- **dup_00026** (score 0.438): bulgarian_split_squats, db_bb_iso_split_squats, db_bb_oscillatory_split_squats, db_oscillatory_bulgarian_split_squats, iso_bulgarian_split_squats
- **dup_00053** (score 0.461): ff_alternating_single_arm_dumbbell_feet_elevated_plank_pull_through, ff_alternating_single_arm_dumbbell_plank_pull_through, ff_alternating_single_arm_kettlebell_feet_elevated_plank_pull_through, ff_alternating_single_arm_kettlebell_knee_hover_quadruped_pull_through, ff_alternating_single_arm_kettlebell_plank_pull_through
- **dup_00073** (score 0.429): ff_bar_l_sit_chin_up, ff_bar_l_sit_pull_up, ff_ring_l_sit_chin_up, ff_ring_l_sit_pull_up, ff_single_ring_l_sit_chin_up
- **dup_00119** (score 0.461): ff_bodyweight_bent_knee_copenhagen_plank, ff_bodyweight_bent_knee_copenhagen_plank_side_raise, ff_bodyweight_copenhagen_plank, ff_bodyweight_copenhagen_plank_knee_to_elbow, ff_bodyweight_copenhagen_plank_side_raise
- **dup_00147** (score 0.438): ff_cable_half_kneeling_pallof_press, ff_cable_pallof_press, ff_cable_tall_kneeling_pallof_press, ff_superband_half_kneeling_pallof_press, ff_superband_tall_kneeling_pallof_press

## Suspicious skipped components

### Oversized
- 357 members
- 1318 members
- 125 members
- 44 members

### Low internal pairwise
- 10 members (min 0.355)
- 9 members (min 0.369)
- 12 members (min 0.342)
- 11 members (min 0.344)
- 26 members (min 0.370)
- 12 members (min 0.370)
- 10 members (min 0.409)
- 4 members (min 0.416)
- 38 members (min 0.380)
- 18 members (min 0.371)
- 8 members (min 0.366)
- 18 members (min 0.353)
- 24 members (min 0.378)
- 8 members (min 0.379)
- 8 members (min 0.403)
- 6 members (min 0.415)
- 8 members (min 0.394)
- 16 members (min 0.418)
- 20 members (min 0.370)
- 8 members (min 0.408)
- 18 members (min 0.339)
- 4 members (min 0.378)
- 8 members (min 0.417)
- 16 members (min 0.362)
- 23 members (min 0.314)
- 11 members (min 0.333)
- 16 members (min 0.400)
- 12 members (min 0.349)
- 6 members (min 0.400)
- 7 members (min 0.415)
- 16 members (min 0.375)
- 7 members (min 0.341)
- 10 members (min 0.345)
- 9 members (min 0.386)
- 10 members (min 0.398)
- 9 members (min 0.419)
- 5 members (min 0.416)
- 5 members (min 0.378)
- 9 members (min 0.420)
- 6 members (min 0.416)
- 9 members (min 0.371)
- 6 members (min 0.404)
- 5 members (min 0.391)
- 5 members (min 0.415)


## Member keep_category (cluster slots)

| keep_category | slots |
| --- | ---: |
| unknown | 785 |
| niche | 2 |

## Clearly distinct pairs (sample of evaluated low-redundancy)

- `2_point_start` / `crouching_start` — score 0.135 — low_redundancy_score_different_or_weak_family_overlap
- `2_point_start` / `ff_alternating_single_arm_kettlebell_start_stop_clean_to_overhead_press` — score 0.034 — low_redundancy_score_different_or_weak_family_overlap
- `2_point_start` / `ff_alternating_single_arm_kettlebell_start_stop_clean_to_push_jerk` — score 0.035 — low_redundancy_score_different_or_weak_family_overlap
- `2_point_start` / `ff_alternating_single_arm_kettlebell_start_stop_clean_to_push_press` — score 0.035 — low_redundancy_score_different_or_weak_family_overlap
- `2_point_start` / `ff_alternating_single_arm_kettlebell_start_stop_clean_to_split_jerk` — score 0.033 — low_redundancy_score_different_or_weak_family_overlap
- `2_point_start` / `ff_double_kettlebell_start_stop_clean_to_overhead_press` — score 0.037 — low_redundancy_score_different_or_weak_family_overlap
- `2_point_start` / `ff_double_kettlebell_start_stop_clean_to_push_jerk` — score 0.038 — low_redundancy_score_different_or_weak_family_overlap
- `2_point_start` / `ff_double_kettlebell_start_stop_clean_to_push_press` — score 0.038 — low_redundancy_score_different_or_weak_family_overlap
- `2_point_start` / `ff_double_kettlebell_start_stop_clean_to_split_jerk` — score 0.036 — low_redundancy_score_different_or_weak_family_overlap
- `2_point_start` / `ff_single_arm_kettlebell_start_stop_clean_to_overhead_press` — score 0.037 — low_redundancy_score_different_or_weak_family_overlap
- `2_point_start` / `ff_single_arm_kettlebell_start_stop_clean_to_push_jerk` — score 0.038 — low_redundancy_score_different_or_weak_family_overlap
- `2_point_start` / `ff_single_arm_kettlebell_start_stop_clean_to_push_press` — score 0.038 — low_redundancy_score_different_or_weak_family_overlap
- `2_point_start` / `ff_single_arm_kettlebell_start_stop_clean_to_split_jerk` — score 0.036 — low_redundancy_score_different_or_weak_family_overlap
- `2_point_start` / `lateral_ground_start` — score 0.094 — low_redundancy_score_different_or_weak_family_overlap
- `2_point_start` / `push_up_start` — score 0.114 — low_redundancy_score_different_or_weak_family_overlap
- `3_point_start` / `crouching_start` — score 0.135 — low_redundancy_score_different_or_weak_family_overlap
- `3_point_start` / `ff_alternating_single_arm_kettlebell_start_stop_clean_to_overhead_press` — score 0.034 — low_redundancy_score_different_or_weak_family_overlap
- `3_point_start` / `ff_alternating_single_arm_kettlebell_start_stop_clean_to_push_jerk` — score 0.035 — low_redundancy_score_different_or_weak_family_overlap
- `3_point_start` / `ff_alternating_single_arm_kettlebell_start_stop_clean_to_push_press` — score 0.035 — low_redundancy_score_different_or_weak_family_overlap
- `3_point_start` / `ff_alternating_single_arm_kettlebell_start_stop_clean_to_split_jerk` — score 0.033 — low_redundancy_score_different_or_weak_family_overlap

## Blocked pairs (hard distinction — sample)

- `ff_battle_rope_alternating_split_squat_jump_alternating_wave` / `ff_bodyweight_alternating_step_up_jump` — distinct_step_up_vs_split_squat_family
- `ff_battle_rope_alternating_split_squat_jump_alternating_wave` / `ff_bodyweight_step_up_jump` — distinct_step_up_vs_split_squat_family
- `ff_battle_rope_alternating_split_squat_jump_alternating_wave` / `ff_tire_alternating_step_up_jump` — distinct_step_up_vs_split_squat_family
- `ff_battle_rope_alternating_split_squat_jump_alternating_wave` / `ff_tire_step_up_jump` — distinct_step_up_vs_split_squat_family
- `ff_battle_rope_alternating_split_squat_jump_power_slam` / `ff_bodyweight_alternating_step_up_jump` — distinct_step_up_vs_split_squat_family
- `ff_battle_rope_alternating_split_squat_jump_power_slam` / `ff_bodyweight_step_up_jump` — distinct_step_up_vs_split_squat_family
- `ff_battle_rope_alternating_split_squat_jump_power_slam` / `ff_tire_alternating_step_up_jump` — distinct_step_up_vs_split_squat_family
- `ff_battle_rope_alternating_split_squat_jump_power_slam` / `ff_tire_step_up_jump` — distinct_step_up_vs_split_squat_family
- `ff_bodyweight_alternating_split_squat_jump` / `ff_bodyweight_alternating_step_up_jump` — distinct_step_up_vs_split_squat_family
- `ff_bodyweight_alternating_split_squat_jump` / `ff_bodyweight_step_up_jump` — distinct_step_up_vs_split_squat_family
- `ff_bodyweight_alternating_split_squat_jump` / `ff_tire_alternating_step_up_jump` — distinct_step_up_vs_split_squat_family
- `ff_bodyweight_alternating_split_squat_jump` / `ff_tire_step_up_jump` — distinct_step_up_vs_split_squat_family
- `ff_bodyweight_alternating_step_up_jump` / `ff_bodyweight_bulgarian_split_squat_jump` — distinct_step_up_vs_split_squat_family
- `ff_bodyweight_alternating_step_up_jump` / `ff_bodyweight_split_squat_jump` — distinct_step_up_vs_split_squat_family
- `ff_bodyweight_alternating_step_up_jump` / `ff_double_dumbbell_suitcase_bulgarian_split_squat_jump` — distinct_step_up_vs_split_squat_family
- `ff_bodyweight_alternating_step_up_jump` / `ff_double_kettlebell_suitcase_bulgarian_split_squat_jump` — distinct_step_up_vs_split_squat_family
- `ff_bodyweight_alternating_step_up_jump` / `ff_suspension_alternating_split_squat_jump` — distinct_step_up_vs_split_squat_family
- `ff_bodyweight_alternating_step_up_jump` / `ff_suspension_bulgarian_split_squat_jump` — distinct_step_up_vs_split_squat_family
- `ff_bodyweight_alternating_step_up_jump` / `ff_tire_bulgarian_split_squat_jump` — distinct_step_up_vs_split_squat_family
- `ff_bodyweight_bulgarian_split_squat_jump` / `ff_bodyweight_step_up_jump` — distinct_step_up_vs_split_squat_family
- `ff_bodyweight_bulgarian_split_squat_jump` / `ff_tire_alternating_step_up_jump` — distinct_step_up_vs_split_squat_family
- `ff_bodyweight_bulgarian_split_squat_jump` / `ff_tire_step_up_jump` — distinct_step_up_vs_split_squat_family
- `ff_bodyweight_split_squat_jump` / `ff_bodyweight_step_up_jump` — distinct_step_up_vs_split_squat_family
- `ff_bodyweight_split_squat_jump` / `ff_tire_alternating_step_up_jump` — distinct_step_up_vs_split_squat_family
- `ff_bodyweight_split_squat_jump` / `ff_tire_step_up_jump` — distinct_step_up_vs_split_squat_family

## Notes

- Relationship question: **Should both survive as separate exercises in TodayFit?** — not biomechanical identity.
- See also: `artifacts/exercise-library-reduction-summary.md`, `artifacts/exercise-duplicate-near-misses.json`.
