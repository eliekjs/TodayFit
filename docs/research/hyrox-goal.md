# Evidence review: Hyrox per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for Hyrox goal and sub-focuses

## 1. Research question

What gym and conditioning exercises best support Hyrox race performance when the user chooses Hyrox as a sport?

## 2. Sources

- Science-based Hyrox training: Running about 60% of race time; VO2max and zone 2 run volume key; station work under fatigue.
- Practitioner guides: Strength under fatigue; horizontal force for sled; balance strength and conditioning; concurrent training effective.
- 2024 study: 4 weeks heavy lifting plus HIIT yielded about 6-7% strength and plus 7% VO2max.

## 3. Findings implemented

- Work capacity and lactate tolerance: hyrox already in SPORT_QUALITY_WEIGHTS and SUB_FOCUS_TAG_MAP.
- Default sub-focus when none selected: work_capacity, running_endurance, core_stability in starterExerciseRepository.
- Body bias Full for Hyrox sport days in sessionIntentForSport.
- Migration 20250316100011 appends work_capacity, zone2 and zone3 cardio, squat and lunge pattern, carry, grip, core_stability, hyrox to starter_exercises.

## 4. Open questions

- Sled-specific tags in starter_exercises and tag map.
- Periodization as prescription rules.
