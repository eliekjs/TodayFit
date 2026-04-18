# Exercise duplicate clusters (phase 4)

Generated: `2026-04-18T21:51:10.504Z`

## Summary

| Metric | Value |
| --- | ---: |
| Total clusters (multi-member) | 1 |
| Input exercises | 4016 |
| Exercises in at least one cluster | 2 |
| Exercises not in any cluster | 4014 |
| High-confidence clusters | 0 |
| Medium-confidence clusters | 1 |
| Low-confidence clusters | 0 |
| Clusters with ≥2 `core` members | 0 |
| Dropped (oversized > 24) | 0 |
| Dropped (low internal pairwise) | 0 |

## Thresholds and config

```json
{
  "edge_threshold": 0.78,
  "min_internal_pair_score": 0.62,
  "max_cluster_size": 24,
  "weights": {
    "name_token_jaccard": 0.28,
    "name_char_similarity": 0.18,
    "alias_overlap": 0.1,
    "movement_patterns_jaccard": 0.14,
    "equipment_match": 0.08,
    "primary_role_match": 0.06,
    "muscle_jaccard": 0.08,
    "tag_jaccard": 0.05,
    "keep_category_alignment": 0.03
  },
  "bands": {
    "high": 0.88,
    "medium": 0.72
  }
}
```

### Factor weights (relative emphasis)

| Factor | Weight |
| --- | ---: |
| `name_token_jaccard` | 0.28 |
| `name_char_similarity` | 0.18 |
| `movement_patterns_jaccard` | 0.14 |
| `alias_overlap` | 0.1 |
| `equipment_match` | 0.08 |
| `muscle_jaccard` | 0.08 |
| `primary_role_match` | 0.06 |
| `tag_jaccard` | 0.05 |
| `keep_category_alignment` | 0.03 |

**Edge threshold:** pairwise score ≥ **0.78** to merge. **Internal minimum:** **0.62** (complete-linkage style check). **Bands:** high ≥ **0.88**, medium ≥ **0.72**.

## Largest clusters

- **dup_00000** — 2 members — canonical `2_point_start`

## Top canonical selections (by cluster size)

- **dup_00000** (medium, score 0.856): `2_point_start` ← 2 members

## Likely merge groups (high + medium confidence)

- **dup_00000** [medium]: 2_point_start, 3_point_start

## Related-but-distinct neighbors (low confidence)

_None._


## Suspicious over-clustering (skipped components)

### Oversized (exceeded max cluster size)
_None._

### Low internal pairwise score
_None._


## Member keep_category distribution (cluster memberships)

| keep_category | member slots |
| --- | ---: |
| niche | 2 |

## Anti-distinct blocked pairs (sample)

_Pairs blocked by redundancy heuristics (e.g. pulldown vs pull-up); see `blocked_pair_sample` in JSON._

