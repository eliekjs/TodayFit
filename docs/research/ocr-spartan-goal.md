# Evidence review: Spartan / OCR per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for ocr_spartan goal and sub-focuses

## 1. Research question

What gym and conditioning exercises best support Spartan and OCR when the user chooses Spartan / OCR as a sport?

## 2. Sources

- Spartan.com: Grip (dead hangs, farmer walks, fat grip); obstacles (rig, rope, carries).
- 80/20 OCR: Anaerobic power, strength conditioning, endurance; pull-up bar, KB, DB, rope, vest.
- Breaking Muscle: Three keys are running, loaded carries, grip strength.

## 3. Implemented

- ocr_spartan in SportSlug and SPORT_QUALITY_WEIGHTS (aerobic_base, aerobic_power, work_capacity, grip_strength, posterior_chain_endurance, trunk_endurance, pulling_strength, max_strength).
- SPORTS_WITH_SUB_FOCUSES: work_capacity, running_endurance, grip_endurance, leg_strength, core_stability.
- SUB_FOCUS_TAG_MAP for all five. Default sub-focus: work_capacity, grip_endurance, core_stability. Body bias Full. Migration 20250316100014.

## 4. Open questions

- Pulling sub-focus for rope/rig. Sled tagging for OCR.
