# Evidence review: Bodybuilding per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for bodybuilding goal and sub-focuses

## 1. Research question

What exercises best support bodybuilding and physique prep when the user chooses Bodybuilding as a sport?

## 2. Sources

- DB: bodybuilding slug, tags hypertrophy, physique, volume, isolation, mind_muscle, pump, progressive_overload, recovery_priority.
- Demands: hypertrophy focus, push/pull/legs splits, volume, accessory work, core for physique.

## 3. Implemented

- bodybuilding in SportSlug and SPORT_QUALITY_WEIGHTS (hypertrophy, pushing_strength, pulling_strength, core_tension, recovery).
- SPORTS_WITH_SUB_FOCUSES: push_hypertrophy, pull_hypertrophy, legs_hypertrophy, arms_shoulders, core_physique.
- SUB_FOCUS_TAG_MAP for all five. Default sub-focus: push_hypertrophy, pull_hypertrophy, legs_hypertrophy. Body bias Full. Migration 20250316100019.

## 4. Open questions

- Isolation vs compound tagging. Rep-range prescription for hypertrophy.
