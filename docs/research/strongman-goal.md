# Evidence review: Strongman per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for strongman goal and sub-focuses

## 1. Research question

What exercises best support strongman (events: carries, overhead, deadlift, stones, grip, trunk) when the user chooses Strongman as a sport?

## 2. Sources

- DB (20250301000008): strongman tags — sport, strength, power, carries, odd_object, grip, trunk, work_capacity, posterior_chain.
- Research-backed (20250310100000): strongman in SPORT_QUALITY_MAP (power 1, conditioning 2, durability_resilience 1).

## 3. Implemented

- strongman in SportSlug and SPORT_QUALITY_WEIGHTS (max_strength, power, grip_strength, posterior_chain_endurance, work_capacity, core_tension).
- SPORTS_WITH_SUB_FOCUSES: carries_load, overhead_pressing, posterior_chain_strength, grip_trunk, work_capacity.
- SUB_FOCUS_TAG_MAP for all five. Default sub-focus: carries_load, posterior_chain_strength, work_capacity. Body bias Full. Migration 20250316100023.

## 4. Open questions

- Odd-object / implement-specific progressions. Log press / axle tagging if added to starter set.
