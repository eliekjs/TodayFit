# Library reduction summary (redundancy clustering)

Generated: `2026-04-19T00:33:03.239Z`

## Product framing

TodayFit is a **sport cross-training** decision engine. The clustering objective is **library reduction**: surface redundancy so marginal variants can be removed or held back, not preserve every technically distinct exercise.

## Aggressiveness mode

- **Selected:** `aggressive`
- **Default:** `aggressive` — lower merge thresholds, broader candidate neighborhoods, movement/equipment-weighted similarity.

### How this differs from the previous conservative duplicate detector

| Aspect | Before (conservative) | Now (aggressive default) |
| --- | --- | --- |
| Edge threshold | ~0.78 | ~0.52 |
| Min internal pairwise | ~0.62 | ~0.42 |
| Bulgarian vs RFESS | Often blocked | Normalized to same family for matching |
| Step-up vs split squat | Broad blocks | Narrow: step-up **without** split squat vs split family |
| Candidate pairs | Name window + tokens | + movement×equipment buckets, role×equipment, muscle overlap |
| Output | Single “confidence” band | **exact_duplicate / near_duplicate / practical_merge_candidate** + related-but-separate |

## Thresholds (this run)

| Parameter | Value |
| --- | ---: |
| edge_threshold | 0.52 |
| min_internal_pair_score | 0.42 |
| max_cluster_size | 40 |
| tier exact_duplicate | ≥ 0.92 |
| tier near_duplicate | ≥ 0.78 |
| tier practical_merge_candidate | ≥ 0.52 |

## Expected impact (row reduction if collapsed to canonical per cluster)

| Scenario | Clusters | Rows removable (non-canonical) |
| --- | ---: | ---: |
| Exact duplicates only | 0 | 0 |
| Exact + near duplicates | 1 | 1 |
| All merge tiers (incl. practical) | 265 | 522 |

_“Rows removable”_ = sum of (member_count − 1) per cluster in that tier set; assumes one canonical per cluster. No rows were deleted in this phase.

## Exercises affected

- **In at least one merge cluster:** 787
- **In no merge cluster:** 3229

## Biggest redundancy families (movement + equipment)

| Key (movement patterns @@ equipment) | Member slots in clusters |
| --- | ---: |
| `anti_rotation,rotation@@_none_` | 258 |
| `squat@@_none_` | 228 |
| `horizontal_push@@_none_` | 129 |
| `horizontal_pull@@_none_` | 83 |
| `thoracic_mobility@@_none_` | 39 |
| `hinge@@_none_` | 22 |
| `locomotion@@_none_` | 14 |
| `squat,vertical_push@@_none_` | 8 |
| `vertical_push@@_none_` | 4 |
| `squat@@bodyweight` | 2 |

## Biggest redundancy families (primary_role + equipment)

| Key | Member slots |
| --- | ---: |
| `_none_@@_none_` | 785 |
| `accessory_strength@@bodyweight` | 2 |

## Near-misses artifact

- File: `artifacts/exercise-duplicate-near-misses.json`
- Pairs sampled: 800 (limit 800)

## How to inspect outputs

1. **Exact / near:** `clusters_exact_duplicate`, `clusters_near_duplicate` in `exercise-duplicate-clusters.json`.
2. **Broader merge candidates (noisier):** `clusters_practical_merge_candidate`.
3. **Must stay separate (programming distinction):** `related_but_keep_separate` — uses hard-distinction codes (e.g. pulldown vs pull-up).
4. **Borderline:** `exercise-duplicate-near-misses.json` — just below merge edge or blocked despite high hypothetical score.

## Mergeable trivia (intentionally downweighted)

- Alternating vs non-alternating, basic/standard, filler words (exercise, drill, variation), many grip/setup synonyms.
- Bulgarian split squat ↔ rear-foot-elevated split squat phrasing (normalized for redundancy).

## Protected distinctions (hard block — not merged)

- Pulldown vs bar pull-up/chin-up; goblet vs front squat; hip thrust vs RDL family; step-up-only vs split-squat family; pallof vs plank; horizontal vs vertical pull when patterns diverge.
