# Evidence review: Ultra running per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for ultra_running goal and sub-focuses

## 1. Research question

What gym and conditioning exercises best support ultra running when the user chooses Ultra Running as a sport?

## 2. Sources

- Run Spirited / Umit / Run Unbound: Strength critical; muscular fatigue often limits performance; single-leg, compound, eccentric; 2 sessions/week; running economy 2-8% improvement.
- CTS: Muscular endurance for repetitive force over ultra distance; strength across rep ranges.
- Maximum Mileage: Eccentric work for downhills; injury reduction (IT band, Achilles, shins).

## 3. Implemented

- ultra_running in SportSlug and SPORT_QUALITY_WEIGHTS (aerobic_base, aerobic_power, posterior_chain_endurance, tendon_resilience, eccentric_strength, unilateral_strength, recovery).
- SPORTS_WITH_SUB_FOCUSES: aerobic_base, durability, leg_resilience, uphill_endurance, core_stability.
- SUB_FOCUS_TAG_MAP for all five. Default sub-focus: durability, leg_resilience, core_stability. Body bias Lower. Migration 20250316100015.

## 4. Open questions

- Ankle_stability sub-focus for trail ultras. Periodization (base vs race-specific).
