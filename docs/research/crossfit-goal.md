# Evidence review: CrossFit per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for crossfit goal and sub-focuses

## 1. Research question

What exercises best support CrossFit when the user chooses CrossFit as a sport?

## 2. Sources

- DB tags: mixed_modal, work_capacity, full_body, conditioning, strength. 20250310100000: crossfit to power, conditioning, durability.
- Demands: work capacity, strength, power, gymnastics, engine.

## 3. Implemented

- crossfit already in SportSlug, SPORT_QUALITY_WEIGHTS, SPORTS_WITH_SUB_FOCUSES, SUB_FOCUS_TAG_MAP.
- Default sub-focus: work_capacity, strength, engine. Body bias Full. Migration 20250316100017.

## 4. Open questions

- Gymnastics and Olympic lift tagging.
