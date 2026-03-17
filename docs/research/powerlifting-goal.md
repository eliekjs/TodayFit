# Evidence review: Powerlifting (general_strength) per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for general_strength (powerlifting) goal and sub-focuses

## 1. Research question

What exercises best support powerlifting (squat, bench, deadlift) when the user chooses General Strength / Powerlifting as a sport?

## 2. Sources

- DB: general_strength slug, name "General Strength (Powerlifting)", tags max_strength, barbell, squat, bench, deadlift, hinge, pressing, bracing, low_aerobic.
- 20250301000008 strength preferences: back_squat, trap_bar_deadlift, barbell_bench_press, chest_supported_row.
- Powerlifting demands: squat, bench press, deadlift; accessory (rows, pull-ups); core bracing.

## 3. Implemented

- general_strength in SportSlug and SPORT_QUALITY_WEIGHTS (max_strength, pushing_strength, pulling_strength, posterior_chain_endurance, core_tension, recovery).
- SPORTS_WITH_SUB_FOCUSES: squat_strength, bench_strength, deadlift_strength, accessory_strength, core_bracing.
- SUB_FOCUS_TAG_MAP for all five. Default sub-focus: squat_strength, bench_strength, deadlift_strength. Body bias Full. Migration 20250316100018.

## 4. Open questions

- Periodization (peaking, volume). Competition vs off-season.
