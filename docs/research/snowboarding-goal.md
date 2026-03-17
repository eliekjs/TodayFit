# Evidence review: Snowboarding per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for snowboarding goal and sub-focuses

## 1. Research question

What exercises best support snowboarding when the user chooses Snowboarding as a sport?

## 2. Sources

- DB (20250301000008): snowboarding tags — eccentric_load, legs, trunk, balance, lateral_stability, knee_load, ankle_load, durability.
- Research-backed (20250310100000): goblet_squat, split_squat, lateral_lunge, single_leg_rdl, plank, side_plank linked to sport_snowboarding.

## 3. Implemented

- snowboarding added to SportSlug and SPORT_QUALITY_WEIGHTS (eccentric_strength, unilateral_strength, balance, hip_stability, core_tension, quad_hypertrophy).
- SPORTS_WITH_SUB_FOCUSES and SUB_FOCUS_TAG_MAP already defined (leg_strength, core_stability, balance, lateral_stability, knee_resilience).
- Default sub-focus when none selected: leg_strength, core_stability, balance. Body bias Lower. Migration 20250316100026 appends tags for leg, core, balance, and lateral stability.

## 4. Open questions

- Lateral lunge availability in starter_exercises. Ankle stability tagging for board control.