- `ff_bodyweight_alternating_split_squat_jump` / `ff_bodyweight_step_up_jump` — distinct_bulgarian_split_vs_step_up
- `ff_bodyweight_alternating_step_up_jump` / `ff_bodyweight_bulgarian_split_squat_jump` — distinct_bulgarian_split_vs_step_up
- `ff_bodyweight_alternating_step_up_jump` / `ff_bodyweight_split_squat_jump` — distinct_bulgarian_split_vs_step_up
- `ff_bodyweight_bulgarian_split_squat_jump` / `ff_bodyweight_step_up_jump` — distinct_bulgarian_split_vs_step_up
- `ff_bodyweight_split_squat_jump` / `ff_bodyweight_step_up_jump` — distinct_bulgarian_split_vs_step_up
- `ff_tire_alternating_step_up_jump` / `ff_tire_bulgarian_split_squat_jump` — distinct_bulgarian_split_vs_step_up
- `ff_tire_bulgarian_split_squat_jump` / `ff_tire_step_up_jump` — distinct_bulgarian_split_vs_step_up
- `ff_dumbbell_goblet_alternating_russian_step_up` / `ff_dumbbell_goblet_bulgarian_split_squat` — distinct_bulgarian_split_vs_step_up
- `ff_dumbbell_goblet_alternating_russian_step_up` / `ff_dumbbell_goblet_foot_elevated_knee_over_toe_split_squat` — distinct_bulgarian_split_vs_step_up
- `ff_dumbbell_goblet_alternating_russian_step_up` / `ff_dumbbell_goblet_knee_over_toe_split_squat` — distinct_bulgarian_split_vs_step_up
- `ff_dumbbell_goblet_alternating_russian_step_up` / `ff_dumbbell_goblet_split_squat` — distinct_bulgarian_split_vs_step_up
- `ff_dumbbell_goblet_alternating_russian_step_up` / `ff_kettlebell_bottoms_up_horn_grip_goblet_bulgarian_split_squat` — distinct_bulgarian_split_vs_step_up
- `ff_dumbbell_goblet_alternating_step_up` / `ff_dumbbell_goblet_bulgarian_split_squat` — distinct_bulgarian_split_vs_step_up
- `ff_dumbbell_goblet_alternating_step_up` / `ff_dumbbell_goblet_foot_elevated_knee_over_toe_split_squat` — distinct_bulgarian_split_vs_step_up
- `ff_dumbbell_goblet_alternating_step_up` / `ff_dumbbell_goblet_knee_over_toe_split_squat` — distinct_bulgarian_split_vs_step_up
- `ff_dumbbell_goblet_alternating_step_up` / `ff_dumbbell_goblet_split_squat` — distinct_bulgarian_split_vs_step_up
- `ff_dumbbell_goblet_alternating_step_up` / `ff_kettlebell_bottoms_up_horn_grip_goblet_bulgarian_split_squat` — distinct_bulgarian_split_vs_step_up
- `ff_dumbbell_goblet_bulgarian_split_squat` / `ff_dumbbell_goblet_russian_step_up` — distinct_bulgarian_split_vs_step_up
- `ff_dumbbell_goblet_bulgarian_split_squat` / `ff_dumbbell_goblet_step_up` — distinct_bulgarian_split_vs_step_up
- `ff_dumbbell_goblet_foot_elevated_knee_over_toe_split_squat` / `ff_dumbbell_goblet_russian_step_up` — distinct_bulgarian_split_vs_step_up
- `ff_dumbbell_goblet_foot_elevated_knee_over_toe_split_squat` / `ff_dumbbell_goblet_step_up` — distinct_bulgarian_split_vs_step_up
- `ff_dumbbell_goblet_knee_over_toe_split_squat` / `ff_dumbbell_goblet_russian_step_up` — distinct_bulgarian_split_vs_step_up
- `ff_dumbbell_goblet_knee_over_toe_split_squat` / `ff_dumbbell_goblet_step_up` — distinct_bulgarian_split_vs_step_up
- `ff_dumbbell_goblet_russian_step_up` / `ff_dumbbell_goblet_split_squat` — distinct_bulgarian_split_vs_step_up
- `ff_dumbbell_goblet_russian_step_up` / `ff_kettlebell_bottoms_up_horn_grip_goblet_bulgarian_split_squat` — distinct_bulgarian_split_vs_step_up
- `ff_dumbbell_goblet_split_squat` / `ff_dumbbell_goblet_step_up` — distinct_bulgarian_split_vs_step_up
- `ff_dumbbell_goblet_step_up` / `ff_kettlebell_bottoms_up_horn_grip_goblet_bulgarian_split_squat` — distinct_bulgarian_split_vs_step_up
- `ff_kettlebell_bottoms_up_horn_grip_goblet_bulgarian_split_squat` / `ff_kettlebell_goblet_alternating_russian_step_up` — distinct_bulgarian_split_vs_step_up
- `ff_kettlebell_bottoms_up_horn_grip_goblet_bulgarian_split_squat` / `ff_kettlebell_goblet_alternating_step_up` — distinct_bulgarian_split_vs_step_up
- `ff_kettlebell_bottoms_up_horn_grip_goblet_bulgarian_split_squat` / `ff_kettlebell_goblet_russian_step_up` — distinct_bulgarian_split_vs_step_up

## Notes

- Clustering is **deterministic**; tune `edge_threshold`, `min_internal_pair_score`, and `max_cluster_size` via env / config JSON.
- Canonical choice uses metadata completeness, `keep_category`, LLM confidence, and ambiguity — not usage data (pluggable later).
