# Evidence review: Rowing / erg per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for rowing_erg goal and sub-focuses

## 1. Research question

What gym and conditioning exercises best support rowing (erg) performance when the user chooses Rowing as a sport?

## 2. Sources

- Rowing Stronger: Five movement patterns (squat, hinge, pull, push, hip/shoulder/core); posterior chain and eccentric work; core with movement at extremities and stable spine.
- Core training for rowing: Anterior and posterior trunk; exercises with limb/hip movement and spine stability (e.g. rockbacks).
- Nordic hamstring curl for rowers: Eccentric knee flexion, hamstrings and glutes for hip stability; posterior chain and rowing performance.

## 3. Findings implemented

- rowing_erg already in SportSlug, SPORT_QUALITY_WEIGHTS, SPORTS_WITH_SUB_FOCUSES, SUB_FOCUS_TAG_MAP (aerobic_base, threshold, posterior_chain, core_bracing, grip_endurance).
- Default sub-focus when none selected: posterior_chain, core_bracing, aerobic_base in starterExerciseRepository.
- Body bias Full for rowing_erg sport days in sessionIntentForSport (leg drive plus pull plus core).
- Migration 20250316100012 appends zone2_cardio, aerobic_base, posterior_chain, hinge_pattern, core_bracing, grip_endurance, rowing_erg to relevant starter_exercises.

## 4. Open questions

- Explicit pull sub-focus or tag weighting for rowing-specific pull strength.
- Eccentric emphasis (e.g. Nordic curl) in prescription or tagging.
