# Evidence review: Rucking per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for rucking goal and sub-focuses

## 1. Research question

What gym and conditioning exercises best support rucking (loaded walking) when the user chooses Rucking as a sport?

## 2. Sources

- Load carriage literature (shared with hiking/backpacking): Progressive resistance plus aerobic plus load carriage produces largest effects; fat-free mass and strength endurance predict performance.
- Sport tag profile (DB): rucking tags include load_bearing, walking, posture, trunk, hips, durability, low_impact.
- Research-backed sport exercises (20250310100000): farmer_carry, suitcase_carry, stepup linked to sport_rucking.

## 3. Findings implemented

- Added rucking to SportSlug and SPORT_QUALITY_WEIGHTS (aerobic_base, unilateral_strength, posterior_chain_endurance, trunk_endurance, core_tension, balance, max_strength, recovery).
- Added rucking to SPORTS_WITH_SUB_FOCUSES: aerobic_base, load_carriage_durability, leg_strength, core_stability, ankle_stability.
- SUB_FOCUS_TAG_MAP for all five sub-focuses (mirroring hiking/backpacking pattern).
- Default sub-focus when none selected: load_carriage_durability, leg_strength, core_stability.
- Body bias Lower for rucking sport days in sessionIntentForSport.
- Migration 20250316100013 appends single_leg_strength, glute_strength, squat_pattern, carry, strength_endurance, zone2_cardio, aerobic_base, ankle_stability, balance, rucking to relevant starter_exercises.

## 4. Open questions

- Progressive loaded ruck prescription (duration/load) as session type.
- Differentiation from hiking_backpacking in sub-focus emphasis (e.g. more load_carriage_durability by default).
