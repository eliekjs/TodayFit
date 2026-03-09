# Phase 5: Ontology-First Eligibility Rules

How strict filtering uses ontology fields when present, with legacy fallback for unannotated exercises.

## Constraint resolution

- **Where:** `logic/workoutIntelligence/constraints/resolveWorkoutConstraints.ts`
- **Input:** `WorkoutSelectionInput` (body_region_focus, injuries_or_limitations, etc.)
- **Output:** `ResolvedWorkoutConstraints` with:
  - `excluded_exercise_ids` — from INJURY_AVOID_EXERCISE_IDS
  - `excluded_joint_stress_tags` — canonical slugs from getInjuryAvoidTags
  - `excluded_contraindication_keys` — normalized injury keys (shoulder, knee, lower_back, etc.)
  - `allowed_movement_families` — when body_region_focus is set

## Ontology-first eligibility

1. **Joint stress / injury:** Prefer `joint_stress_tags` and `contraindication_tags`; fallback to legacy tags. Exclude if any tag/key matches resolved exclusions.
2. **Body-part:** Prefer `primary_movement_family` + `secondary_movement_families`; fallback to derivation. Allow if any effective family is in `allowed_movement_families`.

## Hybrid exercises (e.g. thruster)

- **Rule:** Allowed when body-part focus includes **either** primary **or** any secondary family.
- **Example:** Thruster (primary lower_body, secondary upper_push) is allowed for "upper_push" or "lower" focus; not for "upper_pull" only.
- **Implementation:** `getEffectiveMovementFamilies()` returns `[primary, ...secondary]` when ontology is set.

## Where filtering runs

- **workoutIntelligence:** `filterCandidates()` / `filterByConstraints()` in candidateFilters.ts; constraints from `resolveWorkoutConstraints()`.
- **dailyGenerator:** `filterByHardConstraints()` uses ontology on generator `Exercise` and strict body-part from `focus_body_parts`.
