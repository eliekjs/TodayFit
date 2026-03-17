# Evidence review: Ice climbing per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for ice_climbing goal and sub-focuses

## 1. Research question

What exercises best support ice climbing when the user chooses Ice Climbing as a sport?

## 2. Sources

- DB (20250301000008): ice_climbing tags — grip, forearms, shoulders, overhead, technique, cold_exposure, high_isometric.
- Research-backed (20250310100000): pullup, face_pull, wrist_curl, plank, oh_press linked to sport_ice_climbing.

## 3. Implemented

- ice_climbing already in SportSlug and SPORT_QUALITY_WEIGHTS. SPORTS_WITH_SUB_FOCUSES and SUB_FOCUS_TAG_MAP already defined (grip_endurance, pull_strength, shoulder_stability, core_tension, lockoff_strength).
- Default sub-focus when none selected: grip_endurance, pull_strength. Body bias Upper / Pull. Migration 20250316100021 adds tag themes; 20250316100028 appends ice_climbing sport tag for ranking.

## 4. Open questions

- Wrist curl / forearm in starter_exercises. Lockoff-specific progressions.
