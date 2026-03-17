# Evidence review: Alpine (downhill) skiing per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for alpine_skiing goal and sub-focuses

## 1. Research question

What exercises best support downhill (alpine) skiing when the user chooses Alpine Skiing as a sport?

## 2. Sources

- DB (20250301000008): alpine_skiing tags — eccentric_load, quads, glutes, trunk, lateral_stability, knee_load, ankle_load, power_endurance, durability.
- Training qualities seed: eccentric_strength 0.85, unilateral_strength 0.75, hip_stability 0.75, quad_hypertrophy 0.6, trunk_anti_rotation 0.5, balance 0.5.
- Research-backed (20250310100000): goblet_squat, barbell_back_squat, split_squat, bulgarian_split_squat, walking_lunge, lateral_lunge, single_leg_rdl, stepup, box_step_up, plank, side_plank, pallof_hold, dead_bug, bird_dog, turkish_get_up, ski_erg, incline_treadmill_walk linked to sport_alpine_skiing.

## 3. Implemented

- alpine_skiing already in SportSlug and SPORT_QUALITY_WEIGHTS. SPORTS_WITH_SUB_FOCUSES and SUB_FOCUS_TAG_MAP already defined (leg_strength, eccentric_control, core_stability, knee_resilience, ankle_stability).
- Default sub-focus when none selected: leg_strength, eccentric_control, core_stability. Body bias Lower. Migration 20250316100025 appends tags to starter_exercises for leg/eccentric/knee, core, and ankle.

## 4. Open questions

- Lateral stability / lateral lunge tagging. Ski-erg and incline treadmill as conditioning options for pre-season.
