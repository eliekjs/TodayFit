# Evidence review: Backcountry skiing per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for backcountry_skiing goal and sub-focuses

## 1. Research question

What exercises best support backcountry skiing / ski touring when the user chooses Backcountry Skiing as a sport?

## 2. Sources

- DB (20250301000008): backcountry_skiing tags — aerobic, uphill, eccentric_load, quads, glutes, trunk, knee_load, durability, recovery_priority.
- Training qualities seed: aerobic_base 0.9, eccentric_strength 0.8, unilateral_strength 0.8, hip_stability 0.7, trunk_endurance 0.6, quad_hypertrophy 0.5, posterior_chain_endurance 0.5.
- Research-backed (20250310100000): goblet_squat, stepup, box_step_up, incline_treadmill_walk, stair_climber linked to sport_backcountry_skiing.

## 3. Implemented

- backcountry_skiing already in SportSlug and SPORT_QUALITY_WEIGHTS. SPORTS_WITH_SUB_FOCUSES and SUB_FOCUS_TAG_MAP already defined (uphill_endurance, leg_strength, downhill_stability, core_stability, knee_resilience).
- Default sub-focus when none selected: uphill_endurance, leg_strength, core_stability. Body bias Lower. Migration 20250316100027 appends tags for zone2/uphill, leg/downhill/knee, and core.

## 4. Open questions

- Stair climber / step mill in starter_exercises. Recovery_priority and periodization for in-season vs off-season.
