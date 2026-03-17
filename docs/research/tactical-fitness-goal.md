# Evidence review: Tactical fitness per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for tactical_fitness goal and sub-focuses

## 1. Research question

What gym and conditioning exercises best support tactical fitness and military/LE PT test prep when the user chooses Tactical Fitness as a sport?

## 2. Sources

- Sport tag profile (DB): conditioning, calisthenics, running, rucking_optional, test_prep, work_capacity, durability, recovery_priority.
- Research-backed exercises (20250310100000): pullup, push_up, burpee, rower, farmer_carry linked to sport_tactical_fitness.
- PT test demands: run, push-ups, sit-ups (or plank), pull-ups; optional ruck. Work capacity and strength endurance under fatigue.

## 3. Implemented

- tactical_fitness in SportSlug and SPORT_QUALITY_WEIGHTS (aerobic_base, aerobic_power, work_capacity, pushing_strength, pulling_strength, posterior_chain_endurance, trunk_endurance, core_tension, recovery).
- SPORTS_WITH_SUB_FOCUSES: work_capacity, running_endurance, strength_endurance, core_stability, durability.
- SUB_FOCUS_TAG_MAP for all five. Default sub-focus: work_capacity, strength_endurance, core_stability. Body bias Full. Migration 20250316100016.

## 4. Open questions

- Test-specific blocks (e.g. push-up/sit-up prep). Ruck sub-focus when rucking_optional is selected.
