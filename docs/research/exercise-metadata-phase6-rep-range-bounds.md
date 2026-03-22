# Phase 6 — Prescription bounds: `rep_range_min` / `rep_range_max`

**Subsystem:** Optional numeric caps on the generator rep prescription via `getEffectiveRepRange` in `logic/workoutGeneration/dailyGenerator.ts` (intersection with goal rules from `lib/generation/prescriptionRules.ts`).

**Date:** 2025-03-21

## Sources (ranked)

| Source | Tier | Use in this phase |
|--------|------|-------------------|
| ACSM resistance-training guidelines (load × reps zones; muscular endurance vs strength) | 1–2 | **High-confidence:** lower loads, higher reps for small-muscle / endurance-biased work (e.g. calves in ~15–25 rep contexts); heavy / neural work in low rep ranges for primary strength and Olympic-style lifts. |
| NSCA *Essentials of Strength Training and Conditioning* — exercise selection, Olympic lifts, assistance work | 1–2 | **High-confidence heuristic:** Olympic derivatives programmed as low reps (technique/power); single-joint assistance commonly higher reps than main squat/bench/deadlift. |
| Schoenfeld et al. — hypertrophy effective rep range spread (e.g. ~6–20+ when effort is high) | 1–2 | **Context-dependent:** 10–20 as a soft upper band for isolation when intersecting with goal rules (e.g. hypertrophy 8–15 still wins the intersection). |
| TodayFit `lib/generation/prescriptionRules.ts` | internal | Goal-level rep ranges and accessory bands; Phase 6 only supplies exercise-level bounds where curation is missing. |

## Classification

### High-confidence (implemented as rules)

1. **Olympic-style lifts** (clean, snatch, jerk, high_pull when not a curl): **1–5** (technique/power; intersects with strength/power goal ranges).
2. **Small-muscle / endurance-biased isolation** (calf raise, forearm, wrist curl, shrug): **15–25** (ACSM muscular endurance band; intersects with hypertrophy/strength accessory ranges).
3. **Typical isolation** (leg extension/curl, fly, pushdown, lateral raise, etc.): **10–20**.

### Context-dependent heuristics

- **Main compounds** (squat, bench, deadlift, row, press as primary lifts): **no inferred rep_range** — let goal rules define prescription unless DB curates.
- **Invalid intersections** (e.g. inferred 1–3 vs hypertrophy 8–15) fall back to goal-only behavior in `getEffectiveRepRange` when `effectiveMin` is greater than `effectiveMax`.

### Speculative / not implemented

- Velocity-based or RPE-driven auto ranges.
- Per-user 1RM percentages.

## Application policy (TodayFit)

- **Adapter path:** `mergePhase6RepRangeOntologyIntoExercise` runs **after** Phase 3 (uses `exercise_role` when helpful) and **after** Phase 5.
- **Do not overwrite** when **either** `rep_range_min` or `rep_range_max` is already set (partial DB curation preserved).
- **Run only** for exercises whose modalities include **strength, hypertrophy, power, or skill**, and whose generator **modality** is not **conditioning / mobility / recovery**.
- **Implementation:** [`lib/exerciseMetadata/phase6RepRangeInference.ts`](../../lib/exerciseMetadata/phase6RepRangeInference.ts)
- **Tests:** [`lib/exerciseMetadata/phase6RepRangeInference.test.ts`](../../lib/exerciseMetadata/phase6RepRangeInference.test.ts)
