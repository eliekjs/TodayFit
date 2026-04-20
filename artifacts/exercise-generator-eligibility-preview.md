# Generator eligibility preview (phase 6)

- **Generated:** 2026-04-20T20:31:33.491Z
- **Catalog:** `/Users/ellie/todayfit/data/workout-exercise-catalog.json`
- **Pruning artifact:** `/Users/ellie/todayfit/artifacts/exercise-library-pruning-decisions.json`
- **LLM validated (for breakdowns):** `/Users/ellie/todayfit/artifacts/exercise-curation-llm-validated.json`

## Feature flags (preview defaults)

```json
{
  "enable_pruning_gating": false,
  "allow_niche_exercises": true,
  "allow_review_exercises": false
}
```

## Mapping rules

- keep_core → eligible_core
- keep_niche → eligible_niche
- merge_into_canonical → excluded_merged (merge_target_exercise_id = canonical_exercise_id from pruning record)
- remove_niche_or_low_value → excluded_removed
- review → excluded_review
- catalog id missing from pruning artifact → excluded_unknown
- Canonical survivors: exercises in a cluster that are not merge_into_canonical; eligibility follows their own pruning recommendation (keep_core / keep_niche / review / remove).

## Pool size

| Metric | Count | Share of catalog |
| --- | ---: | ---: |
| Catalog total | 4016 | 100% |
| Baseline pool (gating off) | 4016 | 100.0% |
| Gated default (core + niche; review off) | 3258 | 81.1% |
| Gated permissive (core + niche + review) | 3282 | 81.7% |

**Projected reduction (default gate vs baseline):** 758 exercises (18.9% of catalog).

## Counts by eligibility state

| State | Count |
| --- | ---: |
| eligible_core | 2292 |
| eligible_niche | 966 |
| excluded_merged | 522 |
| excluded_removed | 212 |
| excluded_review | 24 |
| excluded_unknown | 0 |

## Canonical survivors

- **Clusters with a canonical row:** 265 · **Canonicals retained as eligible (core or niche):** 265

## Excluded counts by pruning recommendation

| Pruning recommendation / reason | Count |
| --- | ---: |
| merge_into_canonical | 522 |
| remove_niche_or_low_value | 212 |
| review | 24 |

## Gated pool — movement pattern (top)

| Pattern | Count |
| --- | ---: |
| squat | 1643 |
| lunge | 814 |
| horizontal_push | 626 |
| rotation | 578 |
| anti_rotation | 515 |
| horizontal_pull | 298 |
| vertical_push | 193 |
| hinge | 84 |
| locomotion | 57 |
| vertical_pull | 53 |
| isometric | 44 |
| carry | 14 |
| thoracic_mobility | 1 |

## Gated pool — equipment class

| Equipment class | Count |
| --- | ---: |
| bodyweight | 1251 |
| kettlebell | 671 |
| dumbbell | 445 |
| _unknown_ | 284 |
| barbell | 257 |
| mixed | 140 |
| specialty | 99 |
| cable | 67 |
| band | 37 |
| cardio_machine | 4 |
| machine | 3 |

## Gated pool — primary role

| Primary role | Count |
| --- | ---: |
| compound_strength | 1170 |
| unilateral_strength | 592 |
| power_explosive | 407 |
| accessory_strength | 310 |
| _unknown_ | 284 |
| stability_core | 239 |
| mobility | 172 |
| conditioning | 66 |
| injury_prevention | 18 |

## Examples — excluded merged

- `3_point_start` → canonical `2_point_start` — 3 Point Start
- `3_way_goblet_squat` → canonical `goblet_squat` — 3 Way Goblet Squat
- `90_90_hip_switch` → canonical `hip_90_90` — 90/90 Hip Switch
- `ascending_descending_lateral_shuffle` → canonical `lateral_power_shuffle` — Ascending-Descending Lateral Shuffle
- `back_pedal_to_accelerate` → canonical `accelerate_to_back_pedal` — Back Pedal to Accelerate
- `band_dynamic_trunk_stability_circuit` → canonical `band_static_trunk_stability_circuit` — Band Dynamic Trunk Stability Circuit
- `band_external_rotation` → canonical `seated_external_rotations` — Band External Rotations
- `band_resisted_squat_jump` → canonical `resisted_and_assisted_lunge_jump` — Band Resisted Squat Jump
- `band_scarecrows` → canonical `scarecrows` — Band Scarecrows
- `banded_hip_flexor_stretch` → canonical `hip_flexor_stretch` — Banded Hip Flexor Stretch
- `banded_kb_swing` → canonical `kettlebell_swing` — Banded KB Swing
- `banded_lat_stretch` → canonical `lat_stretch` — Banded Lat Stretch
- `bounds` → canonical `alternating_leg_bounds` — Bounds
- `buddy_hamstring_curl` → canonical `iso_nordic_hamstring_curls` — Nordic Hamstring Curl
- `clap_push_ups` → canonical `push_ups` — Clap Push Ups

