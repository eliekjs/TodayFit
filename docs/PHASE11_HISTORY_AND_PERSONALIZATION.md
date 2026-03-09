# Phase 11: History-Aware Progression, Regression, and Personalization

## 1. History input contract

**Types:** `logic/workoutGeneration/historyTypes.ts`

- **TrainingHistoryContext** — Optional full context. All fields optional; generation works without it.
  - **recent_sessions**: `RecentSessionRecord[]` (exercise_ids, muscle_groups, modality, completed_at, completed, performance_by_exercise).
  - **recently_used_exercise_ids**: string[] (deduplicated recent exercise IDs).
  - **exposure**: `ExerciseExposure` — by_exercise, by_movement_family, by_fatigue_region, by_body_region counts.
  - **last_performed_by_exercise**: Record<exerciseId, ISO date>.
  - **recent_performance**: Optional set/rep/load/RPE per exercise.
  - **completion_signal**: recent_completion_rate, last_skipped.
  - **readiness**: overall_readiness, sore_regions, prefer_lighter.

- **GenerateWorkoutInput** now has optional **training_history?: TrainingHistoryContext**. When absent, only **recent_history** (legacy) is used.

- **buildHistoryContextFromLegacy(input)** builds a minimal context from `input.recent_history` so existing callers get basic history without a backend.

## 2. Exercise repetition and rotation logic

**Module:** `logic/workoutGeneration/historyScoring.ts`

- **scoreRecentExposurePenalty** — Penalty for exercises in recentIds; stronger when preferVariety (e.g. accessory/warmup).
- **scoreAnchorRepeatBonus** — Small bonus for repeating main_compound when exposure is 1–3 and last completion was successful.
- **scoreAccessoryRotationPenalty** — Penalty when accessory/isolation exposure exceeds threshold (default 3).
- **scoreMovementFamilyRotationBonus** — Small bonus when movement family is under-represented recently.
- **scoreJointStressSensitivityPenalty** — Soft penalty when exercise has joint stress and was used heavily recently.

All tunable via **HISTORY_WEIGHTS**. Wired into **scoreExercise** when **historyContext** is present; breakdown in **ScoringDebug** (history_*).

## 3. Progress / maintain / regress / rotate recommendation layer

**Module:** `logic/workoutGeneration/recommendationLayer.ts`

- **getRecommendation(exercise, blockType, historyContext, options)** → `{ recommendation, reason }`.
- **Recommendation**: `"progress" | "maintain" | "regress" | "rotate"`.
- Rules (rule-based, explainable):
  - **regress**: preferLighter (readiness), or anchor with lastCompletionSuccess === false.
  - **progress**: anchor in main block, recently used, exposure ≤ 2, last completion not poor.
  - **maintain**: anchor default; accessory default; last session skipped.
  - **rotate**: accessory with exposure ≥ 4 or (recently used and exposure ≥ 2).

Recommendation is attached to each **WorkoutItem** (recommendation, recommendation_reason) after session is built.

## 4. Prescription influence

**Module:** `logic/workoutGeneration/prescriptionHistory.ts`

- **applyRecommendationToPrescription(base, recommendation)** → adjusted prescription.
  - **progress**: +1 set (cap 6), +1 rep if present; cue to consider slightly more load.
  - **regress**: −1 set, −2 reps (min 6), +15 s rest; cue to prioritize form.
  - **maintain** / **rotate**: no change.

Conservative; no aggressive jumps. Applied in **attachRecommendationsToSession** when building the session.

## 5. Exercise relationship support

**Module:** `logic/workoutGeneration/exerciseRelations.ts`

- **getExerciseRelations(exercise)** → `{ progressions, regressions, alternatives? }` from exercise.progressions / regressions.
- **pickRegressionInPool(exercise, pool)** — Returns first regression present in pool (for regress path).
- **pickProgressionOrAlternativeInPool(exercise, pool)** — For rotate path; optional use when swapping.

Mappings are optional; fallback when absent.

## 6. Personalization scoring signals

- **history_recent_exposure_penalty** — In ScoringDebug when history present.
- **history_anchor_repeat_bonus**, **history_accessory_rotation_penalty**, **history_movement_family_rotation_bonus**, **history_joint_stress_sensitivity_penalty**.

Score breakdown and recommendation reason are exposed so generated output can explain why an exercise was repeated, progressed, rotated, or regressed.

## 7. No backend / no UI required

- All inputs are optional; generator runs with no history.
- App can later populate **training_history** from backend (sessions, exposure, completion, readiness).

## 8. Recommended next step for weekly planning

- Use **TrainingHistoryContext** and **exposure.by_movement_family** / **by_fatigue_region** to drive weekly balance (e.g. “lower emphasis this week if lower was heavy last week”).
- Keep daily generator as-is for session structure; add a thin weekly layer that sets **focus_body_parts** or **training_history.exposure** per day from a simple weekly template and history.
