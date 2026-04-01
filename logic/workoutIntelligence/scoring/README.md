# `workoutIntelligence/scoring/`

Selection-engine and **Phase 4 pipeline** scoring — **not** the production app workout scorer.

- **Production** (Build My Workout / Sports Prep): `logic/workoutGeneration/dailyGenerator.ts` → `scoreExercise`.
- **This folder**: `scoreExercise.ts` (`pipelineScoreExercise`), `exerciseScoring.ts` (`scoreExerciseForSelection`), fatigue/guardrails/config used by `fillBlock` / `assembleSession`.

Canonical map: **`logic/workoutGeneration/SCORING_RUNTIME.md`**.