## Examples — excluded removed

- `ff_alternating_double_kettlebell_bottoms_up_decline_bench_press` — Alternating Double Kettlebell Bottoms Up Decline Bench Press
- `ff_alternating_double_kettlebell_bottoms_up_half_kneeling_overhead_press` — Alternating Double Kettlebell Bottoms Up Half Kneeling Overhead Press
- `ff_alternating_double_kettlebell_bottoms_up_tall_kneeling_overhead_press` — Alternating Double Kettlebell Bottoms Up Tall Kneeling Overhead Press
- `ff_alternating_single_arm_kettlebell_bottoms_up_clean_to_front_rack_squat` — Alternating Single Arm Kettlebell Bottoms Up Clean to Front Rack Squat
- `ff_clubbell_order_foot_elevated_knee_over_toe_split_squat` — Clubbell Order Foot Elevated Knee Over Toe Split Squat
- `ff_double_clubbell_order_bulgarian_split_squat` — Double Clubbell Order Bulgarian Split Squat
- `ff_double_clubbell_order_foot_elevated_cossack_squat` — Double Clubbell Order Foot Elevated Cossack Squat
- `ff_double_clubbell_order_foot_elevated_knee_over_toe_split_squat` — Double Clubbell Order Foot Elevated Knee Over Toe Split Squat
- `ff_double_clubbell_single_leg_standing_bent_knee_iron_cross` — Double Clubbell Single Leg Standing Bent Knee Iron Cross
- `ff_double_kettlebell_bottoms_up_bulgarian_split_squat_thruster` — Double Kettlebell Bottoms Up Bulgarian Split Squat Thruster
- `ff_double_kettlebell_bottoms_up_decline_bench_press` — Double Kettlebell Bottoms Up Decline Bench Press
- `ff_double_kettlebell_bottoms_up_front_rack_alternating_cossack_squat` — Double Kettlebell Bottoms Up Front Rack Alternating Cossack Squat
- `ff_double_kettlebell_bottoms_up_front_rack_bulgarian_split_squat` — Double Kettlebell Bottoms Up Front Rack Bulgarian Split Squat
- `ff_double_kettlebell_bottoms_up_front_rack_foot_elevated_cossack_squat` — Double Kettlebell Bottoms Up Front Rack Foot Elevated Cossack Squat
- `ff_double_kettlebell_bottoms_up_front_rack_foot_elevated_knee_over_toe_split_squat` — Double Kettlebell Bottoms Up Front Rack Foot Elevated Knee Over Toe Split Squat

## Examples — excluded review

- `ff_alternating_double_kettlebell_half_kneeling_overhead_press` — Alternating Double Kettlebell Half Kneeling Overhead Press
- `ff_alternating_double_kettlebell_tall_kneeling_overhead_press` — Alternating Double Kettlebell Tall Kneeling Overhead Press
- `ff_bulgarian_bag_back_rack_bulgarian_split_squat` — Bulgarian Bag Back Rack Bulgarian Split Squat
- `ff_cable_rope_tall_kneeling_overhead_tricep_extension` — Cable Rope Tall Kneeling Overhead Tricep Extension
- `ff_double_kettlebell_bottoms_up_single_leg_standing_bent_knee_overhead_press` — Double Kettlebell Bottoms Up Single Leg Standing Bent Knee Overhead Press
- `ff_single_arm_clubbell_order_contralateral_step_up` — Single Arm Clubbell Order Contralateral Step Up
- `ff_single_arm_clubbell_order_ipsilateral_step_up` — Single Arm Clubbell Order Ipsilateral Step Up
- `ff_single_arm_dumbbell_suitcase_ipsilateral_curtsy_lunge` — Single Arm Dumbbell Suitcase Ipsilateral Curtsy Lunge
- `ff_single_arm_dumbbell_suitcase_ipsilateral_forward_lunge` — Single Arm Dumbbell Suitcase Ipsilateral Forward Lunge
- `ff_single_arm_dumbbell_suitcase_ipsilateral_knee_over_toe_split_squat` — Single Arm Dumbbell Suitcase Ipsilateral Knee Over Toe Split Squat
- `ff_single_arm_dumbbell_suitcase_ipsilateral_reverse_lunge` — Single Arm Dumbbell Suitcase Ipsilateral Reverse Lunge
- `ff_single_arm_dumbbell_suitcase_ipsilateral_russian_step_up` — Single Arm Dumbbell Suitcase Ipsilateral Russian Step Up
- `ff_single_arm_dumbbell_suitcase_ipsilateral_split_squat` — Single Arm Dumbbell Suitcase Ipsilateral Split Squat
- `ff_single_arm_dumbbell_suitcase_ipsilateral_step_up` — Single Arm Dumbbell Suitcase Ipsilateral Step Up
- `ff_single_arm_macebell_order_contralateral_step_up` — Single Arm Macebell Order Contralateral Step Up
