# Evidence review: Track sprinting per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for track_sprinting goal and sub-focuses

## 1. Research question

What exercises best support track sprinting (100–400m) when the user chooses Track Sprinting as a sport?

## 2. Sources

- DB: track_sprinting tags power, speed, sprinting, acceleration, max_velocity, plyometrics, hamstrings, ankles, tendons, high_neural.
- Research-backed (20250310100000): squat_clean, power_snatch, box_jump, jump_squat, barbell_back_squat, nordic_curl linked to sport_track_sprinting.
- Demands: acceleration, max velocity, plyometrics, leg strength, hamstring and tendon resilience.

## 3. Implemented

- track_sprinting in SportSlug and SPORT_QUALITY_WEIGHTS (power, rate_of_force_development, tendon_resilience, max_strength, unilateral_strength).
- SPORTS_WITH_SUB_FOCUSES: acceleration_power, max_velocity, plyometric_power, leg_strength, hamstring_tendon_resilience.
- SUB_FOCUS_TAG_MAP for all five. Default sub-focus: acceleration_power, plyometric_power, leg_strength. Body bias Lower. Migration 20250316100020.

## 4. Open questions

- Olympic lift tagging (power clean, snatch) for transfer. Sprint-specific conditioning blocks.
