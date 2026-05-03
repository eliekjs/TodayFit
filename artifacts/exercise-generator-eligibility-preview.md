# Generator eligibility preview (phase 6)

- **Generated:** 2026-04-26T20:47:35.036Z
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
| Gated default (core + niche; review off) | 905 | 22.5% |
| Gated permissive (core + niche + review) | 2073 | 51.6% |

**Projected reduction (default gate vs baseline):** 3111 exercises (77.5% of catalog).

## Counts by eligibility state

| State | Count |
| --- | ---: |
| eligible_core | 471 |
| eligible_niche | 434 |
| excluded_merged | 522 |
| excluded_removed | 1421 |
| excluded_review | 1168 |
| excluded_unknown | 0 |

## Canonical survivors

- **Clusters with a canonical row:** 265 · **Canonicals retained as eligible (core or niche):** 116

## Excluded counts by pruning recommendation

| Pruning recommendation / reason | Count |
| --- | ---: |
| remove_niche_or_low_value | 1421 |
| review | 1168 |
| merge_into_canonical | 522 |

## Gated pool — movement pattern (top)

| Pattern | Count |
| --- | ---: |
| squat | 442 |
| horizontal_push | 178 |
| lunge | 156 |
| rotation | 154 |
| anti_rotation | 97 |
| horizontal_pull | 79 |
| hinge | 49 |
| vertical_push | 47 |
| locomotion | 37 |
| vertical_pull | 18 |
| isometric | 5 |
| carry | 5 |

## Gated pool — equipment class

| Equipment class | Count |
| --- | ---: |
| bodyweight | 522 |
| dumbbell | 126 |
| kettlebell | 93 |
| barbell | 88 |
| mixed | 39 |
| cable | 14 |
| specialty | 14 |
| band | 5 |
| cardio_machine | 4 |

## Gated pool — primary role

| Primary role | Count |
| --- | ---: |
| compound_strength | 455 |
| power_explosive | 173 |
| mobility | 87 |
| accessory_strength | 67 |
| conditioning | 53 |
| stability_core | 45 |
| unilateral_strength | 25 |

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

- `aplex_scrotch_stretch_with_without_band` — Aplex Scrotch Stretch (with &amp; without Band)
- `band_assisted_single_leg_jumps` — Band Assisted Single Leg Jumps
- `band_resisted_staggered_stance_jumps` — Band Resisted Staggered Stance Jumps
- `bb_oscillatory_low_squats` — BB Oscillatory Low Squats
- `bottoms_up_waited_walk` — Bottoms Up Waited Walk
- `bulgarian_split_squat_jumps` — Bulgarian Split Squat Jumps
- `clubbell_lunges` — Clubbell Lunges
- `contralateral_bss_and_goblet` — Contralateral BSS and Goblet
- `decel_series` — Decel Series
- `ff_alternating_double_clubbell_front_flag_press` — Alternating Double Clubbell Front Flag Press
- `ff_alternating_double_clubbell_inside_circle` — Alternating Double Clubbell Inside Circle
- `ff_alternating_double_clubbell_outside_circle` — Alternating Double Clubbell Outside Circle
- `ff_alternating_double_clubbell_shield_cast` — Alternating Double Clubbell Shield Cast
- `ff_alternating_double_clubbell_side_flag_press` — Alternating Double Clubbell Side Flag Press
- `ff_alternating_double_dumbbell_cross_body_hammer_curl` — Alternating Double Dumbbell Cross Body Hammer Curl

## Examples — excluded review

- `2_point_start` — 2 Point Start
- `2_way_shoulder_raise` — Single Leg Front to Lateral Raise
- `4_way_neck_stretch` — 4 Way Neck Stretch
- `assisted_pistol_squat` — Assisted Pistol Squat
- `band_ankle_stretch` — Band Ankle Stretch
- `band_assisted_tuck_jumps` — Band Assisted Tuck Jumps
- `band_corkscrew_row` — Band Corkscrew Row
- `band_face_pull_external_rotation` — Band Face Pull + External Rotation
- `band_facepulls` — Band Facepulls
- `band_glute_bridge_with_abduction` — Band Glute Bridge With Abduction
- `band_goodmorning` — Band Goodmorning
- `band_internal_rotation` — Band Internal Rotation
- `band_lat_pulldowns` — Band Lat Pulldowns
- `band_pancake_stretch` — Band Pancake Stretch
- `band_pistons` — Band Pistons
